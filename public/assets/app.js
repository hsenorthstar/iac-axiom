/* Router + shell — async. Hydrates from the live API, then renders.
   Tier-1 read-through: re-hydrates on navigation so a change made on another
   surface (or the API) shows up on focus. */
(function () {
  "use strict";
  const A = window.IAC;
  const { h, Btn, Chip, Avatar, go, timeago, notifIcon, toast } = window.UI;
  const root = document.getElementById("app");

  function parse() {
    let hash = location.hash.replace(/^#/, "") || "/";
    const [pathRaw, qs] = hash.split("?");
    const path = pathRaw.replace(/\/+$/, "") || "/";
    const parts = path.split("/").filter(Boolean);
    const query = {};
    if (qs) qs.split("&").forEach((kv) => { const [k, v] = kv.split("="); query[decodeURIComponent(k)] = decodeURIComponent(v || ""); });
    return { path, parts, query };
  }

  const PUBLIC = new Set(["/", "/how", "/pricing", "/for-companies", "/for-advisors", "/safety-king", "/awards", "/login"]);

  /* ---- topbar ---- */
  let bellOpen = false;
  function topbar() {
    const me = A.me();
    const unread = A.unreadCount();
    const bell = h("button.btn.ghost.bell", { style: "padding:8px 10px", onclick: (e) => { e.stopPropagation(); bellOpen = !bellOpen; mount(); } }, ["🔔", unread ? h("span.dot") : null]);
    const dropdown = bellOpen ? h("div.dropdown", [
      h("div.row.between", { style: "padding:12px 14px;border-bottom:1px solid var(--line)" }, [h("b", ["Notifications"]), h("a.dim", { style: "font-size:12px;cursor:pointer", onclick: () => { A.markAllRead(); mount(); } }, ["Mark all read"])]),
      ...A.notifications().slice(0, 6).map((n) => h("div.di", { style: n.read ? "" : "background:var(--bg-elev)" }, [
        h("div.ic", [notifIcon(n.kind)]),
        h("div", [h("b", { style: "font-size:14px" }, [n.title]), h("div.dim", { style: "font-size:13px" }, [n.body]), h("div.muted", { style: "font-size:11px;margin-top:2px" }, [timeago(n.createdAt || n.at)])]),
      ])),
      h("div", { style: "padding:10px 14px" }, [h("a.dim", { href: "#/notifications", style: "font-size:13px" }, ["See all activity →"])]),
    ]) : null;

    return h("header.topbar", [
      h("button.menu-btn", { onclick: () => { document.querySelector(".app-shell").classList.toggle("nav-open"); } }, ["☰"]),
      h("div", { style: "position:relative;display:flex;align-items:center;gap:10px" }, [
        h("input.input", { placeholder: "Search…", style: "width:200px;max-width:38vw", onkeydown: (e) => { if (e.key === "Enter") go("/search?q=" + encodeURIComponent(e.target.value)); } }),
      ]),
      h("div.spacer"),
      A.getConfig().payoutsEnabled ? Chip("Payouts ON", "accent", true) : Chip("Points-first", "gold", true),
      h("div", { style: "position:relative" }, [bell, dropdown]),
      h("div.row", { style: "gap:8px;cursor:pointer", onclick: () => go("/u/" + me.handle) }, [Avatar(me, "sm"), h("div", { style: "line-height:1.1" }, [h("div", { style: "font-size:13px;font-weight:600" }, [me.name.split(" ")[0]]), h("div.muted", { style: "font-size:11px" }, [me.role])])]),
    ]);
  }

  function sidebar(active) {
    const me = A.me();
    const item = (path, ico, label, badge) => h("a.nav-item" + (active === path || (path !== "/arena" && active.startsWith(path) && path !== "/") ? ".active" : ""),
      { href: "#" + path, onclick: () => { document.querySelector(".app-shell").classList.remove("nav-open"); } },
      [h("span.ico", [ico]), h("span", [label]), badge ? h("span.badge", [badge]) : null]);
    const group = (label) => h("div.nav-group-label", [label]);
    const unread = A.unreadCount();
    return h("aside.sidebar", [
      h("a.brand", { href: "#/" }, [h("span.mark", ["IA"]), h("span", ["IAC ", h("small", ["Axiom"])])]),
      h("nav", { style: "display:flex;flex-direction:column;gap:2px;margin-top:8px" }, [
        item("/arena", "🏟️", "Arena"),
        item("/opportunities", "🎯", "Opportunities"),
        item("/projects", "📦", "My projects"),
        item("/wallet", "💎", "Wallet & XP"),
        group("Grow"),
        item("/jobs", "💼", "Jobs"),
        item("/learn", "🎓", "Learn"),
        item("/community", "💬", "Community"),
        item("/mentors", "🧭", "Mentors"),
        item("/referrals", "🎁", "Referrals"),
        group("You"),
        item("/messages", "✉️", "Messages"),
        item("/notifications", "🔔", "Activity", unread ? Chip(String(unread), "danger") : null),
        item("/impact", "📈", "Impact"),
        item("/saved", "🔖", "Saved"),
        item("/verify/kyc", "🪪", "KYC"),
        item("/membership", "⭐", "Membership"),
        A.isAdmin() ? group("Admin") : null,
        A.isAdmin() ? item("/admin/overview", "🛠️", "Deal Desk") : null,
      ]),
      h("div", { style: "margin-top:auto;padding-top:12px;border-top:1px solid var(--line)" }, [
        h("div.row", { style: "gap:8px;cursor:pointer", onclick: () => go("/u/" + me.handle) }, [Avatar(me, "sm"), h("div", { style: "min-width:0" }, [h("div", { style: "font-size:13px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis" }, [me.name]), h("div.muted", { style: "font-size:11px" }, ["Power " + me.powerScore])])]),
        h("button.btn.ghost.sm.block.mt-2", { onclick: async () => { await A.logout(); go("/"); render(); } }, ["Log out"]),
      ]),
    ]);
  }

  function appShell(active, content) {
    return h("div.app-shell", [
      h("div.scrim", { onclick: () => document.querySelector(".app-shell").classList.remove("nav-open") }),
      sidebar(active),
      h("div.main", [topbar(), h("main.content" + (active.startsWith("/admin") ? ".wide" : ""), [content])]),
    ]);
  }

  /* ---- login / signup ---- */
  function loginPage() {
    const demo = [
      { handle: "meera", label: "Meera Nair — Advisor", desc: "Lead EHS Auditor · bid, deliver, earn XP" },
      { handle: "arpan", label: "Arpan Aggarwal — Admin", desc: "Founder · full Deal Desk + payouts + COI" },
    ];
    const su = { name: "", email: "" };
    const inner = h("section.section", [h("div.inner", { style: "max-width:560px;margin:0 auto" }, [
      h("div.card.glow", [
        h("h1", { style: "font-size:26px" }, ["Welcome to IAC"]),
        h("p.dim.mt-2", ["One identity, one token — the same login works on the app and the web. Your session persists in a secure httpOnly cookie."]),
        h("h3", { style: "font-size:15px;margin-top:18px" }, ["Create an account"]),
        h("div.row.mt-2", { style: "gap:8px" }, [
          h("input.input", { placeholder: "Full name", oninput: (e) => (su.name = e.target.value) }),
          h("input.input", { placeholder: "Email", type: "email", oninput: (e) => (su.email = e.target.value) }),
        ]),
        h("div.mt-2", [Btn("Sign up free", { variant: "accent", block: true, onClick: async () => {
          if (!su.name || !su.email) return toast("Enter name + email");
          const r = await A.signup(su.name, su.email);
          if (r && r.id) { toast("Welcome to IAC!", true); go("/arena"); render(); }
          else toast(r && r.error === "email_taken" ? "Email already registered" : "Could not sign up");
        } })]),
        h("h3", { style: "font-size:15px;margin-top:20px" }, ["Or try a demo account"]),
        h("div.col.mt-2", demo.map((a) => h("div.card.pad-sm", { style: "cursor:pointer;background:var(--bg-elev)", onclick: async () => { await A.login(a.handle); go("/arena"); render(); } }, [
          h("div.row.between", [h("div", [h("b", [a.label]), h("div.dim", { style: "font-size:13px" }, [a.desc])]), h("span", ["→"])]),
        ]))),
        h("p.muted.mt-4", { style: "font-size:12px" }, ["Real backend: accounts, bids, milestones and XP persist in the server database. A bid placed here is the same row the app would read."]),
      ]),
    ])]);
    return window.PUBLIC.shell("/login", inner);
  }

  /* ---- resolve route → view (sync; data already in cache) ---- */
  function resolve() {
    const { path, parts, query } = parse();
    const P = window.PUBLIC, AP = window.APP, AD = window.ADMIN;

    if (path === "/") return { public: true, view: P.home() };
    if (path === "/how") return { public: true, view: P.how() };
    if (path === "/pricing") return { public: true, view: P.pricing() };
    if (path === "/for-companies") return { public: true, view: P.audience("co") };
    if (path === "/for-advisors") return { public: true, view: P.audience("adv") };
    if (path === "/safety-king") return { public: true, view: P.safetyKing() };
    if (path === "/awards") return { public: true, view: P.awards() };
    if (path === "/login") return { public: true, view: loginPage() };
    if (parts[0] === "u") return { public: true, view: parts[2] === "impact" ? P.impactPublic(parts[1]) : P.advisorProfile(parts[1]) };
    if (parts[0] === "c") return { public: true, view: P.companyPublic(parts[1]) };

    if (!A.getSession()) {
      if (path === "/opportunities") return { public: true, view: P.oppTeasers() };
      if (parts[0] === "opportunities" && parts[1]) return { public: true, view: P.oppTeasers() };
      return { public: true, view: loginPage(), active: "/login" };
    }

    let view, active = "/" + (parts[0] || "arena");
    switch (parts[0]) {
      case undefined: case "arena": view = AP.arena(); active = "/arena"; break;
      case "opportunities":
        if (!parts[1]) view = AP.opportunities(query);
        else if (parts[2] === "bid") view = AP.reverseBid(parts[1]);
        else if (parts[2] === "terms") view = AP.terms(parts[1]);
        else view = AP.opportunityDetail(parts[1]);
        active = "/opportunities"; break;
      case "projects": view = parts[1] ? AP.projectRoom(parts[1]) : AP.projects(); active = "/projects"; break;
      case "wallet": view = AP.wallet(parts[1]); active = "/wallet"; break;
      case "live-wallet": view = AP.wallet(); active = "/wallet"; break;
      case "jobs": view = AP.jobs(); active = "/jobs"; break;
      case "messages": view = AP.messages(parts[1]); active = "/messages"; break;
      case "community": view = AP.community(); active = "/community"; break;
      case "learn": view = AP.learn(); active = "/learn"; break;
      case "mentors": view = mentorsPage(); active = "/mentors"; break;
      case "referrals": view = AP.referrals(); active = "/referrals"; break;
      case "search": view = AP.search(query); active = "/search"; break;
      case "membership": view = AP.membership(); active = "/membership"; break;
      case "checkout": view = AP.checkout(); active = "/membership"; break;
      case "verify": view = parts[1] === "kyc" ? AP.kyc() : AP.trust(); active = "/verify/kyc"; break;
      case "trust": view = AP.trust(); active = "/trust"; break;
      case "impact": view = AP.impact(); active = "/impact"; break;
      case "saved": view = AP.saved(); active = "/saved"; break;
      case "notifications": view = notificationsPage(); active = "/notifications"; break;
      case "esos": view = esosPage(); active = "/esos"; break;
      case "admin":
        active = "/admin/overview";
        switch (parts[1]) {
          case "dealdesk": view = AD.dealDesk(query); break;
          case "payouts": view = AD.payoutsPage(); break;
          case "coi": view = AD.coiPage(); break;
          case "king": view = AD.king(); break;
          case "audit": view = AD.audit(); break;
          default: view = AD.overview();
        }
        break;
      case "u": return { public: true, view: parts[2] === "impact" ? P.impactPublic(parts[1]) : P.advisorProfile(parts[1]) };
      case "c": return { public: true, view: P.companyPublic(parts[1]) };
      case "safety-king": return { public: true, view: P.safetyKing() };
      case "awards": return { public: true, view: P.awards() };
      default: view = AP.arena(); active = "/arena";
    }
    return { public: false, view, active };
  }

  /* extra authed pages */
  function mentorsPage() {
    const mentors = A.users().filter((u) => u.role === "PROFESSIONAL");
    return h("div.fade-in", [
      window.UI.PageH("Mentorship", "Learn from top-ranked safety professionals."),
      h("div.grid.g-3", mentors.map((u) => h("div.card", [
        h("div.row", [Avatar(u, "lg"), h("div", [h("b", [u.name]), h("div.dim", { style: "font-size:13px" }, [u.title]), h("div.chip.primary.mt-2", ["Power " + u.powerScore])])]),
        h("p.dim.mt-3", { style: "font-size:14px" }, [u.bio]),
        h("div.mt-3", [Btn("Request session", { variant: "accent", size: "sm", onClick: () => toast("Mentorship request sent") })]),
      ]))),
    ]);
  }
  function notificationsPage() {
    A.markAllRead();
    return h("div.fade-in", [
      window.UI.PageH("Activity", "The unified inbox — the same events the app's Notifications screen shows."),
      h("div.col", A.notifications().map((n) => h("div.card.pad-sm", [h("div.row", [h("div.ic", { style: "width:36px;height:36px;border-radius:10px;display:grid;place-items:center;background:var(--bg-elev-2)" }, [notifIcon(n.kind)]),
        h("div", [h("b", [n.title]), h("div.dim", { style: "font-size:14px" }, [n.body]), h("div.muted", { style: "font-size:12px;margin-top:2px" }, [timeago(n.createdAt || n.at) + " · " + n.kind])])])]))),
    ]);
  }
  function esosPage() {
    return h("div.fade-in", [
      window.UI.PageH("ESOS access", "Single sign-on hand-off to the Northstar ESOS platform."),
      h("div.card", { style: "max-width:520px" }, [
        h("p.dim", ["You'll be signed into Northstar ESOS with your IAC identity — same token, no second login."]),
        h("div.mt-3", [Btn("Continue to ESOS →", { variant: "primary", onClick: () => toast("SSO hand-off initiated") })]),
      ]),
    ]);
  }

  /* ---- mount (re-render current view without re-fetch) ---- */
  function mount() {
    const r = resolve();
    root.innerHTML = "";
    if (r.public) { bellOpen = false; root.appendChild(r.view); }
    else root.appendChild(appShell(r.active, r.view));
    if (bellOpen) {
      setTimeout(() => {
        const closer = (e) => { if (!e.target.closest(".bell") && !e.target.closest(".dropdown")) { bellOpen = false; document.removeEventListener("click", closer); mount(); } };
        document.addEventListener("click", closer);
      }, 0);
    }
    try { window.scrollTo(0, 0); } catch {}
  }

  /* ---- render (async: hydrate + route preloads, then mount) ---- */
  let booted = false;
  async function render() {
    const { parts } = parse();
    // first paint hydrate, then read-through refresh on each navigation
    await A.hydrate();
    // route-specific preloads (data not in bootstrap)
    if (A.getSession()) {
      if (parts[0] === "admin" && parts[1] === "dealdesk") {
        const pid = parse().query.p || (A.projects()[0] && A.projects()[0].id);
        if (pid) await A.loadAdminDeal(pid);
      } else if (parts[0] === "admin" && !parts[1]) {
        const pid = A.projects()[0] && A.projects()[0].id; if (pid) await A.loadAdminDeal(pid);
      }
      if (parts[0] === "opportunities" && parts[1]) await A.loadMyBid(parts[1]);
    }
    booted = true;
    mount();
  }

  window.addEventListener("hashchange", render);
  render();
})();
