/* Authenticated app-parity surfaces. Every page reads the shared client, so it
   is automatically two-way synced with the (notional) mobile app. */
(function () {
  "use strict";
  const A = window.IAC;
  const { h, Btn, Chip, Card, KPI, Avatar, Bar, PageH, go, toast, celebrate, timeago, daysLeft } = window.UI;

  /* ---------------- Arena (home) ---------------- */
  function arena() {
    const me = A.me();
    const w = A.wallet();
    const projects = A.projects();
    const eng = A.engagements();
    const oppCard = (p) => h("div.card.opp", { onclick: () => go("/opportunities/" + p.id) }, [
      h("div.row.between", [Chip(p.category, "primary"), p.matched ? Chip("Matched to you", "accent", true) : Chip(daysLeft(p.deadline) + "d left")]),
      h("div.title", [p.title]),
      h("div.meta-row", [h("span", ["📍 " + p.location]), h("span", [h("b", [String(p.bids)]), " bids"]), h("span", ["Floor ", h("b", [A.fmtINR(p.fairRateFloor)])])]),
    ]);
    return h("div.fade-in", [
      PageH("Live Arena", "Welcome back, " + me.name.split(" ")[0] + ". Here's what's moving.",
        Btn("Place a bid", { variant: "primary", onClick: () => go("/opportunities") })),
      h("div.grid.g-4", [
        KPI("Recognition XP", w.xp.toLocaleString("en-IN"), "Level " + w.level),
        KPI("Power Score", me.powerScore, "Top 5%"),
        KPI("Active engagements", eng.filter((e) => e.status === "IN_PROGRESS").length, "in delivery"),
        KPI("Open opportunities", projects.length, "matched + market"),
      ]),
      h("div.grid.g-2.mt-4", [
        h("div.card", [
          h("div.card-h", [h("h3", ["Matched opportunities"]), h("a.dim", { href: "#/opportunities?matched=1", style: "font-size:13px" }, ["View all →"])]),
          h("div.col", projects.filter((p) => p.matched).map(oppCard)),
        ]),
        h("div.col", [
          h("div.card", [
            h("div.card-h", [h("h3", ["XP to next level"])]),
            Bar(((w.xp - 28000) / (w.nextLevelXp - 28000)) * 100),
            h("p.dim.mt-2", { style: "font-size:13px" }, [(w.nextLevelXp - w.xp).toLocaleString("en-IN") + " XP to Level " + (w.level + 1)]),
          ]),
          h("div.card", [
            h("div.card-h", [h("h3", ["In delivery"])]),
            h("div.col", eng.map((e) => {
              const p = A.project(e.projectId);
              const done = e.milestones.filter((m) => m.status === "APPROVED").length;
              return h("div", { style: "cursor:pointer", onclick: () => go("/projects/" + e.id) }, [
                h("div.row.between", [h("b", [p ? p.title : e.projectId]), Chip(e.status.replace("_", " "), "accent")]),
                h("div.dim.mt-2", { style: "font-size:13px" }, [done + "/" + e.milestones.length + " milestones · " + A.fmtINR(e.deliveryAmount)]),
                h("div.mt-2", [Bar((done / e.milestones.length) * 100)]),
              ]);
            })),
          ]),
        ]),
      ]),
    ]);
  }

  /* ---------------- Opportunities list ---------------- */
  function opportunities(query) {
    const matched = query.matched === "1";
    let list = A.projects(matched ? { matched: true } : {});
    const card = (p) => {
      const co = A.company(p.clientId);
      return h("div.card.opp", { onclick: () => go("/opportunities/" + p.id) }, [
        h("div.row.between", [Chip(p.category, "primary"), p.urgency === "high" ? Chip(daysLeft(p.deadline) + "d left", "danger", true) : Chip(daysLeft(p.deadline) + "d left")]),
        h("div.title", [p.title]),
        h("p.dim", { style: "font-size:14px" }, [p.summary]),
        h("div.row.mt-2", p.skills.map((s) => Chip(s))),
        h("div.row.between.mt-2", [
          h("div.meta-row", [h("span", [co ? co.name : "", co && co.verified ? " ✔" : ""]), h("span", ["📍 " + p.location]), h("span", [h("b", [String(p.bids)]), " bids"])]),
          h("span.dim", { style: "font-size:13px" }, ["Floor ", h("b", { style: "color:var(--text)" }, [A.fmtINR(p.fairRateFloor)])]),
        ]),
      ]);
    };
    return h("div.fade-in", [
      PageH("Opportunities", "Reverse-bid work. Best-value wins — budgets stay confidential.",
        h("div.seg", [
          h("button" + (!matched ? ".on" : ""), { onclick: () => go("/opportunities") }, ["All"]),
          h("button" + (matched ? ".on" : ""), { onclick: () => go("/opportunities?matched=1") }, ["Matched"]),
        ])),
      h("div.grid.g-2", list.map(card)),
    ]);
  }

  /* ---------------- Opportunity detail ---------------- */
  function opportunityDetail(id) {
    const p = A.project(id);
    if (!p) return h("div", [PageH("Not found"), h("a", { href: "#/opportunities" }, ["← Opportunities"])]);
    const co = A.company(p.clientId);
    const myBid = A.myBid(id);
    return h("div.fade-in", [
      h("a.dim", { href: "#/opportunities", style: "font-size:14px" }, ["← Opportunities"]),
      h("div.row.between.mt-2", [
        h("div", [h("h1", { style: "font-size:26px" }, [p.title]), h("div.row.mt-2", [Chip(p.category, "primary"), Chip("📍 " + p.location), Chip(daysLeft(p.deadline) + " days left", p.urgency === "high" ? "danger" : "")])]),
      ]),
      h("div.grid.g-3.mt-4", { style: "grid-template-columns:2fr 1fr" }, [
        h("div.col", [
          h("div.card", [h("h3", { style: "font-size:16px" }, ["Brief"]), h("p.dim.mt-2", [p.summary]),
            h("h4", { style: "margin-top:16px;font-size:14px" }, ["Scope of work"]),
            h("ul", { style: "margin:8px 0;padding-left:18px;color:var(--text-dim);line-height:1.9" }, p.scope.map((s) => h("li", [s]))),
            h("div.row.mt-2", p.skills.map((s) => Chip(s, "primary"))),
          ]),
          h("div.card", [h("h3", { style: "font-size:16px" }, ["Terms & annexures"]),
            h("div.col.mt-3", [
              h("div.row.between", [h("span.dim", ["Engagement model"]), h("b", ["Deliver on IAC's behalf · invoice IAC"])]),
              h("div.row.between", [h("span.dim", ["Deductions"]), h("b", ["Statutory TDS only (10%)"])]),
              h("div.row.between", [h("span.dim", ["Fair-rate floor"]), h("b", [A.fmtINR(p.fairRateFloor)])]),
              h("div.row.between", [h("span.dim", ["Current best-value"]), h("b", { style: "color:var(--iac-accent)" }, [A.fmtINR(p.bestValue)])]),
            ]),
            h("a.dim.mt-3", { href: "#/opportunities/" + id + "/terms", style: "display:inline-block;font-size:13px" }, ["Read full terms & annexures →"]),
          ]),
        ]),
        h("div.col", [
          h("div.card.glow", [
            h("h3", { style: "font-size:16px" }, ["Place your bid"]),
            h("div.banner.gold.mt-3", ["⚖️", "Best-value wins. Bids below the floor are rejected server-side."]),
            myBid ? h("p.dim.mt-3", { style: "font-size:13px" }, ["Draft saved: " + A.fmtINR(myBid.amount) + " (" + myBid.status + ")"]) : null,
            h("div.mt-3", [Btn(myBid ? "Resume your bid" : "Reverse-bid now", { variant: "primary", block: true, onClick: () => go("/opportunities/" + id + "/bid") })]),
            h("p.muted.mt-2", { style: "font-size:12px" }, ["A draft started on the app resumes here pre-filled — same server row."]),
          ]),
          h("div.card", [h("h3", { style: "font-size:16px" }, ["Client"]),
            co ? h("div", { style: "cursor:pointer", onclick: () => go("/c/" + co.id) }, [
              h("div.row.mt-2", [h("b", [co.name]), co.verified ? Chip("✔", "accent") : null]),
              h("p.dim.mt-2", { style: "font-size:13px" }, [co.blurb]),
              h("div.row.mt-2", [Chip("Safety score " + co.safetyScore, "gold"), Chip("#" + co.safetyKingRank + " Safety King")]),
            ]) : null,
            h("div.chip.accent.mt-3", ["🔒 Client budget confidential"]),
          ]),
        ]),
      ]),
    ]);
  }

  function terms(id) {
    const p = A.project(id);
    if (!p) return h("div", [PageH("Not found")]);
    return h("div.fade-in", [
      h("a.dim", { href: "#/opportunities/" + id }, ["← Back to opportunity"]),
      PageH("Bid terms & annexures", p.title),
      h("div.card", [
        h("h3", { style: "font-size:16px" }, ["Annexure A — Engagement model"]),
        h("p.dim.mt-2", ["The professional delivers ON IAC's behalf and invoices IAC for the won bid amount (deliveryAmount). IAC deducts nothing except statutory TDS (Sec 194J, 10%). The client's budget is IAC-confidential and is never disclosed to the professional."]),
        h("h3", { style: "font-size:16px;margin-top:20px" }, ["Annexure B — Best-value & fair-rate floor"]),
        h("p.dim.mt-2", ["Bids below the published fair-rate floor (" + A.fmtINR(p.fairRateFloor) + ") are rejected automatically. Award is by best-value: a blend of price, delivery time and Power Score — not the lowest number."]),
        h("h3", { style: "font-size:16px;margin-top:20px" }, ["Annexure C — Milestones & release"]),
        h("p.dim.mt-2", ["Payment releases per approved milestone. On approval, the ledger is credited (gross) with TDS recorded separately, and recognition XP is awarded — atomically."]),
      ]),
      h("div.mt-4", [Btn("I've read the terms — bid now", { variant: "primary", onClick: () => go("/opportunities/" + id + "/bid") })]),
    ]);
  }

  /* ---------------- Reverse-bid ---------------- */
  function reverseBid(id) {
    const p = A.project(id);
    if (!p) return h("div", [PageH("Not found")]);
    const existing = A.myBid(id);
    const state = { amount: existing ? existing.amount : p.bestValue, note: existing ? existing.note : "" };
    const wrap = h("div.fade-in");
    function render() {
      const belowFloor = state.amount < p.fairRateFloor;
      wrap.innerHTML = "";
      wrap.appendChild(h("a.dim", { href: "#/opportunities/" + id }, ["← Back to opportunity"]));
      wrap.appendChild(PageH("Reverse-bid", p.title));
      const amtInput = h("input.input", { type: "number", value: state.amount, oninput: (e) => { state.amount = parseInt(e.target.value || "0", 10); updateHints(); } });
      const hint = h("div.mt-2");
      function updateHints() {
        hint.innerHTML = "";
        const below = state.amount < p.fairRateFloor;
        const beatsBV = state.amount <= p.bestValue;
        hint.appendChild(h("div", { style: "font-size:13px;color:" + (below ? "var(--danger)" : "var(--text-dim)") }, [
          below ? "⛔ Below fair-rate floor of " + A.fmtINR(p.fairRateFloor) + " — will be rejected." :
            (beatsBV ? "✅ Beats current best-value of " + A.fmtINR(p.bestValue) : "Above current best-value (" + A.fmtINR(p.bestValue) + "). Strengthen with delivery speed / Power Score."),
        ]));
      }
      updateHints();
      wrap.appendChild(h("div.grid.g-2", { style: "grid-template-columns:2fr 1fr" }, [
        h("div.card", [
          h("label.field", [h("span", ["Your bid amount (INR)"]), amtInput]),
          hint,
          h("label.field.mt-4", [h("span", ["Note to client (optional)"]), h("textarea.input", { rows: 4, value: state.note, oninput: (e) => { state.note = e.target.value; } }, [state.note])]),
          h("div.row.mt-4", [
            Btn("Save draft", { variant: "ghost", onClick: () => { A.saveBidDraft(id, state.amount, state.note); toast("Draft saved — resumes on app too", true); } }),
            Btn("Submit bid", { variant: "primary", onClick: () => {
              const r = A.submitBid(id, state.amount, state.note);
              if (!r.ok) { toast("⛔ Below fair-rate floor (" + A.fmtINR(r.floor) + ")"); return; }
              celebrate("Bid submitted!", A.fmtINR(state.amount) + " · +50 XP"); window.IAC && (A.wallet());
              setTimeout(() => go("/opportunities/" + id), 800);
            } }),
          ]),
        ]),
        h("div.card", [
          h("h3", { style: "font-size:15px" }, ["Bid guardrails"]),
          h("div.col.mt-3", [
            h("div.row.between", [h("span.dim", ["Fair-rate floor"]), h("b", [A.fmtINR(p.fairRateFloor)])]),
            h("div.row.between", [h("span.dim", ["Best-value now"]), h("b", { style: "color:var(--iac-accent)" }, [A.fmtINR(p.bestValue)])]),
            h("div.row.between", [h("span.dim", ["Bids placed"]), h("b", [String(p.bids)])]),
          ]),
          h("div.banner.info.mt-3", ["🔒", "Client budget is never shown. You compete on value, not their wallet."]),
        ]),
      ]));
    }
    render();
    return wrap;
  }

  /* ---------------- My projects / delivery list ---------------- */
  function projects() {
    const eng = A.engagements();
    return h("div.fade-in", [
      PageH("My projects", "Delivery rooms for your awarded engagements."),
      h("div.col", eng.map((e) => {
        const p = A.project(e.projectId);
        const done = e.milestones.filter((m) => m.status === "APPROVED").length;
        return h("div.card.opp", { onclick: () => go("/projects/" + e.id) }, [
          h("div.row.between", [h("div.title", [p ? p.title : e.projectId]), Chip(e.status.replace("_", " "), "accent")]),
          h("div.meta-row", [h("span", ["Value ", h("b", [A.fmtINR(e.deliveryAmount)])]), h("span", [done + "/" + e.milestones.length + " milestones approved"])]),
          h("div.mt-2", [Bar((done / e.milestones.length) * 100)]),
        ]);
      })),
    ]);
  }

  /* ---------------- Project room (milestone approve = deep-work) ---------------- */
  function projectRoom(id) {
    const e = A.engagement(id);
    if (!e) return h("div", [PageH("Engagement not found"), h("a", { href: "#/projects" }, ["← My projects"])]);
    const p = A.project(e.projectId);
    const isApprover = A.isAdmin(); // client or admin can approve
    const wrap = h("div.fade-in");
    function render() {
      const eng = A.engagement(id);
      const done = eng.milestones.filter((m) => m.status === "APPROVED").length;
      wrap.innerHTML = "";
      wrap.appendChild(h("a.dim", { href: "#/projects" }, ["← My projects"]));
      wrap.appendChild(PageH(p ? p.title : "Delivery room", "Engagement " + eng.id + " · " + A.fmtINR(eng.deliveryAmount)));
      wrap.appendChild(h("div.grid.g-3", [
        KPI("Status", eng.status.replace("_", " ")),
        KPI("Milestones", done + "/" + eng.milestones.length, "approved"),
        KPI("Released", A.fmtINR(eng.milestones.filter((m) => m.status === "APPROVED").reduce((s, m) => s + m.amount, 0)), "gross"),
      ]));
      wrap.appendChild(h("div.card.mt-4", [
        h("div.card-h", [h("h3", ["Milestones"]), isApprover ? Chip("You can approve (admin)", "gold") : Chip("Read-only (advisor view)", "")]),
        h("div.col", eng.milestones.map((m) => h("div.card.pad-sm", { style: "background:var(--bg-elev)" }, [
          h("div.row.between", [
            h("div", [h("b", [m.title]), h("div.dim", { style: "font-size:13px" }, [A.fmtINR(m.amount) + " · due " + new Date(m.dueAt).toLocaleDateString("en-IN")])]),
            h("div.row", [
              Chip(m.status, m.status === "APPROVED" ? "accent" : m.status === "SUBMITTED" ? "gold" : ""),
              (isApprover && m.status !== "APPROVED") ? Btn("Approve", { variant: "accent", size: "sm", onClick: () => {
                const r = A.approveMilestone(eng.id, m.id);
                if (r.ok && r.released) { celebrate("Milestone approved", "Released " + A.fmtINR(r.released.net) + " net (TDS " + A.fmtINR(r.released.tdsWithheld) + ") · +250 XP to advisor"); }
                render();
              } }) : null,
            ]),
          ]),
        ]))),
      ]));
      wrap.appendChild(h("div.card.mt-4", [
        h("h3", { style: "font-size:16px" }, ["Deliverables"]),
        h("div.col.mt-3", eng.deliverables.map((d) => h("div.row.between", [
          h("span", ["📄 " + d.title]), Chip(d.status, d.status === "APPROVED" ? "accent" : "")]))),
        h("div.banner.info.mt-3", ["📲", "Better on mobile? Use \"Continue on your phone\" to upload a site photo straight to a deliverable."]),
      ]));
    }
    render();
    return wrap;
  }

  /* ---------------- Wallet / Recognition ---------------- */
  function wallet(view) {
    const w = A.wallet();
    const me = A.me();
    const reasonLabel = (r) => ({ MILESTONE_APPROVED: "Milestone approved", BID_WON: "Bid won", PROFILE_VERIFIED: "Profile verified", REVIEW_5_STAR: "5-star review" }[r] || r);
    return h("div.fade-in", [
      PageH("Wallet & Recognition", "XP, levels and earnings — one ledger, both surfaces.",
        h("div.seg", [
          h("button" + (view !== "earnings" ? ".on" : ""), { onclick: () => go("/wallet") }, ["Recognition"]),
          h("button" + (view === "earnings" ? ".on" : ""), { onclick: () => go("/wallet/earnings") }, ["Earnings"]),
        ])),
      view === "earnings" ? earningsView(w) : recognitionView(w, me, reasonLabel),
    ]);
  }
  function recognitionView(w, me, reasonLabel) {
    return h("div", [
      h("div.grid.g-4", [
        KPI("Recognition XP", w.xp.toLocaleString("en-IN"), "Level " + w.level),
        KPI("Level", w.level, (w.nextLevelXp - w.xp).toLocaleString("en-IN") + " XP to next"),
        KPI("Power Score", me.powerScore),
        KPI("Badges", me.badges.length, me.badges.join(" · ")),
      ]),
      h("div.card.mt-4", [h("div.card-h", [h("h3", ["XP progress"])]), Bar(((w.xp - 28000) / (w.nextLevelXp - 28000)) * 100), h("p.dim.mt-2", { style: "font-size:13px" }, ["Level " + w.level + " → " + (w.level + 1)])]),
      h("div.card.mt-4", [h("h3", { style: "font-size:16px" }, ["Recognition ledger"]),
        h("div.col.mt-3", w.recognition.map((r) => h("div.row.between", [
          h("span", ["⭐ " + reasonLabel(r.reason)]), h("div.row", [h("b", { style: "color:var(--iac-accent)" }, ["+" + r.points + " XP"]), h("span.muted", { style: "font-size:12px" }, [timeago(r.createdAt || r.at)])])]))) ]),
    ]);
  }
  function earningsView(w) {
    const locked = !w.payoutsEnabled;
    return h("div", [
      locked ? h("div.banner.gold.mb-4", ["🔒", h("div", [h("b", ["Cash-out locked — points-first launch. "]), "Your earnings accrue as a ledger now; payout unlocks for everyone at month 4. One server flag (", h("code", ["payoutsEnabled:false"]), "), identical on app and web."])]) : null,
      h("div.grid.g-3", [
        KPI("Gross earned", A.fmtINR(w.totalGross), "approved milestones"),
        KPI("TDS withheld", A.fmtINR(w.totalTds), "statutory (10%)"),
        KPI("Net", A.fmtINR(w.net), locked ? "available month 4" : "available now"),
      ]),
      h("div.card.mt-4", [h("h3", { style: "font-size:16px" }, ["Earnings ledger"]),
        h("div.table-wrap.mt-3", [h("table.tbl", [
          h("thead", [h("tr", [h("th", ["Description"]), h("th", ["Gross"]), h("th", ["TDS"]), h("th", ["Net"]), h("th", ["When"])])]),
          h("tbody", w.earnings.map((e) => h("tr", [
            h("td", [e.description]), h("td.num", [A.fmtINR(e.amount)]), h("td.num", [A.fmtINR(e.tdsWithheld)]), h("td.num", [A.fmtINR(e.amount - e.tdsWithheld)]), h("td", [timeago(e.createdAt || e.at)])]))),
        ])]),
      ]),
      h("div.row.mt-4", [Btn(locked ? "Cash-out locked until month 4" : "Request payout", { variant: locked ? "ghost" : "primary", disabled: locked, onClick: () => toast("Payout request submitted") })]),
    ]);
  }

  /* ---------------- Jobs ---------------- */
  function jobs() {
    const list = A.jobs();
    return h("div.fade-in", [
      PageH("Jobs board", "Full-time and contract EHS roles. Indexed with JobPosting schema on the public web."),
      h("div.col", list.map((j) => h("div.card.opp", [
        h("div.row.between", [h("div.title", [j.title]), Chip(j.type, "primary")]),
        h("div.meta-row", [h("span", [j.company ? j.company.name : "", j.company && j.company.verified ? " ✔" : ""]), h("span", ["📍 " + j.location]), h("span", ["💰 " + j.comp]), h("span", ["posted " + timeago(j.postedAt || j.posted)])]),
        h("div.row.between.mt-2", [h("div.row", j.skills.map((s) => Chip(s))), Btn("Apply", { variant: "accent", size: "sm", onClick: () => toast("Application started") })]),
      ]))),
    ]);
  }

  /* ---------------- Messages ---------------- */
  function messages(threadId) {
    const threads = A.threads();
    const active = threadId ? A.thread(threadId) : threads[0];
    const wrap = h("div.fade-in");
    function render() {
      const cur = A.thread((active && active.id) || threads[0].id);
      wrap.innerHTML = "";
      wrap.appendChild(PageH("Messages", "Client & advisor conversations — same threads on app and web."));
      const list = h("div.thread-list" + (threadId ? ".hide-mobile" : ""), threads.map((t) => h("div.thread-item" + (cur && t.id === cur.id ? ".active" : ""), { onclick: () => go("/messages/" + t.id) }, [
        h("div.row.between", [h("b", [t.company ? t.company.name : "Client"]), h("span.muted", { style: "font-size:12px" }, [timeago(t.updatedAt || t.at)])]),
        h("div.dim", { style: "font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis" }, [t.subject]),
        h("div.muted", { style: "font-size:12px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis" }, [t.last]),
      ])));
      const input = h("input.input", { placeholder: "Type a message…", onkeydown: (e) => { if (e.key === "Enter" && e.target.value.trim()) { A.sendMessage(cur.id, e.target.value.trim()); e.target.value = ""; render(); } } });
      const pane = h("div.chat-pane", [
        h("div.row.between", { style: "padding:14px 16px;border-bottom:1px solid var(--line)" }, [
          h("div", [h("b", [cur.company ? cur.company.name : "Client"]), h("div.dim", { style: "font-size:12px" }, [cur.subject])]),
          threadId ? Btn("←", { variant: "ghost", size: "sm", onClick: () => go("/messages") }) : null,
        ]),
        h("div.chat-scroll", cur.messages.map((m) => h("div.bubble." + ((m.sender||m.from) === "me" ? "me" : "them"), [m.text]))),
        h("div.chat-input", [input, Btn("Send", { variant: "primary", size: "sm", onClick: () => { if (input.value.trim()) { A.sendMessage(cur.id, input.value.trim()); input.value = ""; render(); } } })]),
      ]);
      wrap.appendChild(h("div.msg-layout", [list, pane]));
    }
    render();
    return wrap;
  }

  /* ---------------- Community ---------------- */
  function community() {
    const posts = A.community();
    return h("div.fade-in", [
      PageH("Community", "Where safety pros trade hard-won knowledge.", Btn("New post", { variant: "primary", onClick: () => toast("Composer opened") })),
      h("div.col", posts.map((p) => h("div.card", [
        h("div.row", [Avatar(p.author, "sm"), h("div", [h("b", [p.author ? p.author.name : ""]), h("span.muted", { style: "font-size:12px;margin-left:8px" }, [timeago(p.createdAt || p.at) + " · " + p.tag])])]),
        h("h3", { style: "font-size:17px;margin-top:10px" }, [p.title]),
        h("p.dim.mt-2", [p.body]),
        h("div.row.mt-3", [Chip("❤ " + p.likes), Chip("💬 " + p.comments), Chip(p.tag, "primary")]),
      ]))),
    ]);
  }

  /* ---------------- Learn (LMS) ---------------- */
  function learn() {
    const courses = A.courses();
    return h("div.fade-in", [
      PageH("Learn", "Courses, assessments and certificates — progress syncs across surfaces."),
      h("div.grid.g-2", courses.map((c) => h("div.card.opp", [
        h("div.row.between", [Chip(c.tag, "primary"), c.cert ? Chip("Certificate", "gold") : Chip("No cert")]),
        h("div.title", [c.title]),
        h("div.meta-row", [h("span", [c.lessons + " lessons"]), h("span", [c.level])]),
        h("div.mt-2", [Bar(c.enrolledPct)]),
        h("div.row.between.mt-2", [h("span.dim", { style: "font-size:13px" }, [c.enrolledPct === 100 ? "Completed ✓" : c.enrolledPct > 0 ? c.enrolledPct + "% complete" : "Not started"]),
          Btn(c.enrolledPct === 100 ? "View certificate" : c.enrolledPct > 0 ? "Resume" : "Enroll", { variant: "accent", size: "sm", onClick: () => toast(c.enrolledPct === 100 ? "Certificate opened" : "Enrolled") })]),
      ]))),
    ]);
  }

  /* ---------------- Referrals ---------------- */
  function referrals() {
    const r = A.referrals();
    return h("div.fade-in", [
      PageH("Referral hub", "Invite peers, earn recognition."),
      h("div.grid.g-3", [KPI("Invited", r.invited), KPI("Joined", r.joined), KPI("XP earned", r.earnedXp.toLocaleString("en-IN"))]),
      h("div.card.mt-4", [
        h("h3", { style: "font-size:16px" }, ["Your referral link"]),
        h("div.row.mt-3", [h("input.input", { value: "https://iac.club/r/" + r.code, readonly: true }), Btn("Copy", { variant: "primary", onClick: () => { navigator.clipboard && navigator.clipboard.writeText("https://iac.club/r/" + r.code); toast("Link copied", true); } })]),
        h("p.muted.mt-2", { style: "font-size:13px" }, ["An iac.club/r/ link attributes the referral on install (app) or sign-up (web)."]),
      ]),
    ]);
  }

  /* ---------------- Search ---------------- */
  function search(query) {
    const q = query.q || "";
    const wrap = h("div.fade-in");
    function render(term) {
      wrap.innerHTML = "";
      wrap.appendChild(PageH("Search", "Opportunities, advisors, companies, jobs — one index."));
      const input = h("input.input", { placeholder: "Search IAC…", value: term, oninput: (e) => render(e.target.value) });
      wrap.appendChild(h("div.card.pad-sm", [input]));
      if (term && term.length > 1) {
        const projs = A.projects({ q: term });
        const users = A.users().filter((u) => (u.name + u.skills.join(" ")).toLowerCase().includes(term.toLowerCase()));
        wrap.appendChild(h("div.mt-4", [
          h("h3", { style: "font-size:15px" }, ["Opportunities (" + projs.length + ")"]),
          h("div.col.mt-2", projs.map((p) => h("div.card.pad-sm", { style: "cursor:pointer", onclick: () => go("/opportunities/" + p.id) }, [h("b", [p.title]), h("div.dim", { style: "font-size:13px" }, [p.location])]))),
          h("h3", { style: "font-size:15px;margin-top:16px" }, ["Advisors (" + users.length + ")"]),
          h("div.col.mt-2", users.map((u) => h("div.card.pad-sm", { style: "cursor:pointer", onclick: () => go("/u/" + u.handle) }, [h("div.row", [Avatar(u, "sm"), h("div", [h("b", [u.name]), h("div.dim", { style: "font-size:13px" }, [u.title])])])]))),
        ]));
      } else {
        wrap.appendChild(h("p.dim.mt-4", ["Type to search across the shared index."]));
      }
      const i = wrap.querySelector("input"); if (i && term) { i.focus(); i.setSelectionRange(term.length, term.length); }
    }
    render(q);
    return wrap;
  }

  /* ---------------- Membership / checkout ---------------- */
  function membership() {
    const cfg = A.getConfig();
    return h("div.fade-in", [
      PageH("Membership", "Unlock priority ranking and pro tooling."),
      h("div.grid.g-2", [
        h("div.card", [h("h3", { style: "font-size:18px" }, ["Advisor Pro"]), h("div", { style: "font-family:var(--font-display);font-size:32px;font-weight:800;margin-top:6px" }, ["₹999", h("span.muted", { style: "font-size:15px" }, ["/mo"])]),
          h("ul", { style: "color:var(--text-dim);line-height:2;margin-top:12px" }, [h("li", ["Priority best-value ranking"]), h("li", ["Résumé & impact builder"]), h("li", ["Featured public profile"])]),
          h("div.mt-3", [Btn("Subscribe", { variant: "primary", block: true, onClick: () => go("/checkout") })]),
        ]),
        h("div.card", [h("h3", { style: "font-size:16px" }, ["How checkout works"]),
          h("p.dim.mt-2", ["Catalog and pricing come from the server (", h("code", ["GET /payments/config"]), "). The same Razorpay key (" + cfg.razorpayKeyId + ") and the same order → verify → webhook flow runs on app and web."]),
          h("div.banner.info.mt-3", ["🔁", "The webhook is idempotent: a duplicate confirmation can never double-charge or double-credit."]),
        ]),
      ]),
    ]);
  }
  function checkout() {
    const cfg = A.getConfig();
    return h("div.fade-in", [
      h("a.dim", { href: "#/membership" }, ["← Membership"]),
      PageH("Checkout", "Advisor Pro · ₹999/mo"),
      h("div.card", { style: "max-width:480px" }, [
        h("div.row.between", [h("span.dim", ["Plan"]), h("b", ["Advisor Pro (monthly)"])]),
        h("div.row.between.mt-2", [h("span.dim", ["Amount"]), h("b", ["₹999"])]),
        h("div.row.between.mt-2", [h("span.dim", ["Gateway"]), h("b", [cfg.razorpayKeyId])]),
        h("div.mt-4", [Btn("Pay ₹999 securely", { variant: "primary", block: true, onClick: () => { celebrate("Payment verified", "Advisor Pro active · server webhook confirmed"); } })]),
        h("p.muted.mt-2", { style: "font-size:12px" }, ["Server creates the order, the client confirms, the webhook verifies — idempotently."]),
      ]),
    ]);
  }

  /* ---------------- KYC / Trust / Settings (compact) ---------------- */
  function kyc() {
    const rows = [
      ["PAN", "Verified ✓", "accent"], ["Bank account", "Verified ✓", "accent"],
      ["Address proof", "In review", "gold"], ["Selfie liveness", "Pending", ""],
    ].map(([k, v, tone]) => h("div.row.between", { style: "padding:12px 0;border-bottom:1px solid var(--line-soft)" }, [h("b", [k]), Chip(v, tone)]));
    rows.push(h("div.banner.info.mt-3", ["📲", "A KYC step started on the app appears here pre-filled — drafts live server-side, keyed to your user."]));
    rows.push(h("div.mt-3", [Btn("Continue verification", { variant: "primary", onClick: () => toast("Resumed from server draft", true) })]));
    return h("div.fade-in", [
      PageH("KYC verification", "Required before cash-out unlocks. Resumable across surfaces."),
      h("div.card", { style: "max-width:560px" }, rows),
    ]);
  }
  function trust() {
    const feats = [
      ["🪪 Identity & credential checks", "PAN/Aadhaar, certificate verification, and bank validation before payouts."],
      ["🔒 Confidentiality by construction", "clientBudget never crosses to any client surface — re-checked in CI against rendered HTML."],
      ["⚖️ COI register", "Self-referrals require an independent professional, linked in a COIRecord and resolved by an admin."],
      ["🧾 Immutable audit", "Every privileged action is an AdminAction — a clean trail for assurance."],
    ].map(([t, d]) => h("div.feature", [h("h3", { style: "font-size:16px" }, [t]), h("p.dim.mt-2", [d])]));
    return h("div.fade-in", [
      PageH("Trust layer", "How IAC verifies and protects."),
      h("div.grid.g-2", feats),
    ]);
  }
  function impact() {
    const me = A.me();
    return h("div.fade-in", [
      PageH("Impact dashboard", "Your measurable safety footprint — shareable as a public card."),
      h("div.grid.g-3", [KPI("Sites made safer", "312"), KPI("NCs closed", "1,840"), KPI("Zero-LTI programs", "9")]),
      h("div.row.mt-4", [Btn("Share public impact card", { variant: "accent", onClick: () => go("/u/" + me.handle + "/impact") })]),
    ]);
  }
  function saved() {
    const projects = A.projects().slice(0, 2);
    return h("div.fade-in", [PageH("Saved", "Bookmarked opportunities and reads."),
      h("div.col", projects.map((p) => h("div.card.opp", { onclick: () => go("/opportunities/" + p.id) }, [h("b", [p.title]), h("div.dim", { style: "font-size:13px" }, [p.location + " · " + p.category])])))]);
  }

  window.APP = { arena, opportunities, opportunityDetail, terms, reverseBid, projects, projectRoom, wallet, jobs, messages, community, learn, referrals, search, membership, checkout, kyc, trust, impact, saved };
})();
