/* =====================================================================
   @iac/api-client — the REAL isomorphic client.
   Talks to the live IAC API over HTTP (same-origin, httpOnly cookie auth).
   A synchronous in-memory cache (hydrated from /api/bootstrap and friends)
   backs the page getters so the existing view code stays declarative; every
   mutation writes through to the server and updates the cache optimistically.
   This is the one nervous system: web and app both call these same endpoints.
   ===================================================================== */
(function () {
  "use strict";

  const fmtINR = (n) => "₹" + (n || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 });
  const money = (amount, currency = "INR") => ({ amount, currency });

  async function api(path, opts = {}) {
    const res = await fetch("/api" + path, {
      method: opts.method || "GET",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: opts.body ? JSON.stringify(opts.body) : undefined,
    });
    let data = null;
    try { data = await res.json(); } catch { data = null; }
    return { ok: res.ok, status: res.status, data };
  }

  // ---- cache (the locally-held copy of server rows) ----
  const cache = {
    config: { payoutsEnabled: false, pointsOnlyMode: true, razorpayKeyId: "rzp_test_IAC_demo", currency: "INR" },
    me: null,
    users: [], companies: [], projects: [], jobs: [], courses: [], posts: [], awards: [],
    wallet: null, engagements: [], threads: [], notifications: [], referrals: null,
    enrollments: [], unread: 0,
    bidByProject: {}, adminCoi: [], adminPayouts: [], adminAudit: [], adminDeal: {},
  };

  const byId = (arr, id) => arr.find((x) => x && x.id === id);

  // ---- hydration ----
  async function bootstrap() {
    const { data } = await api("/bootstrap");
    if (!data) return;
    cache.config = data.config;
    cache.me = data.me;
    cache.users = data.users || [];
    cache.companies = data.companies || [];
    cache.projects = (data.projects || []).map((p) => ({ ...p, matched: p.urgency !== "low" }));
    cache.jobs = data.jobs || [];
    cache.courses = data.courses || [];
    cache.posts = (data.posts || []).map((p) => ({ ...p, author: byId(data.users, p.authorId) }));
    cache.awards = data.awards || [];
    cache.unread = data.unread || 0;
  }
  async function hydrateAuthed() {
    if (!cache.me) return;
    const [w, e, t, n, r, en] = await Promise.all([
      api("/wallet"), api("/engagements"), api("/threads"), api("/notifications"), api("/referrals"), api("/me/enrollments"),
    ]);
    cache.wallet = w.data?.wallet || null;
    cache.engagements = e.data?.engagements || [];
    cache.threads = (t.data?.threads || []);
    cache.notifications = n.data?.notifications || [];
    cache.referrals = r.data?.referrals || null;
    cache.enrollments = en.data?.enrollments || [];
    cache.unread = cache.notifications.filter((x) => !x.read).length;
    if (cache.me.role === "ADMIN") {
      const [coi, pay, aud] = await Promise.all([api("/admin/coi"), api("/admin/payouts"), api("/admin/audit")]);
      cache.adminCoi = coi.data?.records || [];
      cache.adminPayouts = pay.data?.payouts || [];
      cache.adminAudit = aud.data?.actions || [];
    }
  }

  const A = {
    fmtINR, money,
    // hydration entrypoints (router awaits these)
    hydrate: async () => { await bootstrap(); await hydrateAuthed(); },
    refreshBootstrap: bootstrap,
    loadAdminDeal: async (pid) => {
      const { data } = await api("/admin/projects/" + pid + "/bids");
      if (data) cache.adminDeal[pid] = data;
      return data;
    },
    loadMyBid: async (pid) => {
      const { data } = await api("/me/bid/" + pid);
      if (data) cache.bidByProject[pid] = data.bid;
      return data?.bid || null;
    },

    // config / session
    getConfig: () => ({ ...cache.config }),
    getSession: () => (cache.me ? { userId: cache.me.id, roles: [cache.me.role] } : null),
    me: () => cache.me,
    isAdmin: () => !!cache.me && cache.me.role === "ADMIN",

    // auth (async; call sites await)
    login: async (handle) => {
      const { ok, data } = await api("/auth/login", { method: "POST", body: { handle } });
      if (ok) { cache.me = data.user; await hydrateAuthed(); return data.user; }
      return null;
    },
    loginEmail: async (email) => {
      const { ok, data } = await api("/auth/login", { method: "POST", body: { email } });
      if (ok) { cache.me = data.user; await hydrateAuthed(); return data.user; }
      return null;
    },
    signup: async (name, email) => {
      const { ok, data } = await api("/auth/signup", { method: "POST", body: { name, email } });
      if (ok) { cache.me = data.user; await hydrateAuthed(); return data.user; }
      return { error: data?.error };
    },
    logout: async () => { await api("/auth/logout", { method: "POST" }); cache.me = null; cache.wallet = null; cache.engagements = []; },

    // users / companies
    users: () => cache.users,
    userByHandle: (h) => cache.users.find((u) => u.handle === h),
    user: (id) => byId(cache.users, id),
    companies: () => cache.companies,
    company: (id) => byId(cache.companies, id),

    // projects (clientBudget already stripped by server)
    projects: (opts = {}) => {
      let list = cache.projects.slice();
      if (opts.matched) list = list.filter((p) => p.urgency !== "low"); // demo "matched" heuristic
      if (opts.q) { const q = opts.q.toLowerCase(); list = list.filter((p) => (p.title + p.summary + (p.skills || []).join(" ")).toLowerCase().includes(q)); }
      return list;
    },
    project: (id) => byId(cache.projects, id),

    // bids
    myBid: (projectId) => cache.bidByProject[projectId] || null,
    saveBidDraft: (projectId, amount, note) => {
      cache.bidByProject[projectId] = { projectId, professionalId: cache.me?.id, amount, note, status: "DRAFT" };
      api("/bids/draft", { method: "PUT", body: { projectId, amount, note } }); // background write-through
      return cache.bidByProject[projectId];
    },
    submitBid: (projectId, amount, note) => {
      const p = byId(cache.projects, projectId);
      if (p && amount < p.fairRateFloor) return { ok: false, error: "below_fair_rate_floor", floor: p.fairRateFloor };
      // optimistic
      cache.bidByProject[projectId] = { projectId, professionalId: cache.me?.id, amount, note, status: "SUBMITTED" };
      if (p) { p.bids += 1; if (amount < p.bestValue) p.bestValue = amount; }
      if (cache.me) cache.me.xp += 50;
      cache.notifications.unshift({ id: "tmp" + Date.now(), kind: "bid.placed", title: "Bid submitted", body: (p ? p.title : "") + " · " + fmtINR(amount), read: false, createdAt: new Date().toISOString() });
      cache.unread++;
      api("/bids", { method: "POST", body: { projectId, amount, note } }); // write-through
      return { ok: true, bestValue: p ? p.bestValue : amount };
    },

    // engagements
    engagements: () => cache.engagements,
    engagement: (id) => byId(cache.engagements, id),
    approveMilestone: (engId, msId) => {
      const e = byId(cache.engagements, engId); if (!e) return { ok: false };
      const m = byId(e.milestones, msId); if (!m) return { ok: false };
      if (m.status === "APPROVED") return { ok: true, idempotent: true };
      const tds = Math.round(m.amount * 0.1);
      // optimistic local apply
      m.status = "APPROVED"; m.approvedAt = new Date().toISOString();
      if (cache.wallet) {
        cache.wallet.earnings.unshift({ id: "tmp" + Date.now(), type: "CREDIT", amount: m.amount, tdsWithheld: tds, description: "Milestone approved: " + m.title, createdAt: new Date().toISOString() });
        cache.wallet.recognition.unshift({ id: "tmpr" + Date.now(), points: 250, reason: "MILESTONE_APPROVED", createdAt: new Date().toISOString() });
        cache.wallet.totalGross += m.amount; cache.wallet.totalTds += tds; cache.wallet.net += (m.amount - tds); cache.wallet.xp += 250;
      }
      api("/engagements/" + engId + "/milestones/" + msId + "/approve", { method: "POST" }); // write-through
      return { ok: true, released: { amount: m.amount, tdsWithheld: tds, net: m.amount - tds, currency: m.currency } };
    },

    // wallet
    wallet: () => cache.wallet || { xp: cache.me?.xp || 0, level: cache.me?.level || 1, nextLevelXp: (cache.me?.xp || 0) + 2000, recognition: [], earnings: [], totalGross: 0, totalTds: 0, net: 0, payoutsEnabled: cache.config.payoutsEnabled },

    // jobs / courses / community
    jobs: () => cache.jobs.map((j) => ({ ...j, company: byId(cache.companies, j.companyId) })),
    courses: () => cache.courses.map((c) => { const en = cache.enrollments.find((e) => e.courseId === c.id); return { ...c, enrolledPct: en ? en.pct : 0 }; }),
    course: (id) => byId(cache.courses, id),
    community: () => cache.posts,

    // threads / messages
    threads: () => cache.threads,
    thread: (id) => byId(cache.threads, id),
    sendMessage: (threadId, text) => {
      const t = byId(cache.threads, threadId); if (!t) return;
      t.messages.push({ sender: "me", text, createdAt: new Date().toISOString() }); t.last = text; t.updatedAt = new Date().toISOString();
      api("/threads/" + threadId + "/messages", { method: "POST", body: { text } });
    },

    // notifications
    notifications: () => cache.notifications,
    unreadCount: () => cache.notifications.filter((n) => !n.read).length,
    markAllRead: () => { cache.notifications.forEach((n) => (n.read = true)); cache.unread = 0; api("/notifications/read", { method: "POST" }); },

    referrals: () => cache.referrals || { code: "IAC", invited: 0, joined: 0, earnedXp: 0 },
    awards: () => cache.awards,

    // admin (cache-backed; loaded during hydrate)
    coi: () => cache.adminCoi,
    resolveCoi: (id) => { const c = byId(cache.adminCoi, id); if (c) c.resolvedAt = new Date().toISOString(); api("/admin/coi/" + id + "/resolve", { method: "POST" }); },
    payouts: () => cache.adminPayouts,
    holdPayout: (id) => { const p = byId(cache.adminPayouts, id); if (p) p.status = "ON_HOLD"; api("/admin/payouts/" + id + "/hold", { method: "POST" }); },
    releasePayout: (id) => { const p = byId(cache.adminPayouts, id); if (p) p.status = "RELEASED"; api("/admin/payouts/" + id + "/release", { method: "POST" }); },
    audit: () => cache.adminAudit,
    // deal desk — backed by cache.adminDeal[pid] (router preloads via loadAdminDeal)
    bidsForProject: (pid) => (cache.adminDeal[pid]?.bids || []).slice().sort((a, b) => b.score - a.score),
    _projectRaw: (pid) => ({ clientBudget: cache.adminDeal[pid]?.project?.clientBudget || 0 }),
    _dealMeta: (pid) => cache.adminDeal[pid]?.project || {},
  };

  window.IAC = A;
})();
