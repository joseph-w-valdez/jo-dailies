# Jo Dailies — architecture

Household app for Joseph and Joha. Not a multi-tenant product. Two Google accounts share one Firestore room.

For cleanup ideas see [REFACTOR.md](./REFACTOR.md). For Cookbook and Shopping see [PLANS.md](./PLANS.md). Human setup stays in [README.md](./README.md).

## Stack

- React 19 + TypeScript + Vite 8 + Tailwind 4
- `react-router-dom` v7 (`BrowserRouter` + `Routes` in `src/App.tsx`)
- Firebase: Auth (Google), Firestore (persistent multi-tab cache), Storage, optional RTDB
- Vitest for unit tests (`src/lib/**/*.test.ts`)
- No backend, no Cloud Functions, no OCR/AI packages
- `html-to-image` is used only for whiteboard → scrapbook PNGs

## Mental model

After Google sign-in, almost all live data is **one shared room**, not per-user documents.

```
rooms/{syncRoomId}/     // VITE_SYNC_ROOM_ID or "jo-and-friend"
```

Access is an allowlist of two UIDs in `firestore.rules`, `database.rules.json`, and `JENGA_PLAYER_UIDS` in `src/lib/jenga.ts`. There is no `users/{uid}` collection.

## Routes

| Path | Component | What it is |
|---|---|---|
| `/` | `HomePage` in `src/App.tsx` | Dailies, calendar, Together Todos, Whiteboard, Pet, Watchlist, notices |
| `/scrapbook` | `src/pages/ScrapbookPage.tsx` | Whiteboard snapshots from Storage + Firestore |
| `/arcade` | `src/pages/ArcadePage.tsx` | Lazy 2P games: Jenga, Suika, Connect 4, Cattleship, Scrabble |
| `/gallery` | `src/pages/GalleryPage.tsx` | Static art + timelapses from `src/data/gallery.ts` |
| `*` | redirect to `/` | |

Unauthenticated users see a Google sign-in card. Header (`AppHeader`) only mounts when signed in.

**Not routes:** Watchlist, Together Todos, Whiteboard, Pet, NoticeRail. They live on Home. Watchlist is the left rail; notices are the right rail (`useShellLayout`).

**In-page theaters (not routes):** `GameFrame` (daily puzzle iframes), `ArcadeStage` (arcade fullscreen).

## Nav

Sticky centered pill from `src/nav.ts` (`NAV_LINKS`). Sliding active indicator tracks `left/top/width/height` so wrapped rows still highlight. Same links on mobile and desktop; the pill can wrap. No hamburger, no account menu.

`signOut` exists on auth context and is not wired to UI. Theme + cursor trail live in `StreakBar` on Home only.

New route = add `Route` in `App.tsx` **and** a `NAV_LINKS` entry in `src/nav.ts`.

## Feature registration

| Kind | Where |
|---|---|
| Daily puzzle | `GameId` in `src/types.ts` + `GAMES` in `src/games.ts` |
| Extra checkbox | `ExtraId` + `src/extras.ts` (not counted in streaks) |
| Arcade game | `ArcadeGame` union + `TILES` + lazy import in `ArcadePage.tsx` |
| Home widget | Hardcoded JSX in `HomePage` |
| `src/config.ts` | `{ debug: false }` only — not a feature registry |

Time is Pacific (`America/Los_Angeles`) via `src/lib/date.ts` and `useAppToday()`.

## Firebase

Init: `src/lib/firebase.ts` → `auth`, `db`, `storage`, `rtdb` (null without `VITE_FIREBASE_DATABASE_URL`), `syncRoomId`.

### Rules

`firestore.rules` allows **only**:

```
/rooms/jo-and-friend/{document=**}   // the two UIDs
/{document=**}                       // deny
```

RTDB: `rooms/jo-and-friend/wbLive/{uid}` and `jengaLive/{uid}` — read if allowed, write own uid only.

Storage: [`storage.rules`](./storage.rules) (publish in the Firebase console; [`firebase.json`](./firebase.json) wires CLI deploys). Allows `scrapbook/**` (existing snapshots) and `rooms/jo-and-friend/**` (future recipe images). Same two UIDs as Firestore.

### Shared room tree

```
rooms/{syncRoomId}/
  days/{YYYY-MM-DD}              // DayLog (game/extra ids → true)
  togetherTodos/{id}
  watchItems/{id}
  settings/appearance            // { theme } — SHARED, both clients
  pet/current                    // PetKennel
  whiteboardStrokes/{strokeId}
  whiteboard/current             // legacy blob, migrated away
  jenga|connect4|battleship|scrabble|chess|wordle|hangman|codenames|guesswho|spike/current
  suika/best                     // high score only; bowl is in-memory
  arcadeMatches/{id}             // append-only finished 2P matches (not Suika)
```

### Outside the room (inconsistent)

```
scrapbook/{uuid}                 // Firestore metadata
scrapbook/{year}/{MM}/{uuid}.png // Storage
```

Committed rules would **deny** top-level `scrapbook`. Either production rules differ, or those writes fail. Do not copy this pattern. New files should live under the room.

### Gallery

Static files in `public/gallery/` + `src/data/gallery.ts`. No Firebase.

### Sync pattern

Typical hook:

1. Optimistic local state + `localStorage` cache
2. `onSnapshot(..., { includeMetadataChanges: true })`
3. `updateSyncSource` in `src/lib/syncStatus.ts`
4. One-shot localStorage → Firestore migration if remote empty (`*:migrated:v1` flag)
5. Writes: `setDoc` / `deleteDoc`; pet uses transactions
6. Arcade games: version + `pendingVersionRef` so a slow snapshot cannot rewind a local commit
7. Domain modules export `normalize*` so bad remote docs cannot crash the UI

`src/lib/storage.ts` is **dailies localStorage**, not Firebase Storage.

| Hook / owner | Path | Style |
|---|---|---|
| `useDailies` | `days` | collection |
| `useTogetherTodos` | `togetherTodos` | collection |
| Watchlist (inline) | `watchItems` | collection + dnd-kit |
| `useSharedTheme` | `settings/appearance` | single doc |
| `useSharedPet` | `pet/current` | single doc + transactions |
| `useWhiteboard` | strokes + RTDB `wbLive` | per-stroke docs + live drafts |
| `useSharedJenga` | `jenga/current` + RTDB `jengaLive` | versioned doc + ghosts |
| `useSharedConnect4` / Battleship / Scrabble | `*/current` | versioned doc |
| `useSharedSuika` | `suika/best` | high score only |
| `useArcadeMatches` | `arcadeMatches` | collection (finished 2P games) |
| `src/lib/scrapbook.ts` | top-level `scrapbook` | collection + Storage |

## Auth and identity

- `FirebaseAuthProvider` + `useFirebaseAuth()` → `{ user, loading, error, signIn, signOut }`
- Display names: Google `displayName` first token, else email (copied in pet + suika helpers)
- Two-player seats: `JENGA_PLAYER_UIDS[0]` / `[1]` — reused by Jenga, Connect 4, Battleship, Scrabble

## Prefs: shared vs device-local

**Shared (Firestore):** theme (`rooms/.../settings/appearance`). `SharedThemeProvider` mounts in `App` (inside auth) so every route, including a cold load of Gallery/Scrapbook, paints the stored theme. The picker still lives in `StreakBar` on Home.

**Device-local (`localStorage`):** cursor trail, panel collapse keys, watchlist row collapse, Scrabble sidebar width, dictionary cache, migration flags, optimistic copies of shared docs.

There are **no per-user Firestore prefs** (units, favorites, etc.).

## UI conventions

- Dark-first surfaces: `border-border`, `bg-surface`, `bg-surface-raised`, `text-muted`, `text-white`
- Theme tokens in `src/index.css` via `html[data-theme='…']` (`blue` default, plus black/white/pink/violet/emerald)
- Skill/action chips (Suika, Scrabble): `border-*-500/55 bg-*-500/20 text-app-text`
- Confirm overlays: `ConfirmDialog` in `src/components/ConfirmDialog.tsx`. Arcade new-game: `NewGameConfirm` (Connect 4, Battleship, Scrabble).
- First-name labels: `playerFirstName` in `src/lib/playerLabel.ts`
- Media lightboxes: `GalleryViewer` and `ScrapbookViewer` are near-duplicates (Esc/arrows, `bg-black/85`)

Quote style is mixed (newer Gallery/Scrapbook/App often double quotes; most of `src/` is single).

## Types

`src/types.ts` is small: dailies + `ScrapbookEntry`. Domain types live next to their lib (`watchlist.ts`, `pet.ts`, `scrabble/state.ts`, …).

## Tests

`npm test` → Vitest. Coverage is concentrated in date/streaks/pet/scrabble. Pure logic belongs in `src/lib/*` with tests beside it.

## Known traps

- New Firestore paths **must** be under `rooms/jo-and-friend/` unless rules change.
- Scrapbook is off-tree relative to committed rules.
- Gallery has a duplicate `id: "ram-timelapse"` (still + video).
- Together Todos is a shared Home checklist. A future shopping list should be a separate page, not a mutation of that widget.
- Pet `FaceRecipe` / `MOOD_RECIPES` in `src/lib/petAssets.ts` are sprite recipes, not cooking.
- README still says presentation settings are device-local; theme is shared.
