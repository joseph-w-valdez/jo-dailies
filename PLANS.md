# Cookbook and Shopping — plan

Feasibility review for a shared household cookbook and shopping list. Do not treat this as a generic recipe app.

Architecture: [CLAUDE.md](./CLAUDE.md). Cleanup that unblocks this: [REFACTOR.md](./REFACTOR.md).

**Do not start with the scanner or purchase suggestions.** Ship a recipe book with structured ingredients and a list you can edit.

## Goal

```
Find recipe → adjust (units / scale) → add to shopping list → cook → notes + history
```

Remember how you actually cook, not just the printed recipe.

## Constraints from the current app

- All new Firestore data goes under `rooms/{syncRoomId}/` (committed rules deny anything else).
- Per-user prefs: `rooms/{syncRoomId}/users/{uid}`, not top-level `users/`.
- Recipe images: Storage under the room (do not copy top-level `scrapbook/`).
- Together Todos stays a Home checklist. Shopping is its own page.
- No Cloud Functions today. OCR needs new infrastructure — postpone.
- Nav: add Cookbook + Shopping as flat links. Keep Watchlist on Home.

## Data model

### User prefs

```
rooms/{id}/users/{uid}          // { units: "us" | "metric", updatedAt }
rooms/{id}/users/{uid}/favorites/{recipeId}  // { createdAt }
```

Canonical ingredient amounts are metric (g / ml) plus `unitKind: "mass" | "volume" | "count"`. Convert only when displaying. Count units never convert and never become `0.45 onions`.

Also denormalize `favoriteUids: string[]` on the recipe so cards can show ❤️ / 💙 without extra fetches.

### Recipe (shared)

```
rooms/{id}/recipes/{recipeId}
```

```ts
type Recipe = {
  id: string
  title: string
  description?: string
  imageUrl?: string
  storagePath?: string
  cuisine: string
  mainIngredients: string[] // chicken, beef, pork, seafood, vegetarian, pasta, rice, …
  servings: number
  scalingIngredientId?: string
  difficulty?: 'easy' | 'medium' | 'hard'
  prepTime?: number
  cookTime?: number
  ingredients: Ingredient[]
  steps: string[]
  favoriteUids: string[]
  cookedCount: number
  lastCookedAt: number | null
  createdAt: number
  updatedAt: number
}

type Ingredient = {
  id: string
  name: string
  amount: number
  unit: string
  unitKind: 'mass' | 'volume' | 'count'
  scalable: boolean
}
```

Do **not** store `"1 lb chicken"` strings. Do **not** nest notes/history arrays on the recipe doc (1 MB cap). Denormalize `cookedCount` / `lastCookedAt` for list sort.

### Notes and cooks (subcollections)

```
rooms/{id}/recipes/{id}/notes/{noteId}
rooms/{id}/recipes/{id}/cooks/{logId}
```

```ts
type RecipeNote = {
  id: string
  authorId: string
  authorName: string
  text: string
  createdAt: number
}

type CookingLog = {
  id: string
  cookedBy: string
  date: number
  servings: number
  notes?: string
  rating?: 'love' | 'okay' | 'bad'
}
```

Notes = long-term improvements. Cooks = events (enables recently made / most cooked).

### Shopping (shared)

```
rooms/{id}/shoppingItems/{id}
rooms/{id}/shoppingHistory/{id}     // phase 5
rooms/{id}/shoppingStats/{nameKey}  // phase 5, optional rollup
```

```ts
type ShoppingItem = {
  id: string
  name: string
  quantity?: number
  unit?: string
  category: ShoppingCategory
  completed: boolean
  completedAt?: number
  addedBy: string
  source: 'manual' | 'recipe' | 'scanner'
  sourceRecipeId?: string
  createdAt: number
}

type ShoppingCategory =
  | 'meat'
  | 'produce'
  | 'pantry'
  | 'dairy'
  | 'frozen'
  | 'household'
  | 'pet'
  | 'personal'
  | 'other'
```

Default categories (labels in UI): Meat, Produce, Pantry, Dairy, Frozen, Household, Pet Supplies, Personal Care, Other. Users can recategorize; do not build a custom taxonomy editor in v1.

## Scaling

One source of truth: a **client-only multiplier** (default 1). Do not persist scaled amounts on the recipe.

- Servings slider → `multiplier = servings / recipe.servings`
- Main-ingredient field → `multiplier = entered / baseAmount`
- The other control is derived

`scalable: false` stays at base (salt, garnish). Persist scaled amounts only when adding to the shopping list or logging a cook.

Display rounding: integers for count; one decimal for small volumes; US fractions (½, ¼) only for cups/tbsp.

No volume ↔ mass conversion without densities. tbsp/ml is a display layer on ml (1 tbsp = 15 ml). lb ↔ g is the important mass path. Put this in `src/lib/units.ts` with tests.

## UI sketch

**Cookbook list:** cards with image, title, cuisine, main ingredient, both-favorite marks, last made. Filters: cuisine, main ingredient. Sort: newest, recently made, most cooked, name. Favorite filters: Joseph / Joha / Both.

**Viewer:** scaled ingredient list in the current user’s units, steps, notes, cook history, “Add ingredients”, “Cooked this”.

**Editor:** full page, not a modal. Ingredient rows with unit + scalable + optional “this is the scaling ingredient.” One optional photo; resize on the client before upload.

**Shopping:** grouped by category, tap to complete (done section at bottom), inline edit name/qty/category, delete with confirm. Shopping mode = larger taps, hide editor chrome.

**Recipe → list:** use the current scaled rows. Duplicate check = normalized name (trim, lower, collapse spaces). If an **open** item matches, skip — do not auto-sum quantities. Show added vs already-on-list.

## Feasibility

| Feature | Difficulty | Notes |
|---|---|---|
| Recipe CRUD + list + viewer | Easy | Same snapshot pattern as watch items |
| Recipe images | Easy | Copy scrapbook upload; room-scope the path |
| Favorites | Easy | User subcollection + `favoriteUids` on recipe |
| Unit conversion | Medium | Product rules, easy code; needs tests |
| Two-way scaling | Medium | All client-side; one multiplier |
| Notes | Easy | Subcollection |
| Cooking history | Easy | Subcollection + denormalize on recipe |
| Shopping list + edit + categories | Easy | Together Todos + categories |
| Recipe → shopping | Easy–medium | Duplicate skip, no qty merge in v1 |
| Shopping mode | Easy | Same page, denser taps |
| Handwritten scanner | Hard | Needs Cloud Functions + Vision/Gemini. No OCR in the app today |
| Purchase suggestions | Medium | Needs weeks of `completedAt` history first |

## Build order

### Phase 1 — unblock

- Nav: Cookbook + Shopping links, mobile wrap/overflow
- Generic confirm dialog
- `rooms/.../users/{uid}` prefs (`units`)
- Storage rules for room-prefixed recipe images

### Phase 2 — cookbook foundation (first shippable)

- Recipe CRUD, image, list, viewer
- Cuisine / main-ingredient filters, name/newest sort
- Ingredients displayed in the user’s units (scaling can wait one beat if needed)

### Phase 3 — smart cookbook

- Two-way scaling
- Favorites (Joseph / Joha / Both)
- Notes
- Cook log + recently made / most cooked

### Phase 4 — shopping

- Shared list, categories, edit, delete, complete
- Shopping mode
- Add-from-recipe

### Phase 5 — later

- Purchase history + suggestions (`count >= 3` and `daysSinceLast >= 0.7 * avgInterval`; never auto-add)
- Handwritten scanner (`source: "scanner"` reserved; confirmation UI required; never trust OCR blindly)

## Postpone / redesign vs the original handoff

**Postpone:** scanner, suggestions, nav grouping, shared Card/FilterBar kit, Watchlist-as-a-page, scrapbook migration (nice, not blocking).

**Locked simplifications:**

- One photo per recipe, optional
- No URL-import, no nutrition, no public/community recipes
- Fixed category enum + Other
- Author names from Google display first name
- Shopping quantity optional
- Do not convert count ingredients
- Do not auto-merge shopping quantities

**Watch-outs:**

- Keep history in subcollections
- Resize photos before upload
- Map the two UIDs to “Joseph” / “Joha” in one helper, not scattered strings
