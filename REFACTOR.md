# Refactor considerations

Do not turn this into a rewrite. Jo Dailies grew as a couple app: Home widgets and arcade games are large on purpose. Extract when a second copy appears, or when Cookbook/Shopping would otherwise copy a bad pattern.

Architecture facts live in [CLAUDE.md](./CLAUDE.md). Feature work lives in [PLANS.md](./PLANS.md).

## Done

- **Nav:** `src/nav.ts` (`NAV_LINKS`) is the single link list. Pill can wrap; indicator tracks `left/top/width/height`. Order is Home → Scrapbook → Arcade → Gallery. No empty Cookbook/Shopping routes yet.
- **ConfirmDialog:** `src/components/ConfirmDialog.tsx`. Scrapbook delete uses it. Arcade still uses `NewGameConfirm`.
- **Scrabble** new-game dialog wired to `NewGameConfirm`.
- **Player label:** `src/lib/playerLabel.ts` (`playerFirstName`) used by pet + Suika.
- **Scrapbook logs** removed. Paths unchanged (still top-level `scrapbook/`) — migrating would hide existing snapshots.
- **Storage rules:** [`storage.rules`](./storage.rules) + [`firebase.json`](./firebase.json). Additive: keeps `scrapbook/**`, adds `rooms/jo-and-friend/**`. Publish in the Firebase console; committing the file does not lock production by itself.
- **Gallery ids:** `ram` / `ram-timelapse` are already unique.
- **README:** theme is shared; Storage rules called out in setup.

## Still wait

### Scrapbook room-scope

Metadata is top-level `scrapbook/{id}`; files are `scrapbook/YYYY/MM/{id}.png`. Committed Firestore rules would deny the docs. Migrate to `rooms/{id}/scrapbook/{id}` + matching Storage paths **with a data move**, not a path-only code change. Do not copy the current layout for recipes.

### Media viewers

`GalleryViewer` and `ScrapbookViewer` share overlay chrome. A shared `MediaViewer` shell is reasonable **after** a third caller exists (recipe image zoom).

### Per-user docs

Rules already allow anything under `rooms/jo-and-friend/**`. First prefs should be:

```
rooms/{syncRoomId}/users/{uid}              // { units, … }
rooms/{syncRoomId}/users/{uid}/favorites/{recipeId}
```

Add the hook when Cookbook needs units/favorites — empty prefs code is not useful yet.

### Sign-out

`signOut` is implemented and unused. Fine until an account menu exists. Not a nav item.

### Inline Confirm / Cancel (button swap)

Watchlist, Together Todos, PetCare, Whiteboard, Jenga, Suika still use in-row confirm. Leave them; swapping those huge files to overlays is a UX change, not a safe drive-by.

## Do not do

- A `components/shared/` kit (Card, FilterBar, SortControl, UploadButton, Viewer) before Cookbook needs a second copy.
- Splitting Watchlist / Whiteboard / PetCare / Jenga / Suika / Scrabble “because they are big.” They are feature islands.
- Quote-style unification across the repo.
- Making Watchlist a route.
- Turning Together Todos into Shopping. Shopping is a page; todos stay a Home checklist.
- Nested nav IA.

## Large files (leave alone)

| File | Why it is large |
|---|---|
| `Jenga.tsx`, `CatSuika.tsx`, `CatScrabble.tsx`, `CatBattleship.tsx` | Scene + sync + chrome |
| `Watchlist.tsx` | List + dnd + Firestore in one component |
| `PetCare.tsx` | Kennel UI + furniture |
| `Whiteboard.tsx` | Tools + RTDB live + snapshot save |
| `StreakBar.tsx` | Theme, trail, Calcifer, streaks |
