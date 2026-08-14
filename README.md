# Jo Dailies

Track Jo’s daily puzzles with streaks, a shared watchlist, and a little Calcifer buddy who reacts as you go.

Open Connections, Stackdown, Chess Daily, and Waffle — mark them done, keep a golden-day streak, and poke at a few extra checkboxes just for fun. Shared progress syncs through Firestore and remains editable offline.

## Features

- Open each daily and auto-mark it done (manual override anytime)
- Month calendar tinted by completion (partial vs golden all-four)
- General streak (any daily) + Golden streak (all four)
- Calcifer moods, quotes, and idle animations
- Realtime dailies and watchlist sync with persistent offline editing
- Google sign-in; no custom server to run

## Setup

```bash
npm install
copy .env.example .env.local
npm run dev
```

Fill `.env.local` with the Firebase web-app configuration. The same
`VITE_FIREBASE_*` values must be configured in Vercel before redeploying.
These are public client identifiers; access is protected by Firestore rules.

## Firebase setup

1. Enable Google under Authentication → Sign-in method.
2. Create a Firestore Standard database.
3. Add localhost and the Vercel production domains under Authentication →
   Settings → Authorized domains.
4. Publish [`firestore.rules`](./firestore.rules) in Firestore → Rules.
5. Publish [`storage.rules`](./storage.rules) in Storage → Rules (keeps
   existing `scrapbook/` snapshots allowed, plus future room-prefixed files).
6. Let both people sign in once, copy their UIDs from Authentication → Users,
   replace the two placeholders in the rules file, and publish the rules. The
   database remains locked until those placeholders are replaced.

### Turn notifications (optional)

Chrome can ping you when Scrabble becomes your turn. The site already
requests permission and stores an FCM token under
`rooms/{room}/users/{uid}/pushTokens`. Lock-screen delivery needs a sender:

1. Firebase Console → Project settings → Cloud Messaging → Web Push
   certificates — generate a key pair, copy the **key pair** into
   `VITE_FIREBASE_VAPID_KEY` (local + Vercel).
2. Upgrade the project to Blaze (pay-as-you-go). Usage for two people stays
   in the no-cost tier; set a $1 budget alert.
3. `npm install` inside `functions/`, then
   `npx firebase deploy --only functions`.
4. Optional: `firebase functions:secrets:set` is not required. Set param
   `APP_ORIGIN` to the production URL (e.g. `https://your-app.vercel.app`)
   so the notification opens Arcade.

Until the function is deployed, **Turn pings** still work as a local
notification while the tab is actually running.

The first authenticated load merges existing dailies and watchlist data from
`localStorage` into the shared room. Theme is shared via Firestore;
other presentation chrome (cursor trail, collapsed panels) stays device-local.

## Docs

- [CLAUDE.md](./CLAUDE.md) — architecture for agents and humans
- [REFACTOR.md](./REFACTOR.md) — cleanup that is worth doing (and what not to do)
- [PLANS.md](./PLANS.md) — Cookbook and Shopping list plan

## Scripts

- `npm run dev` — start the Vite dev server
- `npm run build` — typecheck and production build
- `npm test` — run Vitest unit tests
