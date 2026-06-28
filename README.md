# IAC (Axiom) — real full-stack web app

The arena for verified EHS & safety professionals. **One source of truth** — the IAC
API on top of a database — with the web client (and a future mobile app) as thin
clients reading and writing the same rows.

This is a *real, working* system: a Node/Express API with a real database, JWT
auth in an httpOnly cookie, server-enforced business rules, and a responsive SPA
served from the same origin. No mock data — accounts, bids, milestones, ledgers
and XP all persist in the database.

---

## Run locally (one command)

```bash
npm install
npm start
# → IAC API + web on http://localhost:3000
```

Open http://localhost:3000. Sign up, or use a demo account on the login page
(**Meera** = advisor, **Arpan** = admin). `npm run reset` wipes and reseeds.

Requirements: **Node 20.6+ or 22** (uses the built-in `node:sqlite` — zero native
build steps, installs clean anywhere).

---

## Publish it live

### Option A — Render (free, persistent, ~3 min)
1. Push this folder to a GitHub repo.
2. On https://render.com → **New → Blueprint** → connect the repo.
   Render reads `render.yaml`, provisions the service + a 1 GB persistent disk,
   and generates `JWT_SECRET` automatically.
3. Deploy → you get a public `https://iac-axiom.onrender.com` URL.

### Option B — Railway / Fly.io / any Node host
- Start command: `node server/index.js`
- Set `JWT_SECRET` to a long random string and `DATABASE_PATH` to a path on a
  persistent volume (e.g. `/data/iac.db`).

### Option C — Docker (anywhere)
```bash
docker build -t iac-axiom .
docker run -p 3000:3000 -e JWT_SECRET=$(openssl rand -hex 32) -v iac_data:/data iac-axiom
```

### Custom domain (`iac.club`)
Point an A/CNAME record at your host and add the domain in the host's dashboard
(Render/Railway/Fly all do automatic TLS).

---

## Architecture

```
server/
  index.js   Express app — all API routes + serves the SPA
  db.js      schema + connection (node:sqlite)
  seed.js    seed data (idempotent; --reset to wipe)
public/
  index.html
  assets/
    data.js        @iac/api-client — the ONE client both surfaces use (fetch + cache)
    app.js         async hash router + app shell (topbar, sidebar, bell)
    components.js   shared UI vocabulary (Card, Chip, Button, KPI…)
    pages-public.js public SEO tier (home, profiles, Safety-King, awards…)
    pages-app.js    authenticated surfaces (arena, bid, delivery, wallet…)
    pages-admin.js  admin Deal Desk
    tokens.css      brand tokens — the single visual source
    styles.css
```

### Invariants enforced server-side (not the client's job)
- **`clientBudget` is confidential** — stripped from every client-facing project
  shape. The *only* endpoint that returns it is the admin-gated Deal Desk
  (`GET /api/admin/projects/:id/bids`). It never appears on a public/SEO page.
- **Fair-rate floor** — `POST /api/bids` rejects (422) any bid below the floor.
- **Milestone approval is atomic** — one transaction writes the earnings ledger
  CREDIT (net of statutory TDS), awards recognition XP, and flips the milestone.
- **Points-first gating** — a single server flag (`config.payoutsEnabled`) that
  both surfaces read. Flip it server-side to switch cash-out on for everyone.

### Key endpoints
`POST /api/auth/{login,signup,logout}` · `GET /api/auth/me` · `GET /api/bootstrap`
`GET /api/projects[/:id]` · `GET/POST/PUT /api/bids…` · `GET /api/engagements[/:id]`
`POST /api/engagements/:id/milestones/:mid/approve` · `GET /api/wallet`
`GET /api/threads` · `GET /api/notifications` · `GET /api/admin/*` (ADMIN only)

---

## Upgrading to Postgres (for scale)
The data layer is isolated in `server/db.js` and `server/seed.js`. Swap
`node:sqlite` for `pg` and point `DATABASE_URL` at a managed Postgres (Neon,
Supabase, Render Postgres). The route handlers are plain SQL and port directly.
This matches the spec's `services/api` (Express + Prisma + Postgres) target.

Built by Northstar. © 2026 IAC (Axiom).
