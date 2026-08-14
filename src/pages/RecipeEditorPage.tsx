import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { CatWallpaper } from "../components/CatWallpaper";
import { useFirebaseAuth } from "../hooks/firebaseAuthContext";
import { useRecipes } from "../hooks/useRecipes";
import { useUserPrefs } from "../hooks/useUserPrefs";
import {
  COMMON_RECIPE_TAGS,
  createEmptyRecipe,
  CUISINE_TAGS,
  MAIN_INGREDIENT_TAGS,
  newIngredientId,
  parseRecipeIngredients,
  parseRecipeSteps,
  type Ingredient,
  type MainIngredientTag,
  type ParsedIngredientLine,
  type Recipe,
} from "../lib/recipes";
import {
  formatDisplayAmount,
  fromCanonical,
  toCanonical,
  type UnitKind,
  type UnitSystem,
} from "../lib/units";

type DraftIngredient = {
  id: string;
  name: string;
  amount: string;
  unit: string;
  unitKind: UnitKind;
  scalable: boolean;
};

function ingredientToDraft(
  ing: Ingredient,
  units: UnitSystem = "metric",
): DraftIngredient {
  const display = fromCanonical(ing.amount, ing.unitKind, units, ing.unit);
  return {
    id: ing.id,
    name: ing.name,
    amount: String(
      Number.isInteger(display.amount)
        ? display.amount
        : Number(display.amount.toFixed(2)),
    ),
    unit: display.unit,
    unitKind: ing.unitKind,
    scalable: ing.scalable,
  };
}

function draftToIngredient(d: DraftIngredient): Ingredient | null {
  const name = d.name.trim();
  if (!name) return null;
  const amountNum = Number(d.amount);
  if (!Number.isFinite(amountNum) || amountNum < 0) return null;
  const canon = toCanonical(amountNum, d.unit, d.unitKind);
  return {
    id: d.id || newIngredientId(),
    name,
    amount: canon.amount,
    unit: d.unitKind === "count" ? d.unit.trim() || "pc" : canon.unit,
    unitKind: d.unitKind,
    scalable: d.scalable,
  };
}

function formatDraftAmount(n: number): string {
  if (Number.isInteger(n)) return String(n);
  const rounded = Math.round(n * 1000) / 1000;
  return String(rounded);
}

function parsedToDraft(
  row: ParsedIngredientLine,
  units: UnitSystem,
): DraftIngredient {
  const canon = toCanonical(row.amount, row.unit, row.unitKind);
  const display = fromCanonical(
    canon.amount,
    row.unitKind,
    units,
    row.unitKind === "count" ? row.unit : canon.unit,
  );
  return {
    id: newIngredientId(),
    name: row.name,
    amount: formatDraftAmount(
      Number.isInteger(display.amount)
        ? display.amount
        : Number(display.amount.toFixed(2)),
    ),
    unit: display.unit,
    unitKind: row.unitKind,
    scalable: row.scalable,
  };
}

/** Serialize a draft back to a pasteable line for click-to-edit. */
function draftToLine(d: DraftIngredient, units: UnitSystem): string {
  const amountNum = Number(d.amount);
  const prefix = d.scalable ? "" : "Optional: ";
  if (!Number.isFinite(amountNum) || amountNum < 0) {
    return `${prefix}${d.name}`.trim();
  }
  const amt = formatDisplayAmount(amountNum, d.unit, d.unitKind, units);
  return `${prefix}${amt} ${d.name}`.trim();
}

export function RecipeEditorPage() {
  const { recipeId } = useParams();
  const isNew = !recipeId;
  const navigate = useNavigate();
  const { user } = useFirebaseAuth();
  const { prefs } = useUserPrefs();
  const { recipes, ready, saveRecipe, uploadRecipeImage, deleteRecipeImage } =
    useRecipes();

  const existing = useMemo(
    () => (isNew ? null : (recipes.find((r) => r.id === recipeId) ?? null)),
    [isNew, recipes, recipeId],
  );

  const [draftId] = useState(() => createEmptyRecipe().id);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [cuisine, setCuisine] = useState("");
  const [mainIngredients, setMainIngredients] = useState<MainIngredientTag[]>(
    [],
  );
  const [tags, setTags] = useState<string[]>([]);
  const [tagDraft, setTagDraft] = useState("");
  const [servings, setServings] = useState("");
  const [cookTime, setCookTime] = useState("");
  const [ingredients, setIngredients] = useState<DraftIngredient[]>([]);
  const [steps, setSteps] = useState<string[]>([]);
  const [stepsPasteText, setStepsPasteText] = useState("");
  const [stepsPasteMsg, setStepsPasteMsg] = useState<string | null>(null);
  const [ingsPasteText, setIngsPasteText] = useState("");
  const [ingsPasteMsg, setIngsPasteMsg] = useState<string | null>(null);
  const [editingIngIndex, setEditingIngIndex] = useState<number | null>(null);
  const [editIngText, setEditIngText] = useState("");
  const [editingStepIndex, setEditingStepIndex] = useState<number | null>(null);
  const [editStepText, setEditStepText] = useState("");
  const [imageUrl, setImageUrl] = useState<string | undefined>();
  const [storagePath, setStoragePath] = useState<string | undefined>();
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageCleared, setImageCleared] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(isNew);
  const photoInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isNew || !existing || hydrated) return;
    setTitle(existing.title);
    setDescription(existing.description ?? "");
    setCuisine(existing.cuisine);
    setMainIngredients(existing.mainIngredients);
    setTags(existing.tags ?? []);
    setServings(String(existing.servings));
    setCookTime(existing.cookTime ?? "");
    setIngredients(
      existing.ingredients.map((ing) => ingredientToDraft(ing, prefs.units)),
    );
    setSteps([...existing.steps]);
    setImageUrl(existing.imageUrl);
    setStoragePath(existing.storagePath);
    setImageFile(null);
    setImageCleared(false);
    setHydrated(true);
  }, [existing, hydrated, isNew, prefs.units]);

  useEffect(() => {
    if (!imageFile) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(imageFile);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [imageFile]);

  const toggleTag = (tag: MainIngredientTag) => {
    setMainIngredients((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag],
    );
  };

  const addManualTag = () => {
    const t = tagDraft.trim();
    if (!t) return;
    setTags((prev) =>
      prev.some((x) => x.toLowerCase() === t.toLowerCase())
        ? prev
        : [...prev, t],
    );
    setTagDraft("");
  };

  const toggleManualTag = (tag: string) => {
    setTags((prev) =>
      prev.some((x) => x.toLowerCase() === tag.toLowerCase())
        ? prev.filter((t) => t.toLowerCase() !== tag.toLowerCase())
        : [...prev, tag],
    );
  };

  const removeManualTag = (tag: string) => {
    setTags((prev) => prev.filter((t) => t !== tag));
  };

  const applyParsedSteps = (parsed: string[], atIndex: number | null) => {
    if (parsed.length === 0) return;
    setSteps((prev) => {
      if (atIndex == null) {
        return [...prev.filter((s) => s.trim()), ...parsed];
      }
      return [
        ...prev.slice(0, atIndex),
        ...parsed,
        ...prev.slice(atIndex + 1),
      ];
    });
  };

  const applyParsedIngredients = (
    parsed: ParsedIngredientLine[],
    atIndex: number | null,
  ) => {
    if (parsed.length === 0) return;
    const drafts = parsed.map((row) => parsedToDraft(row, prefs.units));
    setIngredients((prev) => {
      if (atIndex == null) {
        const kept = prev.filter((row) => row.name.trim());
        return [...kept, ...drafts];
      }
      const keepId = prev[atIndex]?.id;
      if (keepId && drafts[0]) drafts[0] = { ...drafts[0], id: keepId };
      return [
        ...prev.slice(0, atIndex),
        ...drafts,
        ...prev.slice(atIndex + 1),
      ];
    });
  };

  const submitIngsPaste = () => {
    const parsed = parseRecipeIngredients(ingsPasteText);
    if (parsed.length === 0) {
      setIngsPasteMsg("Nothing to parse");
      return;
    }
    applyParsedIngredients(parsed, null);
    setIngsPasteText("");
    setIngsPasteMsg(
      `Added ${parsed.length} ingredient${parsed.length === 1 ? "" : "s"}`,
    );
  };

  const submitStepsPaste = () => {
    const parsed = parseRecipeSteps(stepsPasteText);
    if (parsed.length === 0) {
      setStepsPasteMsg("Nothing to parse");
      return;
    }
    applyParsedSteps(parsed, null);
    setStepsPasteText("");
    setStepsPasteMsg(
      `Added ${parsed.length} step${parsed.length === 1 ? "" : "s"}`,
    );
  };

  const startEditIngredient = (index: number) => {
    const row = ingredients[index];
    if (!row) return;
    setEditingStepIndex(null);
    setEditingIngIndex(index);
    setEditIngText(draftToLine(row, prefs.units));
  };

  const commitEditIngredient = () => {
    if (editingIngIndex == null) return;
    const index = editingIngIndex;
    const parsed = parseRecipeIngredients(editIngText);
    if (parsed.length === 0) {
      setIngredients((prev) => prev.filter((_, i) => i !== index));
    } else {
      applyParsedIngredients(parsed, index);
    }
    setEditingIngIndex(null);
    setEditIngText("");
  };

  const startEditStep = (index: number) => {
    const step = steps[index];
    if (step == null) return;
    setEditingIngIndex(null);
    setEditingStepIndex(index);
    setEditStepText(step);
  };

  const commitEditStep = () => {
    if (editingStepIndex == null) return;
    const index = editingStepIndex;
    const parsed = parseRecipeSteps(editStepText);
    if (parsed.length === 0) {
      setSteps((prev) => prev.filter((_, i) => i !== index));
    } else {
      applyParsedSteps(parsed, index);
    }
    setEditingStepIndex(null);
    setEditStepText("");
  };

  const save = async () => {
    if (!user) return;
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      setError("Title is required");
      return;
    }
    const parsed = ingredients
      .map(draftToIngredient)
      .filter((i): i is Ingredient => i !== null);
    if (parsed.length === 0) {
      setError("Add at least one ingredient");
      return;
    }
    const cleanSteps = steps.map((s) => s.trim()).filter(Boolean);
    if (cleanSteps.length === 0) {
      setError("Add at least one step");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const base: Recipe = existing
        ? { ...existing }
        : { ...createEmptyRecipe(), id: draftId };

      let nextImageUrl = imageCleared ? undefined : imageUrl;
      let nextStoragePath = imageCleared ? undefined : storagePath;
      if (imageFile) {
        const uploaded = await uploadRecipeImage(base.id, imageFile);
        nextImageUrl = uploaded.imageUrl;
        nextStoragePath = uploaded.storagePath;
      } else if (imageCleared && storagePath) {
        await deleteRecipeImage(storagePath);
      }

      const recipe: Recipe = {
        ...base,
        title: trimmedTitle,
        cuisine: cuisine.trim(),
        mainIngredients,
        tags,
        servings: Math.max(1, Math.floor(Number(servings)) || 2),
        ingredients: parsed,
        steps: cleanSteps,
        favoriteUids: existing?.favoriteUids ?? [],
        cookedCount: existing?.cookedCount ?? 0,
        lastCookedAt: existing?.lastCookedAt ?? null,
        createdAt: existing?.createdAt ?? Date.now(),
        updatedAt: Date.now(),
      };

      if (description.trim()) recipe.description = description.trim();
      else delete recipe.description;
      delete recipe.difficulty;
      delete recipe.prepTime;
      if (cookTime.trim()) recipe.cookTime = cookTime.trim();
      else delete recipe.cookTime;
      if (
        recipe.scalingIngredientId &&
        !parsed.some((i) => i.id === recipe.scalingIngredientId)
      ) {
        delete recipe.scalingIngredientId;
      }
      if (nextImageUrl) recipe.imageUrl = nextImageUrl;
      else delete recipe.imageUrl;
      if (nextStoragePath) recipe.storagePath = nextStoragePath;
      else delete recipe.storagePath;

      await saveRecipe(recipe);
      navigate(`/cookbook/${recipe.id}`);
    } catch (err) {
      console.error(err);
      const msg =
        err instanceof Error && /image|read|encode|resize/i.test(err.message)
          ? "Could not upload photo — try a JPG or PNG"
          : "Could not save recipe";
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  if (!isNew && ready && !existing && hydrated === false) {
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

  if (!isNew && ready && !existing) {
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

  const shownImage = previewUrl ?? imageUrl;

  return (
    <>
      <CatWallpaper />
      <main className="relative z-10 mx-auto max-w-3xl p-6">
        <div className="rounded-2xl border border-border bg-surface-raised p-4 shadow-[0_20px_60px_-30px_rgba(0,0,0,0.8)] sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-bold text-white">
            {isNew ? "New recipe" : "Edit recipe"}
          </h1>
          <Link
            to={isNew ? "/cookbook" : `/cookbook/${recipeId}`}
            className="text-sm text-muted hover:text-white"
          >
            Cancel
          </Link>
        </div>

        <div className="mt-6 space-y-5">
          <label className="block space-y-1">
            <span className="text-xs font-semibold uppercase tracking-wide text-muted">
              Title{" "}
              <span className="font-normal normal-case tracking-normal opacity-80">
                (required)
              </span>
            </span>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-white"
            />
          </label>

          <label className="block space-y-1">
            <span className="text-xs font-semibold uppercase tracking-wide text-muted">
              Description
            </span>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-white"
            />
          </label>

          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">
              Cookbook photo
            </p>
            <p className="mt-1 text-[11px] text-muted">
              Shows as the recipe card thumbnail in the cookbook.
            </p>
            <input
              ref={photoInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0] ?? null;
                setImageFile(file);
                if (file) setImageCleared(false);
              }}
            />
            {shownImage ? (
              <div className="mt-2 overflow-hidden rounded-xl border border-border bg-surface/60">
                <img
                  src={shownImage}
                  alt=""
                  className="aspect-[4/3] w-full object-cover"
                />
                <div className="flex flex-wrap gap-2 border-t border-border p-2">
                  <button
                    type="button"
                    onClick={() => photoInputRef.current?.click()}
                    className="rounded-md border border-border bg-surface px-2.5 py-1 text-xs text-muted hover:text-white"
                  >
                    Replace
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setImageFile(null);
                      setImageUrl(undefined);
                      setImageCleared(true);
                      if (photoInputRef.current) photoInputRef.current.value = "";
                    }}
                    className="rounded-md border border-border bg-surface px-2.5 py-1 text-xs text-red-500 hover:text-red-400"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => photoInputRef.current?.click()}
                className="mt-2 flex aspect-[4/3] w-full flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-border bg-surface/40 text-sm text-muted hover:border-muted hover:text-white"
              >
                <span className="font-medium">Add photo</span>
                <span className="text-[11px]">JPG, PNG, or similar</span>
              </button>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-[1fr_8rem_10rem]">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                Cuisine
              </p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {CUISINE_TAGS.map((tag) => {
                  const on =
                    cuisine.trim().toLowerCase() === tag.toLowerCase();
                  return (
                    <button
                      key={tag}
                      type="button"
                      onClick={() =>
                        setCuisine((prev) =>
                          prev.trim().toLowerCase() === tag.toLowerCase()
                            ? ""
                            : tag,
                        )
                      }
                      className={[
                        "rounded-md border px-2 py-1 text-xs",
                        on
                          ? "border-golden/55 bg-golden/25 text-app-text"
                          : "border-border bg-surface text-muted hover:text-white",
                      ].join(" ")}
                    >
                      {tag}
                    </button>
                  );
                })}
                {cuisine.trim() &&
                !CUISINE_TAGS.some(
                  (t) => t.toLowerCase() === cuisine.trim().toLowerCase(),
                ) ? (
                  <button
                    type="button"
                    onClick={() => setCuisine("")}
                    className="rounded-md border border-golden/55 bg-golden/25 px-2 py-1 text-xs text-app-text"
                  >
                    {cuisine.trim()} ×
                  </button>
                ) : null}
              </div>
            </div>
            <label className="block space-y-1">
              <span className="text-xs font-semibold uppercase tracking-wide text-muted">
                Servings
              </span>
              <input
                type="number"
                min={1}
                value={servings}
                onChange={(e) => setServings(e.target.value)}
                placeholder="2"
                className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-white placeholder:text-muted/45"
              />
            </label>
            <label className="block space-y-1">
              <span className="text-xs font-semibold uppercase tracking-wide text-muted">
                Cook time
              </span>
              <input
                type="text"
                value={cookTime}
                onChange={(e) => setCookTime(e.target.value)}
                placeholder="45 min"
                className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-white placeholder:text-muted/45"
              />
            </label>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">
              Main ingredients
            </p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {MAIN_INGREDIENT_TAGS.map((tag) => {
                const on = mainIngredients.includes(tag);
                return (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => toggleTag(tag)}
                    className={[
                      "rounded-md border px-2 py-1 text-xs capitalize",
                      on
                        ? "border-golden/55 bg-golden/25 text-app-text"
                        : "border-border bg-surface text-muted hover:text-white",
                    ].join(" ")}
                  >
                    {tag}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">
              Ingredients{" "}
              <span className="font-normal normal-case tracking-normal opacity-80">
                (required)
              </span>
            </p>
            <div className="mt-2 space-y-2 rounded-xl border border-border bg-surface/60 p-3">
              <textarea
                value={ingsPasteText}
                onChange={(e) => setIngsPasteText(e.target.value)}
                rows={4}
                placeholder={"1 pork chop\n½ tsp salt\n1 tbsp butter"}
                className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-white"
              />
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  disabled={!ingsPasteText.trim()}
                  onClick={submitIngsPaste}
                  className="rounded-lg border border-emerald-500/55 bg-emerald-500/20 px-3 py-1.5 text-sm text-app-text disabled:opacity-40"
                >
                  Add
                </button>
                {ingsPasteMsg ? (
                  <span className="text-[11px] text-muted">{ingsPasteMsg}</span>
                ) : (
                  <span className="text-[11px] text-muted">
                    Paste lines, then Add. Click a row to edit (re-parses).
                  </span>
                )}
              </div>
            </div>
            {ingredients.length > 0 ? (
              <ul className="mt-2 space-y-1.5">
                {ingredients.map((ing, index) => (
                  <li key={ing.id}>
                    {editingIngIndex === index ? (
                      <div className="space-y-2 rounded-lg border border-golden/40 bg-surface/80 p-2">
                        <textarea
                          value={editIngText}
                          onChange={(e) => setEditIngText(e.target.value)}
                          rows={Math.min(
                            8,
                            Math.max(2, editIngText.split("\n").length + 1),
                          )}
                          autoFocus
                          className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-white"
                        />
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={commitEditIngredient}
                            className="rounded-md border border-emerald-500/55 bg-emerald-500/20 px-2.5 py-1 text-xs text-app-text"
                          >
                            Done
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setEditingIngIndex(null);
                              setEditIngText("");
                            }}
                            className="rounded-md border border-border bg-surface px-2.5 py-1 text-xs text-muted hover:text-white"
                          >
                            Cancel
                          </button>
                          <span className="self-center text-[11px] text-muted">
                            Extra lines insert here
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div className="group flex items-start gap-2 rounded-lg border border-border bg-surface/60 px-2 py-1.5">
                        <button
                          type="button"
                          onClick={() => startEditIngredient(index)}
                          className="min-w-0 flex-1 text-left text-sm text-white hover:underline"
                        >
                          {draftToLine(ing, prefs.units)}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setIngredients((prev) =>
                              prev.filter((_, i) => i !== index),
                            );
                          }}
                          className="shrink-0 px-1 text-2xl font-bold leading-none text-red-500 hover:text-red-400"
                          title="Remove"
                        >
                          ×
                        </button>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            ) : null}
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">
              Steps{" "}
              <span className="font-normal normal-case tracking-normal opacity-80">
                (required)
              </span>
            </p>
            <div className="mt-2 space-y-2 rounded-xl border border-border bg-surface/60 p-3">
              <textarea
                value={stepsPasteText}
                onChange={(e) => setStepsPasteText(e.target.value)}
                rows={4}
                placeholder={
                  "1. Preheat oven\n2. Mix dry ingredients\nBake until golden."
                }
                className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-white"
              />
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  disabled={!stepsPasteText.trim()}
                  onClick={submitStepsPaste}
                  className="rounded-lg border border-emerald-500/55 bg-emerald-500/20 px-3 py-1.5 text-sm text-app-text disabled:opacity-40"
                >
                  Add
                </button>
                {stepsPasteMsg ? (
                  <span className="text-[11px] text-muted">{stepsPasteMsg}</span>
                ) : (
                  <span className="text-[11px] text-muted">
                    Paste steps, then Add. Click a step to edit (re-parses).
                  </span>
                )}
              </div>
            </div>
            {steps.length > 0 ? (
              <ol className="mt-2 space-y-1.5">
                {steps.map((step, index) => (
                  <li key={`step-${index}`}>
                    {editingStepIndex === index ? (
                      <div className="space-y-2 rounded-lg border border-golden/40 bg-surface/80 p-2">
                        <textarea
                          value={editStepText}
                          onChange={(e) => setEditStepText(e.target.value)}
                          rows={Math.min(
                            8,
                            Math.max(2, editStepText.split("\n").length + 1),
                          )}
                          autoFocus
                          className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-white"
                        />
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={commitEditStep}
                            className="rounded-md border border-emerald-500/55 bg-emerald-500/20 px-2.5 py-1 text-xs text-app-text"
                          >
                            Done
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setEditingStepIndex(null);
                              setEditStepText("");
                            }}
                            className="rounded-md border border-border bg-surface px-2.5 py-1 text-xs text-muted hover:text-white"
                          >
                            Cancel
                          </button>
                          <span className="self-center text-[11px] text-muted">
                            Extra lines insert here
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div className="group flex items-start gap-2 rounded-lg border border-border bg-surface/60 px-2 py-1.5">
                        <span className="mt-0.5 w-5 shrink-0 text-xs text-muted">
                          {index + 1}.
                        </span>
                        <button
                          type="button"
                          onClick={() => startEditStep(index)}
                          className="min-w-0 flex-1 text-left text-sm text-white hover:underline"
                        >
                          {step}
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setSteps((prev) =>
                              prev.filter((_, i) => i !== index),
                            )
                          }
                          className="shrink-0 px-1 text-2xl font-bold leading-none text-red-500 hover:text-red-400"
                          title="Remove"
                        >
                          ×
                        </button>
                      </div>
                    )}
                  </li>
                ))}
              </ol>
            ) : null}
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">
              Tags
            </p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {COMMON_RECIPE_TAGS.map((tag) => {
                const on = tags.some(
                  (t) => t.toLowerCase() === tag.toLowerCase(),
                );
                return (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => toggleManualTag(tag)}
                    className={[
                      "rounded-md border px-2 py-1 text-xs",
                      on
                        ? "border-golden/55 bg-golden/25 text-app-text"
                        : "border-border bg-surface text-muted hover:text-white",
                    ].join(" ")}
                  >
                    {tag}
                  </button>
                );
              })}
              {tags
                .filter(
                  (t) =>
                    !COMMON_RECIPE_TAGS.some(
                      (c) => c.toLowerCase() === t.toLowerCase(),
                    ),
                )
                .map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => removeManualTag(tag)}
                    title={`Remove "${tag}"`}
                    className="group inline-flex items-center gap-1 rounded-md border border-golden/55 bg-golden/25 px-2 py-1 text-xs text-app-text"
                  >
                    <span>{tag}</span>
                    <span
                      aria-hidden
                      className="hidden w-2.5 group-hover:inline"
                    >
                      ×
                    </span>
                  </button>
                ))}
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              <input
                type="text"
                value={tagDraft}
                onChange={(e) => setTagDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addManualTag();
                  }
                }}
                placeholder="Custom tag…"
                className="min-w-[8rem] flex-1 rounded-md border border-border bg-surface px-2 py-1 text-xs text-white placeholder:text-muted/45 sm:max-w-[12rem] sm:flex-none"
              />
              <button
                type="button"
                onClick={addManualTag}
                disabled={!tagDraft.trim()}
                className="rounded-md border border-border bg-surface px-2 py-1 text-xs text-muted hover:text-white disabled:opacity-40"
              >
                Add
              </button>
            </div>
          </div>

          {error ? <p className="text-sm text-rose-300">{error}</p> : null}

          <button
            type="button"
            disabled={saving}
            onClick={() => void save()}
            className="rounded-lg border border-emerald-500/55 bg-emerald-500/20 px-4 py-2 text-sm font-medium text-app-text hover:bg-emerald-500/30 disabled:opacity-40"
          >
            {saving ? "Saving…" : "Save recipe"}
          </button>
        </div>
        </div>
      </main>
    </>
  );
}
