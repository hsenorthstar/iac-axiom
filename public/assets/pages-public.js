/* Public, SEO-indexed tier — what the app structurally can't do.
   Server-safe shapes only (clientBudget never present). */
(function () {
  "use strict";
  const A = window.IAC;
  const { h, Btn, Chip, Card, Avatar, go, daysLeft } = window.UI;

  function pubHeader(active) {
    const links = [
      ["/", "Home"], ["/how", "How it works"], ["/opportunities", "Opportunities"],
      ["/safety-king", "Safety King"], ["/awards", "Awards"], ["/pricing", "Pricing"],
      ["/for-companies", "For companies"], ["/for-advisors", "For advisors"],
    ];
    return h("header.pub-header", [
      h("a.brand", { href: "#/" }, [h("span.mark", ["IA"]), h("span", ["IAC ", h("small", ["Axiom"])])]),
      h("nav.pub-nav", links.map(([p, l]) => h("a", { href: "#" + p, class: active === p ? "active" : "" }, [l]))),
      h("div", { style: "flex:1" }),
      h("div.row", [
        Btn("Log in", { variant: "ghost", size: "sm", onClick: () => go("/login") }),
        Btn("Get started", { variant: "primary", size: "sm", onClick: () => go("/login") }),
      ]),
    ]);
  }

  function pubFooter() {
    const col = (title, items) => h("div", [h("div", { style: "font-weight:700;margin-bottom:8px" }, [title]),
      ...items.map(([p, l]) => h("a", { href: "#" + p }, [l]))]);
    return h("footer.pub-footer", [
      h("div.foot-grid", [
        h("div", [
          h("a.brand", { href: "#/" }, [h("span.mark", ["IA"]), h("span", ["IAC ", h("small", ["Axiom"])])]),
          h("p.dim.mt-3", { style: "max-width:34ch" }, ["One arena. Verified safety & EHS professionals, reverse-bid work, and a public trust layer. Built by Northstar."]),
        ]),
        col("Product", [["/opportunities", "Opportunities"], ["/how", "How it works"], ["/pricing", "Pricing"], ["/awards", "Awards"]]),
        col("For", [["/for-companies", "Companies"], ["/for-advisors", "Advisors"], ["/safety-king", "Safety King"], ["/jobs", "Jobs"]]),
        col("Company", [["/", "About"], ["/trust", "Trust & verification"], ["/", "Privacy"], ["/", "Terms"]]),
      ]),
      h("div.center.dim.mt-6", { style: "font-size:13px" }, ["© 2026 IAC (Axiom) · iac.club · A Northstar product"]),
    ]);
  }

  function shell(active, inner) {
    return h("div.pub", [pubHeader(active), h("main.pub-main.fade-in", [inner]), pubFooter()]);
  }

  /* ---------------- Home ---------------- */
  function home() {
    const feat = (ic, t, d) => h("div.feature", [h("div.ic", [ic]), h("h3", { style: "font-size:17px" }, [t]), h("p.dim.mt-2", [d])]);
    const inner = h("div", [
      h("section.hero", [h("div.inner", [
        h("div.row.mb-4", [Chip("Points-first launch · live", "accent", true), Chip("India · UAE · Global", "primary")]),
        h("h1", ["The arena where safety pros win work on merit."]),
        h("p.lede", ["IAC connects companies with verified EHS, process-safety and sustainability professionals through reverse-bid opportunities, recognition XP, and a public, Google-able trust layer."]),
        h("div.row.mt-5", [
          Btn("Explore opportunities", { variant: "primary", size: "lg", onClick: () => go("/opportunities") }),
          Btn("See the Safety King board", { variant: "ghost", size: "lg", onClick: () => go("/safety-king") }),
        ]),
        h("div.stat-strip.mt-6", [
          ["2,400+", "Verified advisors"], ["₹46 Cr", "Work matched"], ["180+", "Companies"], ["0.0", "Confidential leaks"],
        ].map(([n, l]) => h("div.s", [h("div.n", [n]), h("div.dim", { style: "margin-top:4px" }, [l])]))),
      ])]),

      h("section.section", [h("div.inner", [
        h("div.center.mb-5", [h("div.eyebrow", ["One organism, two surfaces"]), h("h2", { style: "font-size:30px;margin-top:8px" }, ["The app and the website are the same data."])]),
        h("div.grid.g-3", [
          feat("🎯", "Reverse-bid, fairly floored", "Companies post scope; advisors bid below a published fair-rate floor. Best-value wins — never a race to the bottom."),
          feat("🏆", "Recognition before cash", "Earn XP, levels and badges from day one. Cash-out unlocks at month 4 — one server flag, identical on web and app."),
          feat("🔒", "Confidential by construction", "The client's budget never crosses to any client surface — not even logged-out SEO pages. Enforced in the API, re-checked in CI."),
          feat("🌐", "A real, indexable presence", "Public advisor profiles, the Safety-King leaderboard and the Awards gallery are backlinkable trust pages the app can't provide."),
          feat("📱", "Start on phone, finish on laptop", "One identity, one token. Drafts live server-side, so a half-written bid resumes pre-filled on the other surface."),
          feat("⚡", "Live without sockets", "Read-through + a notifications poll keeps both surfaces fresh at launch; SSE/push is additive, not load-bearing."),
        ]),
      ])]),

      h("section.section", [h("div.inner", [
        h("div.cta-band", [
          h("h2", { style: "font-size:30px" }, ["Build a verifiable safety reputation."]),
          h("p.lede.center", { style: "margin:12px auto 0" }, ["Free to join. Win work, earn recognition, and own a public profile that Google can find."]),
          h("div.row.mt-5", { style: "justify-content:center" }, [
            Btn("Create your profile", { variant: "accent", size: "lg", onClick: () => go("/login") }),
            Btn("For companies", { variant: "ghost", size: "lg", onClick: () => go("/for-companies") }),
          ]),
        ]),
      ])]),
    ]);
    return shell("/", inner);
  }

  /* ---------------- How it works ---------------- */
  function how() {
    const steps = [
      ["01", "Post or discover scope", "Companies publish an opportunity with scope and a fair-rate floor. Advisors browse live, indexable listings — budgets stay confidential."],
      ["02", "Reverse-bid on merit", "Verified advisors place compliant bids. The system surfaces best-value (price × delivery × power score), not just the lowest number."],
      ["03", "Deliver in the project room", "The winning bid becomes an engagement with milestones. Deliverables are submitted, reviewed and approved on either surface."],
      ["04", "Approve → recognition + ledger", "A client approves a milestone: the advisor's ledger gets the CREDIT (net of statutory TDS) and XP is awarded — in one atomic transaction."],
    ];
    const inner = h("div", [
      h("section.hero", { style: "padding-bottom:32px" }, [h("div.inner", [
        h("div.eyebrow", ["How it works"]),
        h("h1", { style: "font-size:clamp(30px,5vw,46px)" }, ["From scope to recognition in four moves."]),
      ])]),
      h("section.section", { style: "padding-top:8px" }, [h("div.inner", [
        h("div.grid.g-2", steps.map(([n, t, d]) => h("div.card", [
          h("div.row", [h("div", { style: "font-family:var(--font-display);font-size:34px;font-weight:800;color:var(--iac-accent)" }, [n])]),
          h("h3", { style: "margin-top:8px" }, [t]), h("p.dim.mt-2", [d]),
        ]))),
        h("div.banner.gold.mt-5", ["🔐", h("div", [h("b", ["Points-first guarantee. "]), "Payouts are gated by one server flag both surfaces obey. At launch you build XP, levels and a public reputation; cash-out switches on for everyone at month 4 — no app update needed."])]),
      ])]),
    ]);
    return shell("/how", inner);
  }

  /* ---------------- Pricing ---------------- */
  function pricing() {
    const plan = (name, price, sub, feats, cta, highlight) =>
      h("div.card" + (highlight ? ".glow" : ""), { style: highlight ? "border-color:var(--iac-primary)" : "" }, [
        highlight ? Chip("Most popular", "primary") : null,
        h("h3", { style: "font-size:20px;margin-top:8px" }, [name]),
        h("div", { style: "font-family:var(--font-display);font-size:34px;font-weight:800;margin-top:6px" }, [price, h("span.muted", { style: "font-size:15px;font-weight:500" }, [sub])]),
        h("ul", { style: "list-style:none;padding:0;margin:16px 0;display:flex;flex-direction:column;gap:10px" },
          feats.map((f) => h("li.dim", { style: "display:flex;gap:8px" }, [h("span", { style: "color:var(--iac-accent)" }, ["✓"]), f]))),
        Btn(cta, { variant: highlight ? "primary" : "ghost", block: true, onClick: () => go("/login") }),
      ]);
    const inner = h("div", [
      h("section.hero", { style: "padding-bottom:24px" }, [h("div.inner", [
        h("div.eyebrow", ["Pricing"]), h("h1", { style: "font-size:clamp(30px,5vw,46px)" }, ["Free to win work. Pay to scale."]),
        h("p.lede", ["IAC takes no platform fee from advisors — only statutory TDS is withheld. Memberships unlock visibility and tooling."]),
      ])]),
      h("section.section", { style: "padding-top:8px" }, [h("div.inner", [
        h("div.grid.g-3", [
          plan("Advisor", "Free", "", ["Public verified profile", "Bid on opportunities", "Recognition XP & badges", "Community + LMS access"], "Join free"),
          plan("Advisor Pro", "₹999", "/mo", ["Everything in Free", "Priority best-value ranking", "Résumé & impact card builder", "Featured on public profile"], "Go Pro", true),
          plan("Company", "Custom", "", ["Post unlimited opportunities", "Admin Deal Desk + bid compare", "Safety-King scorecard", "COI register & audit trail"], "Talk to us"),
        ]),
        h("p.center.dim.mt-5", ["No payout deductions beyond statutory TDS (Sec 194J). No hidden margin charged to advisors."]),
      ])]),
    ]);
    return shell("/pricing", inner);
  }

  /* ---------------- For companies / advisors ---------------- */
  function audience(kind) {
    const isCo = kind === "co";
    const data = isCo ? {
      eyebrow: "For companies", title: "Hire verified safety expertise — on your terms.",
      lede: "Post scope, set a fair-rate floor, and let verified advisors compete on best-value. Your budget stays confidential, always.",
      feats: [
        ["🔒", "Budget never leaks", "Your budget is IAC-confidential and never crosses to any client surface — not even logged-out SEO pages."],
        ["⚖️", "Deal Desk on the web", "Compare bids side-by-side, run COI checks, and approve milestones from a keyboard-heavy admin."],
        ["🏆", "Climb the Safety King board", "A public scorecard rewards genuine zero-harm performance — and pulls talent to you."],
        ["🧾", "Auditable by design", "Every privileged action is an immutable AdminAction. Clean trail for assurance."],
      ], cta: "Post an opportunity",
    } : {
      eyebrow: "For advisors", title: "Win work on merit. Own a public reputation.",
      lede: "Bid on live opportunities, deliver in the project room, and build XP, levels and a Google-able profile from your phone.",
      feats: [
        ["🎯", "Fair-rate floor", "Bids can't undercut a published floor — you compete on value, not desperation."],
        ["⭐", "Recognition first", "Earn XP and badges from day one; cash-out unlocks for everyone at month 4."],
        ["🌐", "A profile that ranks", "Your verified profile, certs, reviews and impact are an indexable web page."],
        ["📲", "One account, both surfaces", "Start a bid on the app, finish it on the web — drafts live server-side."],
      ], cta: "Create your profile",
    };
    const inner = h("div", [
      h("section.hero", [h("div.inner", [
        h("div.eyebrow", [data.eyebrow]), h("h1", [data.title]), h("p.lede", [data.lede]),
        h("div.row.mt-5", [Btn(data.cta, { variant: "primary", size: "lg", onClick: () => go("/login") }),
          Btn(isCo ? "See advisor profiles" : "Browse opportunities", { variant: "ghost", size: "lg", onClick: () => go(isCo ? "/u/meera" : "/opportunities") })]),
      ])]),
      h("section.section", { style: "padding-top:8px" }, [h("div.inner", [
        h("div.grid.g-2", data.feats.map(([ic, t, d]) => h("div.feature", [h("div.ic", [ic]), h("h3", { style: "font-size:17px" }, [t]), h("p.dim.mt-2", [d])]))),
      ])]),
    ]);
    return shell(isCo ? "/for-companies" : "/for-advisors", inner);
  }

  /* ---------------- Logged-out opportunities (teasers, no budget) ---------------- */
  function oppTeasers() {
    const projects = A.projects();
    const card = (p) => {
      const co = A.company(p.clientId);
      return h("div.card.opp", { onclick: () => go("/opportunities/" + p.id) }, [
        h("div.row.between", [Chip(p.category, "primary"), Chip(daysLeft(p.deadline) + "d left", p.urgency === "high" ? "danger" : "")]),
        h("div.title", [p.title]),
        h("p.dim", { style: "font-size:14px" }, [p.summary]),
        h("div.meta-row", [
          h("span", [co ? co.name : "Verified client", co && co.verified ? " ✔" : ""]),
          h("span", ["📍 ", p.location]),
          h("span", [h("b", [String(p.bids)]), " bids"]),
        ]),
        h("div.row.between.mt-2", [
          h("span.dim", { style: "font-size:13px" }, ["Fair-rate floor ", h("b", { style: "color:var(--text)" }, [A.fmtINR(p.fairRateFloor)])]),
          h("span.chip.accent", ["Budget confidential"]),
        ]),
      ]);
    };
    const inner = h("div", [
      h("section.hero", { style: "padding-bottom:24px" }, [h("div.inner", [
        h("div.eyebrow", ["Live opportunities"]),
        h("h1", { style: "font-size:clamp(28px,5vw,42px)" }, ["EHS & safety consultant opportunities — India, UAE & global"]),
        h("p.lede", ["Real, live reverse-bid opportunities. Client budgets are never shown. Log in to place a compliant bid."]),
      ])]),
      h("section.section", { style: "padding-top:8px" }, [h("div.inner", [
        h("div.grid.g-2", projects.map(card)),
        h("div.banner.info.mt-5", ["🔎", "These public listings are server-rendered for SEO and carry JSON-LD JobPosting schema. The confidential budget figure is never emitted to this page."]),
      ])]),
    ]);
    return shell("/opportunities", inner);
  }

  /* ---------------- Safety King leaderboard ---------------- */
  function safetyKing() {
    const cos = A.companies().slice().sort((a, b) => a.safetyKingRank - b.safetyKingRank);
    const row = (c) => h("div.card.pad-sm", { style: "display:flex;align-items:center;gap:16px;cursor:pointer", onclick: () => go("/c/" + c.id) }, [
      h("div.rank" + (c.safetyKingRank <= 3 ? ".r" + c.safetyKingRank : ""), [String(c.safetyKingRank)]),
      h("div", { style: "flex:1" }, [h("div", { style: "font-weight:700;font-family:var(--font-display)" }, [c.name, c.verified ? " ✔" : ""]), h("div.dim", { style: "font-size:13px" }, [c.sector + " · " + c.region])]),
      h("div.center", [h("div.muted", { style: "font-size:11px;text-transform:uppercase" }, ["LTIFR"]), h("div", { style: "font-weight:700" }, [c.ltifr.toFixed(2)])]),
      h("div.center", [h("div.muted", { style: "font-size:11px;text-transform:uppercase" }, ["Score"]), h("div", { style: "font-family:var(--font-display);font-weight:800;font-size:22px;color:var(--iac-gold)" }, [String(c.safetyScore)])]),
    ]);
    const inner = h("div", [
      h("section.hero", { style: "padding-bottom:24px" }, [h("div.inner", [
        h("div.eyebrow", ["Public leaderboard"]), h("h1", { style: "font-size:clamp(30px,5vw,46px)" }, ["🏆 The Safety King board"]),
        h("p.lede", ["Companies ranked on verified zero-harm performance. Public, backlinkable, and a magnet for top advisors. Companies want to rank — that's the acquisition loop."]),
      ])]),
      h("section.section", { style: "padding-top:8px" }, [h("div.inner", [h("div.col", cos.map(row))])]),
    ]);
    return shell("/safety-king", inner);
  }

  /* ---------------- Awards gallery ---------------- */
  function awards() {
    const aw = A.awards();
    const card = (a) => h("div.award", [
      h("div.trophy", [a.type.includes("Company") ? "🏭" : a.type.includes("Rising") ? "🌟" : "🦺"]),
      h("div.chip.gold.mt-2", [a.type]),
      h("h3", { style: "margin-top:10px;font-size:20px" }, [a.winner]),
      h("p.dim.mt-2", [a.note]), h("div.muted.mt-2", { style: "font-size:13px" }, ["IAC Safety Awards " + a.year]),
    ]);
    const inner = h("div", [
      h("section.hero", { style: "padding-bottom:24px" }, [h("div.inner", [
        h("div.eyebrow", ["Recognition"]), h("h1", { style: "font-size:clamp(30px,5vw,46px)" }, ["The IAC Safety Awards"]),
        h("p.lede", ["Individual Safety Hero, Company Safety King and Rising Star — a prestige + PR surface only the website can host."]),
      ])]),
      h("section.section", { style: "padding-top:8px" }, [h("div.inner", [h("div.grid.g-3", aw.map(card))])]),
    ]);
    return shell("/awards", inner);
  }

  /* ---------------- Public advisor profile /u/[handle] ---------------- */
  function advisorProfile(handle) {
    const u = A.userByHandle(handle);
    if (!u) return shell("", h("section.section", [h("div.inner", [h("h2", ["Advisor not found"]), h("a", { href: "#/u/meera" }, ["See a sample profile →"])])]));
    const stars = (n) => "★★★★★".slice(0, n) + "☆☆☆☆☆".slice(0, 5 - n);
    const inner = h("div", [
      h("section.section", [h("div.inner", [
        h("div.card.glow", [
          h("div.row", { style: "gap:18px;align-items:flex-start" }, [
            Avatar(u, "lg"),
            h("div", { style: "flex:1;min-width:200px" }, [
              h("div.row", [h("h1", { style: "font-size:26px" }, [u.name]), u.verified ? Chip("Verified ✔", "accent") : Chip("Pending", "")]),
              h("p.dim", { style: "margin:4px 0 0" }, [u.title + " · " + u.region]),
              h("p.dim.mt-2", { style: "max-width:60ch" }, [u.bio]),
              h("div.row.mt-3", u.badges.map((b) => Chip(b, "gold"))),
            ]),
            h("div.col", { style: "text-align:right" }, [
              h("div", { style: "font-family:var(--font-display);font-size:34px;font-weight:800;color:var(--iac-primary)" }, [String(u.powerScore)]),
              h("div.muted", { style: "font-size:12px" }, ["POWER SCORE"]),
              h("div.chip.primary.mt-2", ["Level " + u.level]),
            ]),
          ]),
        ]),
        h("div.grid.g-3.mt-4", [
          h("div.card", [h("h3", { style: "font-size:16px" }, ["Skills"]), h("div.row.mt-3", u.skills.map((s) => Chip(s, "primary")))]),
          h("div.card", [h("h3", { style: "font-size:16px" }, ["Certifications"]), h("div.col.mt-3", u.certs.map((c) => h("div.dim", ["🎓 " + c]))) ]),
          h("div.card", [h("h3", { style: "font-size:16px" }, ["Reviews"]),
            u.reviews.length ? h("div.col.mt-3", u.reviews.map((r) => h("div", [h("div", { style: "color:var(--iac-gold)" }, [stars(r.stars)]), h("div.dim", { style: "font-size:14px" }, ['"' + r.text + '"']), h("div.muted", { style: "font-size:12px" }, ["— " + r.by])]))) : h("p.dim.mt-3", ["No reviews yet."])]),
        ]),
        h("div.banner.info.mt-4", ["🌐", "This profile is server-rendered with Person + JobPosting JSON-LD and is fully indexable. It's created and maintained from the app — edit on the phone, the public web page updates."]),
        h("div.row.mt-4", [Btn("Invite to bid", { variant: "primary", onClick: () => go("/login") }), Btn("View impact card", { variant: "ghost", onClick: () => go("/u/" + handle + "/impact") })]),
      ])]),
    ]);
    return shell("", inner);
  }

  /* ---------------- Public company page /c/[id] ---------------- */
  function companyPublic(id) {
    const c = A.company(id);
    if (!c) return shell("", h("section.section", [h("div.inner", [h("h2", ["Company not found"])])]));
    const inner = h("div", [
      h("section.section", [h("div.inner", [
        h("div.card.glow", [
          h("div.row.between", [
            h("div", [h("h1", { style: "font-size:28px" }, [c.name, c.verified ? " ✔" : ""]), h("p.dim", { style: "margin-top:4px" }, [c.sector + " · " + c.region])]),
            h("div.center", [h("div", { style: "font-family:var(--font-display);font-size:40px;font-weight:800;color:var(--iac-gold)" }, [String(c.safetyScore)]), h("div.muted", { style: "font-size:12px" }, ["SAFETY SCORE"])]),
          ]),
          h("p.dim.mt-3", [c.blurb]),
          h("div.grid.g-3.mt-4", [
            window.UI.KPI("Safety King rank", "#" + c.safetyKingRank),
            window.UI.KPI("LTIFR", c.ltifr.toFixed(2), "Lost-time injury freq."),
            window.UI.KPI("Open roles", c.openRoles, "Hiring now"),
          ]),
        ]),
        h("div.row.mt-4", [Btn("View on Safety King", { variant: "ghost", onClick: () => go("/safety-king") }), Btn("See open jobs", { variant: "primary", onClick: () => go("/jobs") })]),
      ])]),
    ]);
    return shell("", inner);
  }

  function impactPublic(handle) {
    const u = A.userByHandle(handle);
    const inner = h("section.section", [h("div.inner", [
      h("div.eyebrow", ["Public impact"]), h("h1", { style: "font-size:32px" }, [(u ? u.name : "Advisor") + " · Impact"]),
      h("div.grid.g-3.mt-5", [
        window.UI.KPI("Sites made safer", "312", "across 4 sectors"),
        window.UI.KPI("NCs closed", "1,840", "audit findings"),
        window.UI.KPI("Zero-LTI programs", "9", "delivered"),
      ]),
      h("div.banner.info.mt-5", ["📤", "Shared from the app as an iac.club link — recipients without the app land here; with the app, it deep-links to the native impact screen."]),
    ])]);
    return shell("", inner);
  }

  window.PUBLIC = { home, how, pricing, audience, oppTeasers, safetyKing, awards, advisorProfile, companyPublic, impactPublic, pubHeader, pubFooter, shell };
})();
