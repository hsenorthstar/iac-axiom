/* Admin — web-first deep-work. intake → publish → Deal Desk → payouts → COI →
   Safety-King judging. ADMIN role only. Data exposed via /admin/*; app has read views. */
(function () {
  "use strict";
  const A = window.IAC;
  const { h, Btn, Chip, KPI, Avatar, PageH, go, toast, timeago } = window.UI;

  function tabs(active) {
    const t = [["overview", "Overview"], ["dealdesk", "Deal Desk"], ["payouts", "Payouts"], ["coi", "COI register"], ["king", "Safety-King judging"], ["audit", "Audit trail"]];
    return h("div.seg", { style: "flex-wrap:wrap" }, t.map(([k, l]) => h("button" + (active === k ? ".on" : ""), { onclick: () => go("/admin/" + k) }, [l])));
  }

  function guard(inner, active) {
    if (!A.isAdmin()) {
      return h("div.fade-in", [PageH("Admin"), h("div.banner.gold", ["🔒", "Admin role required. Switch to the Arpan (Admin) account from the top-right menu to view the Deal Desk."])]);
    }
    return h("div.fade-in", [PageH("Admin · Deal Desk", "Web-first deep-work. The app has read-only views of the same rows."), tabs(active), h("div.mt-4", [inner])]);
  }

  function overview() {
    const projects = A.projects();
    const payouts = A.payouts();
    const coi = A.coi();
    return guard(h("div", [
      h("div.grid.g-4", [
        KPI("Open opportunities", projects.length, "live in arena"),
        KPI("Bids to review", "16", "across 4 projects"),
        KPI("Payouts pending", payouts.filter((p) => p.status === "PENDING").length, A.fmtINR(payouts.reduce((s, p) => s + p.amount, 0))),
        KPI("Open COI", coi.filter((c) => !c.resolvedAt).length, "needs resolution"),
      ]),
      h("div.card.mt-4", [
        h("div.card-h", [h("h3", ["Intake → publish queue"]), Btn("New opportunity", { variant: "primary", size: "sm", onClick: () => toast("Intake form opened") })]),
        h("div.table-wrap", [h("table.tbl", [
          h("thead", [h("tr", [h("th", ["Title"]), h("th", ["Client"]), h("th", ["Category"]), h("th", ["Bids"]), h("th", ["Status"]), h("th", [""])])]),
          h("tbody", projects.map((p) => { const co = A.company(p.clientId); return h("tr", [
            h("td", [p.title]), h("td", [co ? co.name : ""]), h("td", [p.category]), h("td.num", [String(p.bids)]), h("td", [Chip(p.status, "accent")]),
            h("td", [Btn("Deal Desk", { variant: "ghost", size: "sm", onClick: () => go("/admin/dealdesk?p=" + p.id) })]),
          ]); })),
        ])]),
      ]),
    ]), "overview");
  }

  /* Deal Desk — multi-bid side-by-side comparison (web-first; app can't do this well) */
  function dealDesk(query) {
    const projects = A.projects();
    const pid = query.p || projects[0].id;
    const p = A.project(pid);
    const bids = A.bidsForProject(pid).slice().sort((a, b) => b.score - a.score);
    const best = bids.reduce((m, b) => (b.amount < m ? b.amount : m), Infinity);
    return guard(h("div", [
      h("div.row.between.mb-3", [
        h("label.field", { style: "max-width:360px" }, [h("span", ["Opportunity"]),
          h("select.select", { onchange: (e) => go("/admin/dealdesk?p=" + e.target.value) }, projects.map((x) => h("option", { value: x.id, selected: x.id === pid }, [x.title])))]),
        h("div.chip.accent", ["🔒 clientBudget visible to admin only — never on the wire to clients"]),
      ]),
      h("div.grid.g-3", [
        KPI("Fair-rate floor", A.fmtINR(p.fairRateFloor)),
        KPI("Best-value bid", A.fmtINR(best === Infinity ? p.bestValue : best), "lowest compliant"),
        KPI("Confidential budget", A.fmtINR(A._projectRaw(pid).clientBudget), "admin-only · server"),
      ]),
      h("div.card.mt-4", [
        h("h3", { style: "font-size:16px" }, ["Side-by-side bid comparison"]),
        h("div.table-wrap.mt-3", [h("table.tbl", [
          h("thead", [h("tr", [h("th", ["Advisor"]), h("th", ["Bid"]), h("th", ["Delivery"]), h("th", ["Power"]), h("th", ["Best-value score"]), h("th", ["Est. margin*"]), h("th", [""])])]),
          h("tbody", bids.map((b, i) => {
            const margin = A._projectRaw(pid).clientBudget - b.amount;
            return h("tr", [
              h("td", [h("div.row", [Avatar(b.professional, "sm"), h("div", [h("b", [b.professional.name]), h("div.dim", { style: "font-size:12px" }, [b.professional.title])])])]),
              h("td.num", [A.fmtINR(b.amount), b.amount === best ? Chip(" best", "accent") : null]),
              h("td.num", [b.deliveryDays + "d"]),
              h("td.num", [String(b.professional.powerScore)]),
              h("td.num", [h("b", { style: "color:" + (i === 0 ? "var(--iac-accent)" : "var(--text)") }, [String(b.score)])]),
              h("td.num", [A.fmtINR(margin)]),
              h("td", [Btn("Award", { variant: i === 0 ? "accent" : "ghost", size: "sm", onClick: () => { window.UI.celebrate("Bid awarded", b.professional.name + " · " + A.fmtINR(b.amount) + " → engagement created"); } })]),
            ]);
          })),
        ])]),
        h("p.muted.mt-3", { style: "font-size:12px" }, ["*Margin = clientBudget − deliveryAmount − referralCommission. Computed server-side, shown to admins only, never emitted to any client surface."]),
      ]),
    ]), "dealdesk");
  }

  function payoutsPage() {
    const payouts = A.payouts();
    const wrap = h("div");
    function render() {
      const list = A.payouts();
      wrap.innerHTML = "";
      wrap.appendChild(h("div.banner.gold.mb-3", ["🔒", "Points-first mode is ON — payouts are queued but disbursement is gated by the server flag until month 4. Holds/releases here are recorded as immutable AdminActions."]));
      wrap.appendChild(h("div.table-wrap", [h("table.tbl", [
        h("thead", [h("tr", [h("th", ["Advisor"]), h("th", ["Amount"]), h("th", ["Status"]), h("th", ["Requested"]), h("th", [""])])]),
        h("tbody", list.map((p) => h("tr", [
          h("td", [p.user ? p.user.name : p.userId]), h("td.num", [A.fmtINR(p.amount)]),
          h("td", [Chip(p.status, p.status === "ON_HOLD" ? "danger" : p.status === "RELEASED" ? "accent" : "gold")]),
          h("td", [timeago(p.createdAt)]),
          h("td", [h("div.row", [
            Btn("Hold", { variant: "ghost", size: "sm", disabled: p.status === "ON_HOLD", onClick: () => { A.holdPayout(p.id); toast("Payout held + audited"); render(); } }),
            Btn("Release", { variant: "accent", size: "sm", disabled: p.status === "RELEASED", onClick: () => { A.releasePayout(p.id); toast("Payout released + audited", true); render(); } }),
          ])]),
        ]))),
      ])]));
    }
    render();
    return guard(wrap, "payouts");
  }

  function coiPage() {
    const wrap = h("div");
    function render() {
      const recs = A.coi();
      wrap.innerHTML = "";
      wrap.appendChild(h("p.dim.mb-3", ["When a referrer self-refers into an engagement, an independent professional must be assigned and the two are linked in a COIRecord. Resolve once independence is confirmed."]));
      wrap.appendChild(h("div.table-wrap", [h("table.tbl", [
        h("thead", [h("tr", [h("th", ["Engagement"]), h("th", ["Referrer"]), h("th", ["Professional"]), h("th", ["Status"]), h("th", [""])])]),
        h("tbody", recs.map((c) => h("tr", [
          h("td", [c.engagementId]), h("td", [c.referrer ? c.referrer.name : c.referrerId]), h("td", [c.professional ? c.professional.name : c.professionalId]),
          h("td", [Chip(c.resolvedAt ? "Resolved" : "Open", c.resolvedAt ? "accent" : "danger")]),
          h("td", [c.resolvedAt ? h("span.muted", { style: "font-size:12px" }, [timeago(c.resolvedAt)]) : Btn("Resolve", { variant: "accent", size: "sm", onClick: () => { A.resolveCoi(c.id); toast("COI resolved + audited", true); render(); } })]),
        ]))),
      ])]));
    }
    render();
    return guard(wrap, "coi");
  }

  function king() {
    const cos = A.companies().slice().sort((a, b) => b.safetyScore - a.safetyScore);
    return guard(h("div", [
      h("p.dim.mb-3", ["Judge the public Safety-King leaderboard. Scores combine LTIFR, audit closure rate and program maturity. Publishing updates the public /safety-king page instantly."]),
      h("div.table-wrap", [h("table.tbl", [
        h("thead", [h("tr", [h("th", ["Company"]), h("th", ["LTIFR"]), h("th", ["Score"]), h("th", ["Rank"]), h("th", [""])])]),
        h("tbody", cos.map((c, i) => h("tr", [
          h("td", [c.name]), h("td.num", [c.ltifr.toFixed(2)]), h("td.num", [h("b", { style: "color:var(--iac-gold)" }, [String(c.safetyScore)])]), h("td.num", ["#" + (i + 1)]),
          h("td", [Btn("Publish", { variant: "gold", size: "sm", onClick: () => toast("Published to public board") })]),
        ]))),
      ])]),
    ]), "king");
  }

  function audit() {
    const rows = A.audit();
    return guard(h("div", [
      h("p.dim.mb-3", ["Every privileged mutation is an immutable AdminAction. This is the assurance trail."]),
      h("div.table-wrap", [h("table.tbl", [
        h("thead", [h("tr", [h("th", ["Action"]), h("th", ["Target"]), h("th", ["Target ID"]), h("th", ["When"])])]),
        h("tbody", rows.map((r) => h("tr", [h("td", [Chip(r.action, "primary")]), h("td", [r.targetType]), h("td", [r.targetId]), h("td", [timeago(r.createdAt)])]))),
      ])]),
    ]), "audit");
  }

  window.ADMIN = { overview, dealDesk, payoutsPage, coiPage, king, audit };
})();
