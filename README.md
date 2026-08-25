# Resell Tracker

Inventory, sales and profit tracking for Depop, eBay and Vinted. React + Vite PWA
backed by Firebase, so it installs on a phone and syncs with the desktop.

Every item carries one number that matters: what you actually kept after platform
fees, shipping and what you paid for it.

## What it does

- **Inventory** — photo, title, brand, size, condition, cost, where you sourced it,
  and which platforms it is listed on. Search and filter by status or platform.
- **Sales** — a **Sold** button on any inventory row jumps straight to the sale,
  prefilled with the asking price and the platform it was listed on. Record what you
  listed it for and the offer you accepted; the breakdown updates as you type: how
  far it came down, what the platform kept, cost of goods, shipping, net, margin,
  ROI and days held. Grouped by month with a running total.
- **Donations** — stock that is never going to sell gets marked donated instead,
  with the date and where it went. It leaves "cash tied up" and the aging buckets
  the moment you do, and its cost shows up as a write-off.
- **Real payouts, estimates as backup** — with a payout entered the platform's cut
  is derived from it and no rate table is consulted. Without one, editable
  per-platform rates stand in, and anything resting on them is labelled "est."
- **Trends** — net profit by month, profit by platform, cash sitting in unsold
  stock by age, and profit by category.
- **Export** — CSV of every item with its full profit breakdown, plus a raw JSON
  backup.
- Works offline (writes queue and sync when you are back on signal).

## Setup

```bash
npm install
```

Create a Firebase project (the free tier is ample):

1. <https://console.firebase.google.com> → add project.
2. **Build → Authentication** → enable **Email/Password** and **Anonymous**.
3. **Build → Firestore Database** → create a database in production mode.
4. **Project settings → Your apps** → add a **Web app**, copy its config.
5. Copy `.env.example` to `.env` and fill in the six values.
6. Publish the security rules in `firestore.rules` — paste them into the Firestore
   **Rules** tab, or `firebase deploy --only firestore:rules`.

```bash
npm run dev
```

If `.env` is missing, the app shows these setup steps instead of a blank screen.

## Try it without Firebase

`npm run dev`, then open <http://localhost:5175/resell-tracker/demo.html>. That entry
(`src/demo.jsx`) renders the real screens against sample inventory held in memory —
useful for a look around before setting anything up, and for working on the UI
without touching real data. It is dev-only and not part of `npm run build`.

## Scripts

| Command | Does |
|---|---|
| `npm run dev` | Dev server |
| `npm run build` | Production build into `dist/` |
| `npm run preview` | Serve the built app |
| `npm test` | Run the profit-math tests |
| `npm run lint` | ESLint |

## How profit is worked out

```
gross = offer accepted + shipping the buyer paid
net   = payout - cost of goods - shipping you paid - other costs
```

A sale keeps both **listed for** and **offer accepted**, so the haggling is on the
record: what you asked, what you took, and the gap between them. Listed-for is
snapshotted onto the sale, so editing the item later cannot rewrite history.

The payout is the pivot, and there are two ways it gets there:

| | fees | payout | shown as |
|---|---|---|---|
| you entered the payout | `gross - payout` | what you typed | exact |
| you haven't yet | the platform's rate | `gross - fees` | "est." |

So a sale logged the moment it happens still shows a sensible number, and going
back to type the real payout replaces the estimate everywhere — the CSV keeps a
`Fees estimated` column marking which rows are still guesses.

Estimates also drive the projected net on anything still listed ("est. net if it
sells at asking"), which is the point of keeping them around.

### Fee rates

Seeded in `src/lib/platforms.js`, editable in Settings:

| Platform | Rate | Notes |
|---|---|---|
| Depop | 3.3% + $0.45 | Payment processing on the whole order. The US 10% selling fee moved to buyers in 2024. |
| eBay | 13.25% + $0.40 | Final value fee for most categories, on price + shipping. |
| Vinted | 0% | Sellers pay nothing; the buyer pays Buyer Protection. |

Rates vary by country, category and account, and they change — check them against a
real payout. A sale carrying its actual payout ignores them entirely.

## Donated stock

Write-offs are kept apart from sale profit rather than folded into it — "I made $40
on that jacket" and "I gave up on $18 of stock" are two different facts, and
averaging them into one number hides both. The dashboard shows the write-off total
on its own tile; the CSV carries the donation date, where it went, any receipt
value, and the cost written off.

The receipt value is recorded as typed and used in no calculation. Deductibility
for donated resale inventory has its own rules — that is a question for whoever
does your taxes, not for this app.

## Photos

Cloud Storage for Firebase needs a billing account attached (since 3 February 2026,
even for a few KB), so photos avoid it entirely. A picked image is resized in the
browser into two JPEGs:

| | Size | Lives in | Read when |
|---|---|---|---|
| thumbnail | ~96px, a few KB | the item document | every list, no extra request |
| full | ~900px, under 100KB | `items/{id}/media/photo` | you open that one item |

Keeping the big one in its own document means syncing a whole inventory does not
drag every photo down with it. One photo per item; Firestore caps a document at
1 MiB and both sizes stay well inside that.

## Data model

One Firestore collection, `users/{uid}/items`, holding the whole lifecycle:

```
inventory → listed → sold      the money came back
                   → donated   it did not
```

A sold item keeps a `sale` map (`platform`, `listedFor`, `price`, `payout`,
`shippingCharged`, `shippingCost`, `otherCosts`, `date`) — `price` is the accepted
offer, and `payout` null means "not known yet". A donated one keeps a `donation` map
(`date`, `org`, `receiptValue`) alongside its original cost, so profit never
needs a join. Rules restrict every document to its owner, and split
`create, update` from `delete` — on a delete there is no `request.resource`, so a
validation written against it would error and deny the whole operation.

## Adding a platform

`src/lib/platforms.js` — add an entry with its default fee schedule, then add a
`--<id>-color` token in `src/index.css` for both themes. The filters, badges,
charts and fee editor pick it up from there.
