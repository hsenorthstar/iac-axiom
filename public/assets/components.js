/* Shared component vocabulary — mirrors the web components/* + mobile src/ui.tsx.
   Tiny hyperscript helpers so pages read declaratively. */
(function () {
  "use strict";
  const A = window.IAC;

  /* hyperscript: h('div.card', {onclick}, [children]) */
  function h(tag, attrs, children) {
    if (Array.isArray(attrs)) { children = attrs; attrs = {}; }
    attrs = attrs || {};
    let el;
    const parts = tag.split(/(?=[.#])/);
    el = document.createElement(parts[0] || "div");
    parts.slice(1).forEach((p) => {
      if (p[0] === ".") el.classList.add(p.slice(1));
      else if (p[0] === "#") el.id = p.slice(1);
    });
    for (const k in attrs) {
      const v = attrs[k];
      if (v == null || v === false) continue;
      if (k === "class") el.className += " " + v;
      else if (k === "html") el.innerHTML = v;
      else if (k === "text") el.textContent = v;
      else if (k.startsWith("on") && typeof v === "function") el.addEventListener(k.slice(2).toLowerCase(), v);
      else if (k === "href") el.setAttribute("href", v);
      else if (k === "style") el.setAttribute("style", v);
      else if (k === "data") { for (const d in v) el.dataset[d] = v[d]; }
      else el.setAttribute(k, v);
    }
    appendChildren(el, children);
    return el;
  }
  function appendChildren(el, children) {
    if (children == null) return;
    if (!Array.isArray(children)) children = [children];
    children.forEach((c) => {
      if (c == null || c === false) return;
      if (typeof c === "string" || typeof c === "number") el.appendChild(document.createTextNode(c));
      else el.appendChild(c);
    });
  }
  const frag = (children) => { const f = document.createDocumentFragment(); appendChildren(f, children); return f; };

  /* navigate via hash router */
  function go(path) { location.hash = "#" + path; }
  function link(path, children, cls) {
    return h("a", { href: "#" + path, class: cls || "", onclick: (e) => { /* hash handles it */ } }, children);
  }

  /* ---- UI atoms ---- */
  const Chip = (text, tone, dot) => h("span.chip" + (tone ? "." + tone : "") + (dot ? ".dot" : ""), [text]);
  const Btn = (label, opts = {}) =>
    h("button.btn" + (opts.variant ? "." + opts.variant : "") + (opts.size ? "." + opts.size : "") + (opts.block ? ".block" : ""),
      { onclick: opts.onClick, disabled: opts.disabled, type: "button" },
      [opts.icon ? h("span", [opts.icon + " "]) : null, label]);
  const Card = (children, cls) => h("div.card" + (cls ? "." + cls : ""), children);
  const KPI = (label, val, sub, unit) =>
    h("div.kpi", [
      h("div.label", [label]),
      h("div.val", [String(val), unit ? h("span.unit", [unit]) : null]),
      sub ? h("div.sub", [sub]) : null,
    ]);
  const Avatar = (u, size) => h("div.avatar" + (size ? "." + size : ""), [u ? (u.avatar || u.name?.[0] || "?") : "?"]);
  const Bar = (pct) => h("div.bar", [h("span", { style: "width:" + Math.min(100, pct) + "%" })]);
  const PageH = (title, sub, right) =>
    h("div.page-h", [
      h("div.row.between", [
        h("div", [h("h1", [title]), sub ? h("p", [sub]) : null]),
        right || null,
      ]),
    ]);

  function toast(msg, ok) {
    let wrap = document.querySelector(".toast-wrap");
    if (!wrap) { wrap = h("div.toast-wrap"); document.body.appendChild(wrap); }
    const t = h("div.toast" + (ok ? ".ok" : ""), [msg]);
    wrap.appendChild(t);
    setTimeout(() => { t.style.opacity = "0"; t.style.transition = "opacity .3s"; setTimeout(() => t.remove(), 300); }, 2600);
  }

  function celebrate(title, sub) {
    const ov = h("div.celebrate", { onclick: () => ov.remove() }, [
      h("div.card-pop", [
        h("div", { style: "font-size:64px" }, ["🎉"]),
        h("h2", { style: "font-size:30px;margin-top:8px" }, [title]),
        sub ? h("p.dim", { style: "margin-top:6px" }, [sub]) : null,
        h("div.mt-4", [Btn("Nice", { variant: "primary", onClick: () => ov.remove() })]),
      ]),
    ]);
    document.body.appendChild(ov);
    setTimeout(() => ov.parentNode && ov.remove(), 3500);
  }

  const timeago = (iso) => {
    const d = (Date.now() - new Date(iso).getTime()) / 1000;
    if (d < 60) return "just now";
    if (d < 3600) return Math.floor(d / 60) + "m";
    if (d < 86400) return Math.floor(d / 3600) + "h";
    return Math.floor(d / 86400) + "d";
  };
  const daysLeft = (iso) => Math.max(0, Math.ceil((new Date(iso).getTime() - Date.now()) / 86400000));

  const notifIcon = (kind) => ({
    "bid.outbid": "⚠️", "milestone.approved": "✅", "xp.awarded": "⭐", "bid.placed": "📨", "message.new": "💬",
  }[kind] || "🔔");

  window.UI = { h, frag, go, link, Chip, Btn, Card, KPI, Avatar, Bar, PageH, toast, celebrate, timeago, daysLeft, notifIcon };
})();
