# Glossmith CRM — Deployment Guide & Regression Checklist (v7)

Complete rebuild. Preserves the luxury branding; replaces the architecture.
Files in this package:

| File | What it is | Where it goes |
|---|---|---|
| `Code.gs` | Layered Apps Script backend — the single source of truth | Apps Script (bound to your Sheet) |
| `index.html` | Mobile-first frontend shell + core screens | GitHub → Vercel |
| `catalog.js` | Pricing & vehicle catalogue (extracted verbatim from v6) | GitHub → Vercel (same folder as index.html) |
| `app.part2.js` | Job detail, payments, WhatsApp, PDF, More, demo backend | GitHub → Vercel (same folder) |

The three front-end files must sit **in the same folder** and are loaded with `?v=7.0.0` cache-busting query strings. Bump that number on every deploy (see step C4) — this is how stale caches are killed without users clearing anything.

---

## A. Backend (Google Apps Script)

1. Open your Google Sheet ▸ **Extensions ▸ Apps Script**.
2. Select all of `Code.gs`, delete it, paste the new `Code.gs`. **Save**.
3. In the function dropdown run **`setup`** → *Review permissions* → allow. (Creates the tables + default accounts: **owner / glossmith** and **sales / glossmith**.)
4. Run **`migrateFromV6`** — imports your existing `Sales` rows into the new Customers / Vehicles / Jobs / Payments model. **Safe & idempotent** (re-running skips already-migrated rows).
5. Change the default passwords: sign in as **owner** ▸ **More ▸ Accounts**, or run `setUsers()` in the editor once.
6. **Deploy ▸ New deployment ▸ Web app**
   - Execute as: **Me**
   - Who has access: **Anyone**
   - Deploy → copy the **/exec URL**.
7. (M-Pesa, optional) edit `setDarajaCredentials()` with your Daraja keys + Paybill, run it once.

> **Why the "old backend" red banner is gone for good:** the app now checks a real health endpoint (`?health=1`) that returns `version`, `build`, `deployId`, DB status. Version lives in one constant (`SCRIPT_VERSION`). Bump it only when the contract changes.

---

## B. Connect the app

1. Open the app, sign in (owner / glossmith on first run).
2. **More ▸ Developer ▸ Connect / change backend** → paste the `/exec` URL → **Test & save**. It validates the version before saving, then reloads live.
3. Leaving the URL blank runs the app in **demo mode** with sample data (great for training).

---

## C. Frontend (GitHub → Vercel)

1. Commit `index.html`, `catalog.js`, `app.part2.js` to your repo (repo root, or a folder Vercel serves as root).
2. Push to the branch Vercel builds. No build step needed — it's static.
3. Confirm `https://app.glossmith.com` serves the new `index.html`.
4. **On every future change, bump `?v=` and the version constants together:**
   - `index.html`: the three `?v=7.0.0` query strings
   - `index.html`: `const APP_VERSION` / `EXPECTED_BACKEND`
   - `Code.gs`: `SCRIPT_VERSION` / `BUILD_NUMBER` (only if the API contract changed)
   Vercel serves fresh assets immediately; the query string defeats browser + CDN caches.

---

## D. Regression checklist

Run through this after deploying. Every money figure must be **identical** on Dashboard, Pipeline, Job card, Receipt, Reports, and Customer/Vehicle history — because they all read the server-computed value.

**Core money rules**
- [ ] Create a job with a deposit → Pipeline shows correct balance = final − deposit.
- [ ] Receive a partial payment → balance drops by exactly that amount; a Payment row is added (history not overwritten).
- [ ] Receive the remaining balance → status flips to **Paid in full**; deposit amount is still visible in history.
- [ ] Try to overpay → rejected ("more than the outstanding balance").
- [ ] Deposit greater than total on new job → rejected.
- [ ] Negative amounts → rejected.

**Stage rules**
- [ ] Move a job with a balance to **Closed** → blocked with "This job still has an outstanding balance."
- [ ] Clear the balance, then Close → succeeds.
- [ ] First payment auto-advances New → Deposit Paid.

**Vehicles / customers (the v6 bug)**
- [ ] New job with a plate → the vehicle appears immediately on the Vehicles screen **with its make** (v6 dropped `make`).
- [ ] Same customer, second plate → both vehicles nest under one customer.
- [ ] Search by plate / name / phone / model / make / job number all return the record.
- [ ] Re-entering an existing plate on New Job auto-fills owner, phone, make, model.

**Photos / notes / job card**
- [ ] Add Before / During / After photos → each stored under the job's own Drive folder; only URLs land in the Sheet.
- [ ] Add timeline notes → each carries date, time, user.
- [ ] Job card PDF shows branding, QR, financials, payment history, notes, photo grid by phase.
- [ ] Receipt PDF renders and totals match the job.

**WhatsApp**
- [ ] Share job card / receipt / ready / completed / payment / photos → opens WhatsApp with a pre-filled message.
- [ ] Kenyan numbers auto-format to +254; on desktop it opens WhatsApp Web, on mobile the app.
- [ ] A customer with extra numbers lets you pick which to send to.

**Reliability / sync**
- [ ] Two devices acting at once don't corrupt data (LockService serialises writes).
- [ ] Health check (More ▸ Developer) shows matching app + backend versions; no red banner.
- [ ] Reports cash-vs-M-Pesa split matches the sum of real payments (not the old inflated deposit).

---

## E. What changed vs v6 (for your records)
- **Balance is never stored** — computed on the server from the Payments table.
- **Payments are append-only** — clearing a balance and closing a job both insert a record; nothing is overwritten.
- **Relational schema** — Customers → Vehicles → Jobs → Payments / Photos / Notes.
- **5-stage pipeline** — New → Deposit Paid → In Progress → Ready for Collection → Closed.
- **Costing** — per-service landed costs from *Detailhaus Final Costing Model* are built into New Job (live cost/profit) and stored on each job as `cost`; Accounting recognises them as COGS in gross/net profit.
- **Auth** — username + password sign-in; every write requires a session token; owner-managed accounts (create / change password / revoke / delete) with a default **Sales** role; owner-only actions enforced server-side.
- **Concurrency** — `LockService` around all writes.
- **Health + versioning** — real diagnostics endpoint; single version constant; cache-busting assets.
- **Mobile-first** — bottom nav, large touch targets, in-app modals (no `prompt()`/`confirm()` for money).
