/* IAC API — Express. The single backend. The web client (and a future mobile
   app) are thin clients over THESE endpoints. Invariants enforced here:
     • clientBudget is stripped from every client-facing project shape.
     • Bids below the fair-rate floor are rejected server-side.
     • Milestone approval is one transaction: ledger CREDIT (− TDS) + XP.
     • Points-first gating is a single server flag both clients obey. */
import express from "express";
import cookieParser from "cookie-parser";
import jwt from "jsonwebtoken";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { db, uid } from "./db.js";
import { seed } from "./seed.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const JWT_SECRET = process.env.JWT_SECRET || "iac_dev_secret_change_me";
const TDS_RATE = 0.1;
const PORT = process.env.PORT || 3000;

seed(); // ensure schema + data

const app = express();
app.use(express.json());
app.use(cookieParser());

/* ---------------- helpers ---------------- */
const J = (s, d = null) => { try { return JSON.parse(s); } catch { return d; } };
const cfg = () => {
  const rows = db.prepare("SELECT key,value FROM config").all();
  const o = {};
  rows.forEach((r) => (o[r.key] = r.value));
  return {
    payoutsEnabled: o.payoutsEnabled === "true",
    pointsOnlyMode: o.pointsOnlyMode === "true",
    razorpayKeyId: o.razorpayKeyId || "rzp_test_IAC_demo",
    currency: o.currency || "INR",
  };
};

// node:sqlite has no .transaction() helper — wrap manually so the multi-write
// approve/bid/admin flows are atomic (BEGIN…COMMIT, ROLLBACK on error).
function txn(fn) {
  db.exec("BEGIN");
  try { const r = fn(); db.exec("COMMIT"); return r; }
  catch (e) { try { db.exec("ROLLBACK"); } catch {} throw e; }
}

function sign(user) { return jwt.sign({ sub: user.id, roles: [user.role] }, JWT_SECRET, { expiresIn: "30d" }); }
function authOptional(req, _res, next) {
  const t = req.cookies?.iac_token || (req.headers.authorization || "").replace(/^Bearer /, "");
  if (t) { try { req.user = jwt.verify(t, JWT_SECRET); } catch { /* ignore */ } }
  next();
}
function requireAuth(req, res, next) { if (!req.user) return res.status(401).json({ error: "unauthorized" }); next(); }
function requireAdmin(req, res, next) { if (!req.user || !req.user.roles.includes("ADMIN")) return res.status(403).json({ error: "forbidden" }); next(); }
app.use(authOptional);

/* ---------------- server-safe shapers ---------------- */
function publicUser(u) {
  if (!u) return null;
  return {
    id: u.id, handle: u.handle, name: u.name, role: u.role, title: u.title, region: u.region,
    verified: !!u.verified, powerScore: u.powerScore, xp: u.xp, level: u.level, avatar: u.avatar, bio: u.bio,
    badges: J(u.badges, []), skills: J(u.skills, []), certs: J(u.certs, []), reviews: J(u.reviews, []),
  };
}
// toPublicProject — strips clientBudget. The confidential figure NEVER leaves here.
function publicProject(p) {
  if (!p) return null;
  const { clientBudget, ...rest } = p; // eslint-disable-line no-unused-vars
  return { ...rest, remote: !!p.remote, scope: J(p.scope, []), skills: J(p.skills, []) };
}
function company(c) { return c ? { ...c, verified: !!c.verified } : null; }

const getUser = (id) => db.prepare("SELECT * FROM users WHERE id=?").get(id);
const getProjectRaw = (id) => db.prepare("SELECT * FROM projects WHERE id=?").get(id);

/* ============================================================ AUTH */
app.post("/api/auth/login", (req, res) => {
  const { handle, email } = req.body || {};
  let u;
  if (email) u = db.prepare("SELECT * FROM users WHERE email=?").get(email);
  if (!u && handle) u = db.prepare("SELECT * FROM users WHERE handle=?").get(handle);
  if (!u) return res.status(401).json({ error: "no_such_account" });
  const token = sign(u);
  res.cookie("iac_token", token, { httpOnly: true, sameSite: "lax", maxAge: 30 * 86400000 });
  res.json({ user: publicUser(u), token });
});
app.post("/api/auth/signup", (req, res) => {
  const { name, email, handle } = req.body || {};
  if (!name || !email) return res.status(400).json({ error: "name_email_required" });
  if (db.prepare("SELECT 1 FROM users WHERE email=?").get(email)) return res.status(409).json({ error: "email_taken" });
  const h = (handle || name.toLowerCase().replace(/[^a-z0-9]+/g, "").slice(0, 16) || "user") + Math.floor(Math.random() * 90 + 10);
  const id = uid("u");
  db.prepare(`INSERT INTO users (id,handle,name,email,role,title,region,verified,powerScore,xp,level,avatar,bio,badges,skills,certs,reviews)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`)
    .run(id, h, name, email, "PROFESSIONAL", "Safety Professional", "IN", 0, 50, 100, 1, name.slice(0, 2).toUpperCase(), "New on IAC.", "[]", "[]", "[]", "[]");
  db.prepare("INSERT INTO referrals (userId,code,invited,joined,earnedXp) VALUES (?,?,0,0,0)").run(id, h.toUpperCase() + "-IAC");
  db.prepare("INSERT INTO recognition_ledger (id,userId,type,points,reason) VALUES (?,?,?,?,?)").run(uid("r"), id, "CREDIT", 100, "JOINED");
  const u = getUser(id);
  res.cookie("iac_token", sign(u), { httpOnly: true, sameSite: "lax", maxAge: 30 * 86400000 });
  res.json({ user: publicUser(u) });
});
app.post("/api/auth/logout", (req, res) => { res.clearCookie("iac_token"); res.json({ ok: true }); });
app.get("/api/auth/me", (req, res) => res.json({ user: req.user ? publicUser(getUser(req.user.sub)) : null }));

/* ============================================================ BOOTSTRAP (one hydrate call) */
app.get("/api/bootstrap", (req, res) => {
  const me = req.user ? publicUser(getUser(req.user.sub)) : null;
  res.json({
    config: cfg(),
    me,
    users: db.prepare("SELECT * FROM users").all().map(publicUser),
    companies: db.prepare("SELECT * FROM companies ORDER BY safetyKingRank").all().map(company),
    projects: db.prepare("SELECT * FROM projects ORDER BY createdAt DESC").all().map(publicProject),
    jobs: db.prepare("SELECT * FROM jobs ORDER BY postedAt DESC").all().map((j) => ({ ...j, skills: J(j.skills, []) })),
    courses: db.prepare("SELECT * FROM courses").all().map((c) => ({ ...c, cert: !!c.cert })),
    posts: db.prepare("SELECT * FROM posts ORDER BY createdAt DESC").all().map((p) => ({ ...p })),
    awards: db.prepare("SELECT * FROM awards ORDER BY year DESC").all(),
    unread: me ? db.prepare("SELECT COUNT(*) c FROM notifications WHERE userId=? AND readAt IS NULL").get(me.id).c : 0,
  });
});

/* ============================================================ PROJECTS */
app.get("/api/projects", (req, res) => {
  let rows = db.prepare("SELECT * FROM projects ORDER BY createdAt DESC").all();
  res.json({ projects: rows.map(publicProject) });
});
app.get("/api/projects/:id", (req, res) => {
  const p = getProjectRaw(req.params.id);
  if (!p) return res.status(404).json({ error: "not_found" });
  res.json({ project: publicProject(p) }); // clientBudget stripped even for logged-out SEO view
});

/* ============================================================ BIDS */
app.get("/api/me/bid/:projectId", requireAuth, (req, res) => {
  const b = db.prepare("SELECT * FROM bids WHERE projectId=? AND professionalId=?").get(req.params.projectId, req.user.sub);
  res.json({ bid: b || null });
});
app.put("/api/bids/draft", requireAuth, (req, res) => {
  const { projectId, amount, note } = req.body || {};
  if (!getProjectRaw(projectId)) return res.status(404).json({ error: "no_project" });
  const existing = db.prepare("SELECT * FROM bids WHERE projectId=? AND professionalId=?").get(projectId, req.user.sub);
  if (existing) db.prepare("UPDATE bids SET amount=?,note=?,status='DRAFT' WHERE id=?").run(amount, note || "", existing.id);
  else db.prepare("INSERT INTO bids (id,projectId,professionalId,amount,note,status) VALUES (?,?,?,?,?, 'DRAFT')").run(uid("b"), projectId, req.user.sub, amount, note || "");
  res.json({ ok: true });
});
app.post("/api/bids", requireAuth, (req, res) => {
  const { projectId, amount, note } = req.body || {};
  const p = getProjectRaw(projectId);
  if (!p) return res.status(404).json({ error: "no_project" });
  if (amount < p.fairRateFloor) return res.status(422).json({ ok: false, error: "below_fair_rate_floor", floor: p.fairRateFloor });
  const existing = db.prepare("SELECT * FROM bids WHERE projectId=? AND professionalId=?").get(projectId, req.user.sub);
  txn(() => {
    if (existing) db.prepare("UPDATE bids SET amount=?,note=?,status='SUBMITTED' WHERE id=?").run(amount, note || "", existing.id);
    else db.prepare("INSERT INTO bids (id,projectId,professionalId,amount,note,status) VALUES (?,?,?,?,?, 'SUBMITTED')").run(uid("b"), projectId, req.user.sub, amount, note || "");
    db.prepare("UPDATE projects SET bids=bids+1 WHERE id=?").run(projectId);
    if (amount < p.bestValue) db.prepare("UPDATE projects SET bestValue=? WHERE id=?").run(amount, projectId);
    db.prepare("INSERT INTO recognition_ledger (id,userId,type,points,reason,reference) VALUES (?,?,?,?,?,?)").run(uid("r"), req.user.sub, "CREDIT", 50, "BID_PLACED", projectId);
    db.prepare("UPDATE users SET xp=xp+50 WHERE id=?").run(req.user.sub);
    db.prepare("INSERT INTO notifications (id,userId,kind,title,body) VALUES (?,?,?,?,?)").run(uid("n"), req.user.sub, "bid.placed", "Bid submitted", p.title + " · ₹" + amount.toLocaleString("en-IN"));
  });
  res.json({ ok: true, bestValue: Math.min(amount, p.bestValue) });
});

/* ============================================================ ENGAGEMENTS / DELIVERY */
function shapeEngagement(e) {
  const milestones = db.prepare("SELECT * FROM milestones WHERE engagementId=?").all(e.id);
  const deliverables = db.prepare("SELECT * FROM deliverables WHERE engagementId=?").all(e.id);
  return { ...e, milestones, deliverables };
}
app.get("/api/engagements", requireAuth, (req, res) => {
  const rows = db.prepare("SELECT * FROM engagements WHERE professionalId=? ORDER BY startedAt DESC").all(req.user.sub);
  res.json({ engagements: rows.map(shapeEngagement) });
});
app.get("/api/engagements/:id", requireAuth, (req, res) => {
  const e = db.prepare("SELECT * FROM engagements WHERE id=?").get(req.params.id);
  if (!e) return res.status(404).json({ error: "not_found" });
  const p = getProjectRaw(e.projectId);
  const isAdmin = req.user.roles.includes("ADMIN");
  const isOwner = e.professionalId === req.user.sub || (p && p.clientId === req.user.sub);
  if (!isAdmin && !isOwner) return res.status(403).json({ error: "forbidden" });
  res.json({ engagement: shapeEngagement(e) });
});
// Approve milestone → release funds. CLIENT/ADMIN only. One tx.
app.post("/api/engagements/:id/milestones/:mid/approve", requireAuth, (req, res) => {
  const e = db.prepare("SELECT * FROM engagements WHERE id=?").get(req.params.id);
  if (!e) return res.status(404).json({ error: "not_found" });
  const ms = db.prepare("SELECT * FROM milestones WHERE id=? AND engagementId=?").get(req.params.mid, e.id);
  if (!ms) return res.status(404).json({ error: "no_milestone" });
  const p = getProjectRaw(e.projectId);
  const isAdmin = req.user.roles.includes("ADMIN");
  const isClient = p && p.clientId === req.user.sub;
  if (!isAdmin && !isClient) return res.status(403).json({ error: "only client or admin can approve" });
  if (ms.status === "APPROVED") return res.json({ ok: true, idempotent: true });
  const tds = Math.round(ms.amount * TDS_RATE);
  txn(() => {
    db.prepare("UPDATE milestones SET status='APPROVED', approvedAt=datetime('now') WHERE id=?").run(ms.id);
    db.prepare("INSERT INTO earnings_ledger (id,userId,type,amount,currency,tdsWithheld,reference,description) VALUES (?,?,?,?,?,?,?,?)")
      .run(uid("el"), e.professionalId, "CREDIT", ms.amount, ms.currency, tds, ms.id, "Milestone approved: " + ms.title);
    db.prepare("INSERT INTO recognition_ledger (id,userId,type,points,reason,reference) VALUES (?,?,?,?,?,?)").run(uid("r"), e.professionalId, "CREDIT", 250, "MILESTONE_APPROVED", ms.id);
    db.prepare("UPDATE users SET xp=xp+250 WHERE id=?").run(e.professionalId);
    db.prepare("INSERT INTO notifications (id,userId,kind,title,body) VALUES (?,?,?,?,?)").run(uid("n"), e.professionalId, "milestone.approved", "Milestone approved — ₹" + ms.amount.toLocaleString("en-IN"), ms.title + " cleared (net of TDS).");
  });
  res.json({ ok: true, released: { amount: ms.amount, tdsWithheld: tds, net: ms.amount - tds, currency: ms.currency } });
});

/* ============================================================ WALLET */
app.get("/api/wallet", requireAuth, (req, res) => {
  const uidv = req.user.sub;
  const u = getUser(uidv);
  const earnings = db.prepare("SELECT * FROM earnings_ledger WHERE userId=? ORDER BY createdAt DESC").all(uidv);
  const recognition = db.prepare("SELECT * FROM recognition_ledger WHERE userId=? ORDER BY createdAt DESC").all(uidv);
  const totalGross = earnings.reduce((s, e) => s + e.amount, 0);
  const totalTds = earnings.reduce((s, e) => s + e.tdsWithheld, 0);
  res.json({
    wallet: {
      userId: uidv, xp: u.xp, level: u.level, nextLevelXp: Math.ceil((u.xp + 2000) / 1000) * 1000,
      recognition, earnings, totalGross, totalTds, net: totalGross - totalTds,
      payoutsEnabled: cfg().payoutsEnabled,
    },
  });
});

/* ============================================================ THREADS / MESSAGES */
app.get("/api/threads", requireAuth, (req, res) => {
  const rows = db.prepare("SELECT * FROM threads WHERE userId=? ORDER BY updatedAt DESC").all(req.user.sub);
  const out = rows.map((t) => {
    const msgs = db.prepare("SELECT * FROM messages WHERE threadId=? ORDER BY createdAt").all(t.id);
    return { ...t, company: company(db.prepare("SELECT * FROM companies WHERE id=?").get(t.withCompanyId)), messages: msgs, last: msgs.length ? msgs[msgs.length - 1].text : "" };
  });
  res.json({ threads: out });
});
app.post("/api/threads/:id/messages", requireAuth, (req, res) => {
  const t = db.prepare("SELECT * FROM threads WHERE id=? AND userId=?").get(req.params.id, req.user.sub);
  if (!t) return res.status(404).json({ error: "no_thread" });
  db.prepare("INSERT INTO messages (id,threadId,sender,text) VALUES (?,?,?,?)").run(uid("ms"), t.id, "me", (req.body?.text || "").slice(0, 2000));
  db.prepare("UPDATE threads SET updatedAt=datetime('now') WHERE id=?").run(t.id);
  res.json({ ok: true });
});

/* ============================================================ NOTIFICATIONS */
app.get("/api/notifications", requireAuth, (req, res) => {
  res.json({ notifications: db.prepare("SELECT * FROM notifications WHERE userId=? ORDER BY createdAt DESC").all(req.user.sub).map((n) => ({ ...n, read: !!n.readAt })) });
});
app.post("/api/notifications/read", requireAuth, (req, res) => {
  db.prepare("UPDATE notifications SET readAt=datetime('now') WHERE userId=? AND readAt IS NULL").run(req.user.sub);
  res.json({ ok: true });
});

/* ============================================================ REFERRALS / COURSES */
app.get("/api/referrals", requireAuth, (req, res) => {
  let r = db.prepare("SELECT * FROM referrals WHERE userId=?").get(req.user.sub);
  if (!r) r = { code: "IAC", invited: 0, joined: 0, earnedXp: 0 };
  res.json({ referrals: r });
});
app.get("/api/me/enrollments", requireAuth, (req, res) => {
  res.json({ enrollments: db.prepare("SELECT * FROM enrollments WHERE userId=?").all(req.user.sub) });
});

/* ============================================================ ADMIN (web-first deep work) */
app.get("/api/admin/coi", requireAuth, requireAdmin, (req, res) => {
  const rows = db.prepare("SELECT * FROM coi_records ORDER BY (resolvedAt IS NOT NULL), createdAt DESC").all();
  res.json({ records: rows.map((c) => ({ ...c, professional: publicUser(getUser(c.professionalId)), referrer: publicUser(getUser(c.referrerId)) })) });
});
app.post("/api/admin/coi/:id/resolve", requireAuth, requireAdmin, (req, res) => {
  const c = db.prepare("SELECT * FROM coi_records WHERE id=?").get(req.params.id);
  if (!c) return res.status(404).json({ error: "not_found" });
  txn(() => {
    db.prepare("UPDATE coi_records SET resolvedAt=datetime('now') WHERE id=?").run(c.id);
    db.prepare("INSERT INTO admin_actions (id,adminId,action,targetType,targetId,metadata) VALUES (?,?,?,?,?,?)").run(uid("au"), req.user.sub, "COI_RESOLVED", "COIRecord", c.id, JSON.stringify({ engagementId: c.engagementId }));
  });
  res.json({ ok: true });
});
app.get("/api/admin/payouts", requireAuth, requireAdmin, (req, res) => {
  res.json({ payouts: db.prepare("SELECT * FROM payouts ORDER BY createdAt DESC").all().map((p) => ({ ...p, user: publicUser(getUser(p.userId)) })) });
});
app.post("/api/admin/payouts/:id/:op", requireAuth, requireAdmin, (req, res) => {
  const status = req.params.op === "hold" ? "ON_HOLD" : req.params.op === "release" ? "RELEASED" : null;
  if (!status) return res.status(400).json({ error: "bad_op" });
  const p = db.prepare("SELECT * FROM payouts WHERE id=?").get(req.params.id);
  if (!p) return res.status(404).json({ error: "not_found" });
  txn(() => {
    db.prepare("UPDATE payouts SET status=? WHERE id=?").run(status, p.id);
    db.prepare("INSERT INTO admin_actions (id,adminId,action,targetType,targetId,metadata) VALUES (?,?,?,?,?,?)").run(uid("au"), req.user.sub, "PAYOUT_" + req.params.op.toUpperCase(), "Payout", p.id, "{}");
  });
  res.json({ ok: true, status });
});
app.get("/api/admin/audit", requireAuth, requireAdmin, (req, res) => {
  res.json({ actions: db.prepare("SELECT * FROM admin_actions ORDER BY createdAt DESC LIMIT 200").all() });
});
// Deal Desk: admin-only — bids WITH amounts + the confidential budget + margin.
// This is the ONLY endpoint that returns clientBudget, and it is admin-gated.
app.get("/api/admin/projects/:id/bids", requireAuth, requireAdmin, (req, res) => {
  const p = getProjectRaw(req.params.id);
  if (!p) return res.status(404).json({ error: "not_found" });
  let bids = db.prepare("SELECT * FROM bids WHERE projectId=? AND status='SUBMITTED'").all(p.id);
  if (bids.length === 0) {
    // demo comparable set
    bids = [
      { professionalId: "u_meera", amount: 208000, deliveryDays: 18, score: 94 },
      { professionalId: "u_dev", amount: 199000, deliveryDays: 22, score: 88 },
      { professionalId: "u_sara", amount: 215000, deliveryDays: 16, score: 79 },
    ];
  }
  res.json({
    project: { id: p.id, title: p.title, fairRateFloor: p.fairRateFloor, bestValue: p.bestValue, clientBudget: p.clientBudget },
    bids: bids.map((b) => ({ ...b, margin: p.clientBudget - b.amount, professional: publicUser(getUser(b.professionalId)) })),
  });
});

/* ============================================================ STATIC + SPA */
app.use(express.static(path.join(__dirname, "..", "public")));
app.get(/^(?!\/api).*/, (_req, res) => res.sendFile(path.join(__dirname, "..", "public", "index.html")));

app.listen(PORT, () => console.log(`IAC API + web on http://localhost:${PORT}`));
