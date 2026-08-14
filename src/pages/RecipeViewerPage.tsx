import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { CatWallpaper } from "../components/CatWallpaper";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { useFirebaseAuth } from "../hooks/firebaseAuthContext";
import { useRecipeCooks, useRecipeNotes } from "../hooks/useRecipeExtras";
import { useRecipes } from "../hooks/useRecipes";
import { useShopping } from "../hooks/useShopping";
import { useUserPrefs } from "../hooks/useUserPrefs";
import { householdName } from "../lib/household";
import { JENGA_PLAYER_UIDS } from "../lib/jenga";
import { playerFirstName } from "../lib/playerLabel";
import {
  COOK_TAGS,
  duplicateRecipe,
  formatCookStars,
  loadRecipeMultiplier,
  loadRecipeStepsDone,
  saveRecipeMultiplier,
  saveRecipeStepsDone,
} from "../lib/recipes";
import {
  formatDisplayAmount,
  fromCanonical,
  scaleAmount,
} from "../lib/units";
import { normalizeShoppingName } from "../lib/shopping";

function CookStarRow({
  value,
  onChange,
  size = "md",
}: {
  value: number;
  onChange?: (next: number) => void;
  size?: "md" | "lg";
}) {
  const interactive = typeof onChange === "function";
  const textSize = size === "lg" ? "text-4xl" : "text-base";
  const [hover, setHover] = useState<number | null>(null);
  const shown = hover ?? value;
  const starFill = (n: number) => {
    if (shown >= n) return 1;
    if (shown >= n - 0.5) return 0.5;
    return 0;
  };

  return (
    <div
      className={["flex items-center gap-0.5", textSize].join(" ")}
      role={interactive ? "group" : "img"}
      aria-label={`${value} out of 5 stars`}
      onMouseLeave={() => setHover(null)}
    >
      {[1, 2, 3, 4, 5].map((n) => {
        const fill = starFill(n);
        const previewing = hover != null;
        const star = (
          <span className="relative inline-block leading-none select-none">
            <span className="text-muted/35">★</span>
            {fill > 0 ? (
              <span
                aria-hidden
                className={[
                  "absolute inset-y-0 left-0 overflow-hidden",
                  previewing ? "text-amber-400" : "text-amber-500",
                ].join(" ")}
                style={{ width: `${fill * 100}%` }}
              >
                ★
              </span>
            ) : null}
          </span>
        );

        if (!interactive) {
          return (
            <span key={n} className="inline-flex">
              {star}
            </span>
          );
        }

        return (
          <span key={n} className="relative inline-flex">
            {star}
            <button
              type="button"
              className="absolute inset-y-0 left-0 z-10 w-1/2"
              aria-label={`${n - 0.5} stars`}
              onMouseEnter={() => setHover(n - 0.5)}
              onFocus={() => setHover(n - 0.5)}
              onClick={() => {
                onChange(value === n - 0.5 ? 0 : n - 0.5);
                setHover(null);
              }}
            />
            <button
              type="button"
              className="absolute inset-y-0 right-0 z-10 w-1/2"
              aria-label={`${n} stars`}
              onMouseEnter={() => setHover(n)}
              onFocus={() => setHover(n)}
              onClick={() => {
                onChange(value === n ? 0 : n);
                setHover(null);
              }}
            />
          </span>
        );
      })}
    </div>
  );
}

export function RecipeViewerPage() {
  const { recipeId } = useParams();
  const navigate = useNavigate();
  const { user } = useFirebaseAuth();
  const { recipes, ready, deleteRecipe, toggleFavorite, saveRecipe } =
    useRecipes();
  const { prefs, setUnits } = useUserPrefs();
  const { notes, addNote, removeNote } = useRecipeNotes(recipeId);
  const { cooks, logCook, removeCook } = useRecipeCooks(recipeId);
  const { items, addFromRecipe } = useShopping();

  const recipe = useMemo(
    () => recipes.find((r) => r.id === recipeId) ?? null,
    [recipes, recipeId],
  );

  const [multiplier, setMultiplier] = useState(1);
  const [scaleReady, setScaleReady] = useState(false);
  const [stepsDone, setStepsDone] = useState<Set<number>>(() => new Set());
  const skipStepsSaveRef = useRef(true);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [noteText, setNoteText] = useState("");
  const [cookNotes, setCookNotes] = useState("");
  const [cookStars, setCookStars] = useState(0);
  const [cookTags, setCookTags] = useState<string[]>([]);
  const [cookTagDraft, setCookTagDraft] = useState("");
  const [shopMessage, setShopMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!recipeId) return;
    const saved = loadRecipeMultiplier(recipeId);
    setMultiplier(saved ?? 1);
    setScaleReady(true);
    skipStepsSaveRef.current = true;
    setStepsDone(new Set(loadRecipeStepsDone(recipeId)));
  }, [recipeId]);

  useEffect(() => {
    if (!recipeId || !scaleReady) return;
    saveRecipeMultiplier(recipeId, multiplier);
  }, [multiplier, recipeId, scaleReady]);

  useEffect(() => {
    if (!recipeId) return;
    if (skipStepsSaveRef.current) {
      skipStepsSaveRef.current = false;
      return;
    }
    saveRecipeStepsDone(recipeId, [...stepsDone]);
  }, [stepsDone, recipeId]);

  const lastCook = cooks[0] ?? null;

  const scalingIng = recipe?.ingredients.find(
    (i) => i.id === recipe.scalingIngredientId,
  );

  const scaledServings = Math.max(
    1,
    Math.round((recipe?.servings ?? 1) * multiplier),
  );

  const displayRows = useMemo(() => {
    if (!recipe) return [];
    return recipe.ingredients.map((ing) => {
      const scaled = scaleAmount(ing.amount, ing.scalable, multiplier);
      const display = fromCanonical(
        scaled,
        ing.unitKind,
        prefs.units,
        ing.unit,
      );
      return {
        id: ing.id,
        name: ing.name,
        text: formatDisplayAmount(
          display.amount,
          display.unit,
          ing.unitKind,
          prefs.units,
        ),
        quantity: display.amount,
        unit: display.unit,
      };
    });
  }, [recipe, multiplier, prefs.units]);

  const openShoppingKeys = useMemo(
    () =>
      new Set(
        items
          .filter((i) => !i.completed)
          .map((i) => normalizeShoppingName(i.name)),
      ),
    [items],
  );

  if (!ready) {
    return (
      <>
        <CatWallpaper />
        <main className="relative z-10 mx-auto max-w-3xl p-6">
          <div className="rounded-2xl border border-border bg-surface-raised p-4 shadow-[0_20px_60px_-30px_rgba(0,0,0,0.8)] sm:p-5">
            <p className="text-muted">Loading…</p>
          </div>
        </main>
      </>
    );
  }

  if (!recipe) {
    return (
      <>
        <CatWallpaper />
        <main className="relative z-10 mx-auto max-w-3xl p-6">
          <div className="rounded-2xl border border-border bg-surface-raised p-4 shadow-[0_20px_60px_-30px_rgba(0,0,0,0.8)] sm:p-5">
            <p className="text-muted">Recipe not found.</p>
            <Link to="/cookbook" className="mt-2 inline-block text-sm text-white">
              Back to cookbook
            </Link>
          </div>
        </main>
      </>
    );
  }

  const josephUid = JENGA_PLAYER_UIDS[0]!;
  const johaUid = JENGA_PLAYER_UIDS[1]!;
  const uid = user?.uid ?? "";

  const setServingsScale = (servings: number) => {
    const base = Math.max(1, recipe.servings);
    setMultiplier(Math.max(0.1, servings / base));
  };

  const scaledMainDisplay = scalingIng
    ? fromCanonical(
        scaleAmount(scalingIng.amount, true, multiplier),
        scalingIng.unitKind,
        prefs.units,
        scalingIng.unit,
      )
    : null;

  const addIngredientToShopping = (row: {
    name: string;
    quantity: number;
    unit: string;
  }) => {
    setBusy(true);
    setShopMessage(null);
    void addFromRecipe(
      [{ name: row.name, quantity: row.quantity, unit: row.unit }],
      recipe.id,
    )
      .then(({ added, skipped }) => {
        if (added.length) setShopMessage(`Added ${row.name}`);
        else if (skipped.length) setShopMessage(`${row.name} already on list`);
        else setShopMessage("Nothing to add");
      })
      .finally(() => setBusy(false));
  };

  const missingShoppingRows = displayRows.filter(
    (row) => !openShoppingKeys.has(normalizeShoppingName(row.name)),
  );

  const addAllToShopping = () => {
    if (missingShoppingRows.length === 0) return;
    setBusy(true);
    setShopMessage(null);
    void addFromRecipe(
      missingShoppingRows.map((r) => ({
        name: r.name,
        quantity: r.quantity,
        unit: r.unit,
      })),
      recipe.id,
    )
      .then(({ added, skipped }) => {
        const parts: string[] = [];
        if (added.length) parts.push(`Added ${added.length}`);
        if (skipped.length) parts.push(`${skipped.length} already on list`);
        setShopMessage(parts.join(" · ") || "Nothing to add");
      })
      .finally(() => setBusy(false));
  };

  return (
    <>
      <CatWallpaper />
      <main className="relative z-10 mx-auto max-w-3xl p-6">
        <div className="rounded-2xl border border-border bg-surface-raised p-4 shadow-[0_20px_60px_-30px_rgba(0,0,0,0.8)] sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <Link
              to="/cookbook"
              className="text-xs text-muted hover:text-white"
            >
              ← Cookbook
            </Link>
            <h1 className="mt-1 text-2xl font-bold text-white">
              {recipe.title}
            </h1>
            <p className="mt-1 text-sm text-muted">
              {[
                recipe.cuisine,
                recipe.mainIngredients.join(", "),
                recipe.tags.join(", "),
                recipe.cookTime,
              ]
                .filter(Boolean)
                .join(" · ")}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <label className="flex items-center gap-1.5 text-xs text-muted">
              Units
              <select
                value={prefs.units}
                onChange={(e) =>
                  void setUnits(e.target.value === "metric" ? "metric" : "us")
                }
                className="rounded-md border border-border bg-surface px-1.5 py-1 text-xs text-white"
              >
                <option value="us">US</option>
                <option value="metric">Metric</option>
              </select>
            </label>
            <button
              type="button"
              disabled={!uid}
              onClick={() => void toggleFavorite(recipe, uid)}
              className="rounded-lg border border-border bg-surface px-2.5 py-1 text-xs text-white hover:border-muted disabled:opacity-40"
              title="Favorite"
            >
              {recipe.favoriteUids.includes(uid) ? "★ Favorited" : "☆ Favorite"}
            </button>
            <button
              type="button"
              onClick={() => {
                const copy = duplicateRecipe(recipe);
                void saveRecipe(copy).then(() =>
                  navigate(`/cookbook/${copy.id}/edit`),
                );
              }}
              className="rounded-lg border border-border bg-surface px-2.5 py-1 text-xs text-white hover:border-muted"
            >
              Duplicate
            </button>
            <Link
              to={`/cookbook/${recipe.id}/edit`}
              className="rounded-lg border border-border bg-surface px-2.5 py-1 text-xs text-white hover:border-muted"
            >
              Edit
            </Link>
            <button
              type="button"
              onClick={() => setDeleteOpen(true)}
              className="rounded-lg border border-rose-400/40 bg-rose-500/10 px-2.5 py-1 text-xs text-rose-100"
            >
              Delete
            </button>
          </div>
        </div>

        <div className="mt-2 flex gap-2 text-sm">
          {recipe.favoriteUids.includes(josephUid) ? (
            <span title="Joseph favorite">❤️ Joseph</span>
          ) : null}
          {recipe.favoriteUids.includes(johaUid) ? (
            <span title="Joha favorite">💙 Joha</span>
          ) : null}
        </div>

        {recipe.imageUrl ? (
          <img
            src={recipe.imageUrl}
            alt=""
            className="mt-4 max-h-72 w-full rounded-xl border border-border object-cover"
          />
        ) : null}

        {recipe.description ? (
          <p className="mt-4 text-sm text-muted">{recipe.description}</p>
        ) : null}

        <div className="mt-4 flex flex-wrap gap-4 rounded-xl border border-border bg-surface/60 p-3 text-sm">
          <label className="flex items-center gap-2 text-muted">
            Servings
            <input
              type="number"
              min={1}
              step={1}
              value={scaledServings}
              onChange={(e) => setServingsScale(Number(e.target.value) || 1)}
              className="w-20 rounded-md border border-border bg-surface px-2 py-1 text-white"
            />
          </label>
          {scalingIng && scaledMainDisplay ? (
            <label className="flex items-center gap-2 text-muted">
              {scalingIng.name}
              <input
                type="number"
                min={0.1}
                step="any"
                value={Number(scaledMainDisplay.amount.toFixed(2))}
                onChange={(e) => {
                  const displayAmt = Number(e.target.value);
                  if (!Number.isFinite(displayAmt)) return;
                  const baseDisp = fromCanonical(
                    scalingIng.amount,
                    scalingIng.unitKind,
                    prefs.units,
                    scalingIng.unit,
                  );
                  if (baseDisp.amount <= 0) return;
                  setMultiplier(Math.max(0.1, displayAmt / baseDisp.amount));
                }}
                className="w-24 rounded-md border border-border bg-surface px-2 py-1 text-white"
              />
              <span className="text-xs">{scaledMainDisplay.unit}</span>
            </label>
          ) : null}
          <button
            type="button"
            onClick={() => setMultiplier(1)}
            className="text-xs text-muted hover:text-white"
          >
            Reset scale
          </button>
          <span className="text-[10px] text-muted">Scale saved on this device</span>
        </div>

        <section className="mt-6">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">
            Ingredients
          </h2>
          <ul className="mt-2 space-y-1.5">
            {displayRows.map((row) => {
              const onList = openShoppingKeys.has(
                normalizeShoppingName(row.name),
              );
              return (
                <li
                  key={row.id}
                  className="flex items-center justify-between gap-3 rounded-lg border border-border/60 bg-surface/40 px-3 py-1.5 text-sm"
                >
                  <span className="min-w-0 flex-1 text-white">
                    {row.name}
                  </span>
                  <span className="shrink-0 tabular-nums text-muted">
                    {row.text}
                  </span>
                  <button
                    type="button"
                    disabled={busy || onList}
                    onClick={() => addIngredientToShopping(row)}
                    className="shrink-0 rounded-md border border-sky-500/55 bg-sky-500/20 px-2 py-0.5 text-[10px] font-medium text-app-text hover:bg-sky-500/30 disabled:opacity-40"
                  >
                    {onList ? "On list" : "Add"}
                  </button>
                </li>
              );
            })}
          </ul>
          <button
            type="button"
            disabled={busy || missingShoppingRows.length === 0}
            onClick={addAllToShopping}
            className="mt-3 w-full rounded-lg border border-sky-500/55 bg-sky-500/20 px-3 py-2 text-sm font-medium text-app-text hover:bg-sky-500/30 disabled:opacity-40"
          >
            {missingShoppingRows.length === 0
              ? "All on shopping list"
              : `Add all to list (${missingShoppingRows.length})`}
          </button>
          {shopMessage ? (
            <p className="mt-1.5 text-xs text-muted">
              {shopMessage}{" "}
              <Link to="/shopping" className="text-white underline">
                Open list
              </Link>
            </p>
          ) : null}
        </section>

        <section className="mt-6">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">
              Steps
            </h2>
            <button
              type="button"
              disabled={stepsDone.size === 0}
              onClick={() => setStepsDone(new Set())}
              className="text-xs text-muted hover:text-white disabled:opacity-30"
            >
              Reset
            </button>
          </div>
          <ol className="mt-2 list-decimal space-y-2 pl-5 text-sm text-white/90">
            {recipe.steps.map((step, i) => {
              const done = stepsDone.has(i);
              return (
                <li key={i}>
                  <button
                    type="button"
                    onClick={() =>
                      setStepsDone((prev) => {
                        let allThrough = true;
                        for (let j = 0; j <= i; j += 1) {
                          if (!prev.has(j)) {
                            allThrough = false;
                            break;
                          }
                        }
                        if (allThrough) {
                          const next = new Set<number>();
                          for (const idx of prev) {
                            if (idx < i) next.add(idx);
                          }
                          return next;
                        }
                        const next = new Set(prev);
                        for (let j = 0; j <= i; j += 1) next.add(j);
                        return next;
                      })
                    }
                    className={[
                      "w-full text-left transition",
                      done
                        ? "text-muted line-through decoration-muted/80"
                        : "text-white/90 hover:text-white",
                    ].join(" ")}
                  >
                    {step}
                  </button>
                </li>
              );
            })}
          </ol>
        </section>

        <section className="mt-6 rounded-xl border border-border bg-surface/50 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">
              Cooked this
            </h2>
            {lastCook ? (
              <button
                type="button"
                disabled={!uid || busy}
                onClick={() => {
                  setBusy(true);
                  void logCook({
                    cookedBy: uid,
                    servings: lastCook.servings,
                    tags: lastCook.tags,
                    stars: lastCook.stars ?? 0,
                    rating: lastCook.rating,
                  }).finally(() => setBusy(false));
                }}
                className="rounded-md border border-border px-2 py-1 text-[11px] text-white hover:border-muted disabled:opacity-40"
              >
                Cook again ({lastCook.servings} srv
                {lastCook.stars != null
                  ? `, ${formatCookStars(lastCook.stars)}`
                  : lastCook.tags.length
                    ? `, ${lastCook.tags.slice(0, 2).join(", ")}`
                    : ""}
                )
              </button>
            ) : null}
          </div>
          <p className="mt-1 text-xs text-muted">
            Logs {scaledServings} serving
            {scaledServings === 1 ? "" : "s"} at current scale.
          </p>
          <textarea
            value={cookNotes}
            onChange={(e) => setCookNotes(e.target.value)}
            placeholder="Optional note for this cook"
            rows={2}
            className="mt-2 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-white"
          />
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <CookStarRow
              value={cookStars}
              onChange={setCookStars}
              size="lg"
            />
            <span className="text-xs text-muted">{cookStars}/5</span>
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {COOK_TAGS.map((tag) => {
              const on = cookTags.some(
                (t) => t.toLowerCase() === tag.toLowerCase(),
              );
              return (
                <button
                  key={tag}
                  type="button"
                  onClick={() =>
                    setCookTags((prev) =>
                      on
                        ? prev.filter(
                            (t) => t.toLowerCase() !== tag.toLowerCase(),
                          )
                        : [...prev, tag],
                    )
                  }
                  className={[
                    "rounded-md border px-2 py-1 text-xs capitalize",
                    on
                      ? "border-golden/55 bg-golden/25 text-app-text"
                      : "border-border text-muted hover:text-white",
                  ].join(" ")}
                >
                  {tag}
                </button>
              );
            })}
            {cookTags
              .filter(
                (t) =>
                  !COOK_TAGS.some(
                    (p) => p.toLowerCase() === t.toLowerCase(),
                  ),
              )
              .map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() =>
                    setCookTags((prev) => prev.filter((t) => t !== tag))
                  }
                  title={`Remove "${tag}"`}
                  className="group inline-flex items-center gap-1 rounded-md border border-golden/55 bg-golden/25 px-2 py-1 text-xs text-app-text"
                >
                  <span>{tag}</span>
                  <span aria-hidden className="text-red-500">
                    ×
                  </span>
                </button>
              ))}
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <input
              type="text"
              value={cookTagDraft}
              onChange={(e) => setCookTagDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key !== "Enter") return;
                e.preventDefault();
                const t = cookTagDraft.trim();
                if (!t) return;
                setCookTags((prev) =>
                  prev.some((x) => x.toLowerCase() === t.toLowerCase())
                    ? prev
                    : [...prev, t],
                );
                setCookTagDraft("");
              }}
              placeholder="Custom tag…"
              className="min-w-[8rem] flex-1 rounded-md border border-border bg-surface px-2 py-1 text-xs text-white placeholder:text-muted/45 sm:max-w-[12rem] sm:flex-none"
            />
            <button
              type="button"
              disabled={!cookTagDraft.trim()}
              onClick={() => {
                const t = cookTagDraft.trim();
                if (!t) return;
                setCookTags((prev) =>
                  prev.some((x) => x.toLowerCase() === t.toLowerCase())
                    ? prev
                    : [...prev, t],
                );
                setCookTagDraft("");
              }}
              className="rounded-md border border-border bg-surface px-2 py-1 text-xs text-muted hover:text-white disabled:opacity-40"
            >
              Add
            </button>
          </div>
          <button
            type="button"
            disabled={!uid || busy}
            onClick={() => {
              setBusy(true);
              void logCook({
                cookedBy: uid,
                servings: scaledServings,
                notes: cookNotes || undefined,
                tags: cookTags,
                stars: cookStars,
              })
                .then(() => {
                  setCookNotes("");
                  setCookStars(0);
                  setCookTags([]);
                  setCookTagDraft("");
                })
                .finally(() => setBusy(false));
            }}
            className="mt-3 rounded-lg border border-emerald-500/55 bg-emerald-500/20 px-3 py-1.5 text-xs font-medium text-app-text hover:bg-emerald-500/30 disabled:opacity-40"
          >
            Log cook
          </button>
          <ul className="mt-3 space-y-2">
            {cooks.map((c) => (
              <li
                key={c.id}
                className="flex flex-wrap items-center gap-x-1 gap-y-1 text-xs text-muted"
              >
                <span className="min-w-0 flex-1">
                  <span className="text-white/80">
                    {householdName(c.cookedBy)}
                  </span>
                  <span> · </span>
                  <span>{new Date(c.date).toLocaleDateString()}</span>
                  <span> · </span>
                  <span>
                    {c.servings} serving{c.servings === 1 ? "" : "s"}
                  </span>
                  {c.stars != null ? (
                    <>
                      <span> · </span>
                      <span className="inline-flex items-center gap-1 align-middle">
                        <CookStarRow value={c.stars} size="md" />
                        <span>{c.stars}/5</span>
                      </span>
                    </>
                  ) : null}
                  {c.tags.length ? (
                    <>
                      <span> · </span>
                      <span>{c.tags.join(", ")}</span>
                    </>
                  ) : null}
                  {c.notes ? <span> — {c.notes}</span> : null}
                </span>
                <button
                  type="button"
                  title="Delete cook log"
                  disabled={busy}
                  onClick={() => {
                    setBusy(true);
                    void removeCook(c.id).finally(() => setBusy(false));
                  }}
                  className="shrink-0 px-1 text-lg font-bold leading-none text-red-500 hover:text-red-400 disabled:opacity-40"
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        </section>

        <section className="mt-6 rounded-xl border border-border bg-surface/50 p-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">
            Notes
          </h2>
          <div className="mt-2 flex gap-2">
            <input
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              placeholder="Long-term tip or tweak"
              className="min-w-0 flex-1 rounded-lg border border-border bg-surface px-3 py-2 text-sm text-white"
            />
            <button
              type="button"
              disabled={!uid || !noteText.trim()}
              onClick={() => {
                const name = playerFirstName(user?.displayName, user?.email);
                void addNote(noteText, uid, name).then(() => setNoteText(""));
              }}
              className="rounded-lg border border-border bg-surface px-3 py-2 text-xs text-white hover:border-muted disabled:opacity-40"
            >
              Add
            </button>
          </div>
          <ul className="mt-3 space-y-2">
            {notes.map((n) => (
              <li
                key={n.id}
                className="rounded-lg border border-border/50 bg-surface px-3 py-2 text-sm"
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="text-white/90">{n.text}</p>
                  {n.authorId === uid ? (
                    <button
                      type="button"
                      onClick={() => void removeNote(n.id)}
                      className="text-xs text-muted hover:text-rose-300"
                    >
                      Delete
                    </button>
                  ) : null}
                </div>
                <p className="mt-1 text-[11px] text-muted">
                  {n.authorName} · {new Date(n.createdAt).toLocaleDateString()}
                </p>
              </li>
            ))}
          </ul>
        </section>
        </div>
      </main>

      <ConfirmDialog
        open={deleteOpen}
        title="Delete recipe?"
        body="This removes the recipe and its photo for both of you. Notes and cook history go with it."
        confirmLabel="Delete"
        danger
        onClose={() => setDeleteOpen(false)}
        onConfirm={() => {
          void deleteRecipe(recipe).then(() => navigate("/cookbook"));
        }}
      />
    </>
  );
}
