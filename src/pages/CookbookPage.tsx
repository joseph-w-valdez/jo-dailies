import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { CatWallpaper } from "../components/CatWallpaper";
import { useRecipes } from "../hooks/useRecipes";
import { useShopping } from "../hooks/useShopping";
import { useUserPrefs } from "../hooks/useUserPrefs";
import { JENGA_PLAYER_UIDS } from "../lib/jenga";
import {
  MAIN_INGREDIENT_TAGS,
  CUISINE_TAGS,
  sortRecipes,
  type FavoriteFilter,
  type MainIngredientTag,
  type Recipe,
  type RecipeSort,
} from "../lib/recipes";
import {
  formatDisplayAmount,
  fromCanonical,
  scaleAmount,
} from "../lib/units";

function formatLastMade(ts: number | null): string {
  if (!ts) return "Never cooked";
  return `Last made ${new Date(ts).toLocaleDateString()}`;
}

export function CookbookPage() {
  const { recipes, ready } = useRecipes();
  const { prefs, setUnits } = useUserPrefs();
  const { addFromRecipe } = useShopping();
  const [cuisine, setCuisine] = useState("");
  const [mainTag, setMainTag] = useState<MainIngredientTag | "">("");
  const [sort, setSort] = useState<RecipeSort>("newest");
  const [favoriteFilter, setFavoriteFilter] = useState<FavoriteFilter>("all");
  const [search, setSearch] = useState("");
  const [planMode, setPlanMode] = useState(false);
  const [planIds, setPlanIds] = useState<Set<string>>(new Set());
  const [planMsg, setPlanMsg] = useState<string | null>(null);
  const [planBusy, setPlanBusy] = useState(false);

  const cuisines = useMemo(() => {
    const set = new Set<string>([...CUISINE_TAGS]);
    for (const r of recipes) {
      const c = r.cuisine.trim();
      if (c) set.add(c);
    }
    return [...set].sort((a, b) => a.localeCompare(b));
  }, [recipes]);

  const josephUid = JENGA_PLAYER_UIDS[0]!;
  const johaUid = JENGA_PLAYER_UIDS[1]!;

  const filtered = useMemo(() => {
    let list = recipes;
    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter((r) => {
        if (r.title.toLowerCase().includes(q)) return true;
        if (r.cuisine.toLowerCase().includes(q)) return true;
        if ((r.tags ?? []).some((t) => t.toLowerCase().includes(q))) return true;
        if (
          r.mainIngredients.some((t) => t.toLowerCase().includes(q))
        ) {
          return true;
        }
        return r.ingredients.some((ing) =>
          ing.name.toLowerCase().includes(q),
        );
      });
    }
    if (cuisine) {
      list = list.filter(
        (r) => r.cuisine.trim().toLowerCase() === cuisine.toLowerCase(),
      );
    }
    if (mainTag) {
      list = list.filter((r) => r.mainIngredients.includes(mainTag));
    }
    if (favoriteFilter === "joseph") {
      list = list.filter((r) => r.favoriteUids.includes(josephUid));
    } else if (favoriteFilter === "joha") {
      list = list.filter((r) => r.favoriteUids.includes(johaUid));
    } else if (favoriteFilter === "both") {
      list = list.filter(
        (r) =>
          r.favoriteUids.includes(josephUid) &&
          r.favoriteUids.includes(johaUid),
      );
    }
    return sortRecipes(list, sort);
  }, [
    recipes,
    search,
    cuisine,
    mainTag,
    sort,
    favoriteFilter,
    josephUid,
    johaUid,
  ]);

  const togglePlan = (id: string) => {
    setPlanIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else if (next.size < 3) next.add(id);
      return next;
    });
  };

  const rowsForRecipe = (recipe: Recipe) =>
    recipe.ingredients.map((ing) => {
      const scaled = scaleAmount(ing.amount, ing.scalable, 1);
      const display = fromCanonical(
        scaled,
        ing.unitKind,
        prefs.units,
        ing.unit,
      );
      return {
        name: ing.name,
        quantity: display.amount,
        unit: display.unit,
        text: formatDisplayAmount(
          display.amount,
          display.unit,
          ing.unitKind,
          prefs.units,
        ),
      };
    });

  const addPlanToShopping = async () => {
    const selected = recipes.filter((r) => planIds.has(r.id));
    if (selected.length === 0) return;
    setPlanBusy(true);
    setPlanMsg(null);
    try {
      let added = 0;
      let skipped = 0;
      for (const recipe of selected) {
        const result = await addFromRecipe(
          rowsForRecipe(recipe),
          recipe.id,
        );
        added += result.added.length;
        skipped += result.skipped.length;
      }
      const parts = [`Added ${added}`];
      if (skipped) parts.push(`${skipped} already on list`);
      setPlanMsg(parts.join(" · "));
      setPlanIds(new Set());
      setPlanMode(false);
    } finally {
      setPlanBusy(false);
    }
  };

  return (
    <>
      <CatWallpaper />
      <main className="relative z-10 mx-auto max-w-7xl p-6">
        <div className="rounded-2xl border border-border bg-surface-raised p-4 shadow-[0_20px_60px_-30px_rgba(0,0,0,0.8)] sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-white">Cookbook</h1>
            <p className="mt-1 text-xs text-muted">
              Shared between both of you
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <label className="flex items-center gap-2 text-sm text-muted">
              Units
              <select
                value={prefs.units}
                onChange={(e) =>
                  void setUnits(e.target.value === "metric" ? "metric" : "us")
                }
                className="rounded-md border border-border bg-surface px-2 py-1 text-sm text-white"
              >
                <option value="us">US</option>
                <option value="metric">Metric</option>
              </select>
            </label>
            <button
              type="button"
              onClick={() => {
                setPlanMode((v) => !v);
                setPlanIds(new Set());
                setPlanMsg(null);
              }}
              className={[
                "rounded-lg border px-3 py-1.5 text-sm",
                planMode
                  ? "border-sky-500/55 bg-sky-500/20 text-app-text"
                  : "border-border bg-surface text-white hover:border-muted",
              ].join(" ")}
            >
              {planMode ? "Cancel plan" : "Week plan"}
            </button>
            <Link
              to="/cookbook/new"
              className="rounded-lg border border-emerald-500/55 bg-emerald-500/20 px-3 py-1.5 text-sm font-medium text-app-text hover:bg-emerald-500/30"
            >
              New recipe
            </Link>
          </div>
        </div>

        {planMode ? (
          <div className="mt-3 flex flex-wrap items-center gap-2 rounded-xl border border-sky-500/30 bg-sky-500/10 px-3 py-2 text-sm">
            <span className="text-muted">
              Pick up to 3 recipes, then add their ingredients to shopping.
            </span>
            <span className="font-medium text-white">
              {planIds.size}/3 selected
            </span>
            <button
              type="button"
              disabled={planIds.size === 0 || planBusy}
              onClick={() => void addPlanToShopping()}
              className="rounded-lg border border-emerald-500/55 bg-emerald-500/20 px-3 py-1 text-xs font-medium text-app-text disabled:opacity-40"
            >
              {planBusy ? "Adding…" : "Add to shopping"}
            </button>
          </div>
        ) : null}
        {planMsg ? (
          <p className="mt-2 text-xs text-muted">
            {planMsg}{" "}
            <Link to="/shopping" className="text-white underline">
              Open shopping
            </Link>
          </p>
        ) : null}

        <div className="mt-4 space-y-3 text-sm text-muted">
          <div className="flex flex-wrap items-center gap-3">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search title, tags, or ingredient…"
              className="min-w-[12rem] flex-1 rounded-md border border-border bg-surface px-2 py-1 text-white sm:max-w-xs"
            />
            <label className="flex items-center gap-2">
              Main
              <select
                value={mainTag}
                onChange={(e) =>
                  setMainTag(e.target.value as MainIngredientTag | "")
                }
                className="rounded-md border border-border bg-surface px-2 py-1 text-white"
              >
                <option value="">All</option>
                {MAIN_INGREDIENT_TAGS.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex items-center gap-2">
              Favorites
              <select
                value={favoriteFilter}
                onChange={(e) =>
                  setFavoriteFilter(e.target.value as FavoriteFilter)
                }
                className="rounded-md border border-border bg-surface px-2 py-1 text-white"
              >
                <option value="all">All</option>
                <option value="joseph">Joseph</option>
                <option value="joha">Joha</option>
                <option value="both">Both</option>
              </select>
            </label>
            <label className="flex items-center gap-2">
              Sort
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value as RecipeSort)}
                className="rounded-md border border-border bg-surface px-2 py-1 text-white"
              >
                <option value="newest">Newest</option>
                <option value="name">Name</option>
                <option value="recentlyMade">Recently made</option>
                <option value="mostCooked">Most cooked</option>
              </select>
            </label>
          </div>
          <div>
            <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted">
              Cuisine
            </p>
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => setCuisine("")}
                className={[
                  "rounded-md border px-2 py-1 text-xs",
                  !cuisine
                    ? "border-golden/55 bg-golden/25 text-app-text"
                    : "border-border bg-surface text-muted hover:text-white",
                ].join(" ")}
              >
                All
              </button>
              {cuisines.map((c) => {
                const on = cuisine.toLowerCase() === c.toLowerCase();
                return (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setCuisine(on ? "" : c)}
                    className={[
                      "rounded-md border px-2 py-1 text-xs",
                      on
                        ? "border-golden/55 bg-golden/25 text-app-text"
                        : "border-border bg-surface text-muted hover:text-white",
                    ].join(" ")}
                  >
                    {c}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {!ready ? (
          <p className="mt-6 text-muted">Loading recipes…</p>
        ) : filtered.length === 0 ? (
          <div className="mt-6 space-y-2">
            <p className="text-muted">
              {recipes.length === 0
                ? "No recipes yet — this book is shared for both of you."
                : "No recipes match those filters."}
            </p>
            {recipes.length === 0 ? (
              <Link
                to="/cookbook/new"
                className="inline-flex rounded-lg border border-emerald-500/55 bg-emerald-500/20 px-3 py-1.5 text-sm font-medium text-app-text"
              >
                Add your first recipe
              </Link>
            ) : null}
          </div>
        ) : (
          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filtered.map((recipe) => {
              const selected = planIds.has(recipe.id);
              const card = (
                <>
                  <div className="aspect-[4/3] overflow-hidden bg-black/30">
                    {recipe.imageUrl ? (
                      <img
                        src={recipe.imageUrl}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-sm text-muted">
                        No photo
                      </div>
                    )}
                  </div>
                  <div className="space-y-1 p-3">
                    <div className="flex items-start justify-between gap-2">
                      <h2 className="font-semibold text-white">
                        {planMode && selected ? "✓ " : ""}
                        {recipe.title}
                      </h2>
                      <span className="shrink-0 text-xs">
                        {recipe.favoriteUids.includes(josephUid) ? "❤️" : ""}
                        {recipe.favoriteUids.includes(johaUid) ? "💙" : ""}
                      </span>
                    </div>
                    <p className="text-xs text-muted">
                      {[
                        recipe.cuisine,
                        recipe.mainIngredients.join(", "),
                        recipe.tags.join(", "),
                      ]
                        .filter(Boolean)
                        .join(" · ") || "—"}
                    </p>
                    <p className="text-[11px] text-muted">
                      {formatLastMade(recipe.lastCookedAt)}
                      {recipe.cookedCount > 0
                        ? ` · cooked ${recipe.cookedCount}×`
                        : ""}
                    </p>
                  </div>
                </>
              );

              if (planMode) {
                return (
                  <button
                    key={recipe.id}
                    type="button"
                    onClick={() => togglePlan(recipe.id)}
                    className={[
                      "overflow-hidden rounded-xl border bg-surface text-left transition",
                      selected
                        ? "border-sky-400/60 ring-2 ring-sky-400/40"
                        : "border-border hover:border-white/20",
                    ].join(" ")}
                  >
                    {card}
                  </button>
                );
              }

              return (
                <Link
                  key={recipe.id}
                  to={`/cookbook/${recipe.id}`}
                  className="block overflow-hidden rounded-xl border border-border bg-surface text-left transition hover:-translate-y-0.5 hover:border-white/20 hover:shadow-lg"
                >
                  {card}
                </Link>
              );
            })}
          </div>
        )}
        </div>
      </main>
    </>
  );
}
