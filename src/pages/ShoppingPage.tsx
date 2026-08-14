import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { CatWallpaper } from "../components/CatWallpaper";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { useFirebaseAuth } from "../hooks/firebaseAuthContext";
import { useShopping } from "../hooks/useShopping";
import { householdName } from "../lib/household";
import { parsePastedShoppingLines } from "../lib/pantry";
import { playerFirstName } from "../lib/playerLabel";
import {
  SHOPPING_CATEGORIES,
  SHOPPING_CATEGORY_LABELS,
  type ShoppingCategory,
  type ShoppingItem,
} from "../lib/shopping";

function formatQty(item: ShoppingItem): string {
  if (item.quantity == null) return "";
  const n =
    item.quantity >= 10
      ? String(Math.round(item.quantity))
      : String(Number(item.quantity.toFixed(2)));
  return item.unit ? `${n} ${item.unit}` : n;
}

export function ShoppingPage() {
  const { user } = useFirebaseAuth();
  const {
    ready,
    grouped,
    frequentChips,
    addManual,
    addParsedLines,
    toggleComplete,
    togglePin,
    updateItem,
    removeItem,
    clearDone,
  } = useShopping();

  const listOwnerLabel =
    householdName(user?.uid) !== "Friend"
      ? householdName(user?.uid)
      : playerFirstName(user?.displayName, user?.email);

  const [shoppingMode, setShoppingMode] = useState(false);
  const [name, setName] = useState("");
  const [qty, setQty] = useState("");
  const [unit, setUnit] = useState("");
  const [category, setCategory] = useState<ShoppingCategory>("other");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editQty, setEditQty] = useState("");
  const [editUnit, setEditUnit] = useState("");
  const [editCategory, setEditCategory] = useState<ShoppingCategory>("other");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [clearDoneOpen, setClearDoneOpen] = useState(false);
  const [pasteOpen, setPasteOpen] = useState(false);
  const [pasteText, setPasteText] = useState("");
  const [pasteMsg, setPasteMsg] = useState<string | null>(null);

  const openCount = useMemo(
    () =>
      grouped.pinned.length +
      SHOPPING_CATEGORIES.reduce((n, c) => n + grouped.open[c].length, 0),
    [grouped],
  );

  const startEdit = (item: ShoppingItem) => {
    setEditingId(item.id);
    setEditName(item.name);
    setEditQty(item.quantity != null ? String(item.quantity) : "");
    setEditUnit(item.unit ?? "");
    setEditCategory(item.category);
  };

  const saveEdit = () => {
    if (!editingId) return;
    const quantity = Number(editQty);
    void updateItem(editingId, {
      name: editName,
      quantity: Number.isFinite(quantity) && quantity > 0 ? quantity : undefined,
      unit: editUnit,
      category: editCategory,
    });
    setEditingId(null);
  };

  const submitAdd = () => {
    const quantity = Number(qty);
    void addManual({
      name,
      quantity: Number.isFinite(quantity) && quantity > 0 ? quantity : undefined,
      unit: unit || undefined,
      category,
    }).then(() => {
      setName("");
      setQty("");
      setUnit("");
      setCategory("other");
    });
  };

  const submitPaste = () => {
    const lines = parsePastedShoppingLines(pasteText);
    void addParsedLines(lines).then(({ added, skipped }) => {
      const parts: string[] = [];
      if (added.length) parts.push(`Added ${added.length}`);
      if (skipped.length) parts.push(`${skipped.length} already on list`);
      setPasteMsg(parts.join(" · ") || "Nothing to add");
      setPasteText("");
      setPasteOpen(false);
    });
  };

  const tapClass = shoppingMode ? "min-h-12 text-base" : "min-h-9 text-sm";

  const renderItem = (item: ShoppingItem) => (
    <li
      key={item.id}
      className={["rounded-lg border border-border bg-surface/70", tapClass].join(
        " ",
      )}
    >
      {editingId === item.id && !shoppingMode ? (
        <div className="flex flex-wrap gap-2 p-2">
          <input
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            className="min-w-[8rem] flex-1 rounded-md border border-border bg-surface px-2 py-1 text-sm text-white"
          />
          <input
            value={editQty}
            onChange={(e) => setEditQty(e.target.value)}
            placeholder="Qty"
            className="w-16 rounded-md border border-border bg-surface px-2 py-1 text-sm text-white"
          />
          <input
            value={editUnit}
            onChange={(e) => setEditUnit(e.target.value)}
            placeholder="Unit"
            className="w-16 rounded-md border border-border bg-surface px-2 py-1 text-sm text-white"
          />
          <select
            value={editCategory}
            onChange={(e) =>
              setEditCategory(e.target.value as ShoppingCategory)
            }
            className="rounded-md border border-border bg-surface px-2 py-1 text-sm text-white"
          >
            {SHOPPING_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {SHOPPING_CATEGORY_LABELS[c]}
              </option>
            ))}
          </select>
          <button type="button" onClick={saveEdit} className="text-xs text-emerald-300">
            Save
          </button>
          <button
            type="button"
            onClick={() => setEditingId(null)}
            className="text-xs text-muted"
          >
            Cancel
          </button>
        </div>
      ) : (
        <div className="flex items-stretch gap-1">
          <button
            type="button"
            onClick={() => void toggleComplete(item.id)}
            className={["flex min-w-0 flex-1 items-center gap-3 px-3 text-left", tapClass].join(
              " ",
            )}
          >
            <span
              className={[
                "flex shrink-0 items-center justify-center rounded border border-border",
                shoppingMode ? "h-7 w-7" : "h-5 w-5",
              ].join(" ")}
              aria-hidden
            />
              <span className="min-w-0 flex-1">
                <span className="block font-medium text-white">
                  {item.pinned ? "📌 " : ""}
                  {item.name}
                </span>
                {formatQty(item) ? (
                  <span className="text-xs text-muted">{formatQty(item)}</span>
                ) : null}
              </span>
          </button>
          {!shoppingMode ? (
            <div className="flex shrink-0 items-center gap-0.5 pr-1">
              <select
                aria-label="Category"
                value={item.category}
                onChange={(e) =>
                  void updateItem(item.id, {
                    category: e.target.value as ShoppingCategory,
                  })
                }
                className="max-w-[6.5rem] rounded border border-border bg-surface px-1 py-0.5 text-[10px] text-muted"
              >
                {SHOPPING_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {SHOPPING_CATEGORY_LABELS[c]}
                  </option>
                ))}
              </select>
              <button
                type="button"
                title={item.pinned ? "Unpin" : "Pin buy soon"}
                onClick={() => void togglePin(item.id)}
                className="px-1.5 text-xs text-muted hover:text-white"
              >
                {item.pinned ? "Unpin" : "Pin"}
              </button>
              <button
                type="button"
                onClick={() => startEdit(item)}
                className="px-1.5 text-xs text-muted hover:text-white"
              >
                Edit
              </button>
              <button
                type="button"
                onClick={() => setDeleteId(item.id)}
                className="px-1.5 text-xs text-rose-300/80 hover:text-rose-200"
              >
                Delete
              </button>
            </div>
          ) : null}
        </div>
      )}
    </li>
  );

  return (
    <>
      <CatWallpaper />
      <main className="relative z-10 mx-auto max-w-3xl p-6">
        <div className="rounded-2xl border border-border bg-surface-raised p-4 shadow-[0_20px_60px_-30px_rgba(0,0,0,0.8)] sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-white">Shopping</h1>
            <p className="mt-1 text-sm text-muted">
              {listOwnerLabel}&apos;s private list · {openCount} open ·{" "}
              {grouped.done.length} done
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setPasteOpen((v) => !v)}
              className="rounded-lg border border-border bg-surface px-3 py-1.5 text-sm text-white hover:border-muted"
            >
              Paste list
            </button>
            <button
              type="button"
              onClick={() => setShoppingMode((v) => !v)}
              className={[
                "rounded-lg border px-3 py-1.5 text-sm font-medium",
                shoppingMode
                  ? "border-golden/55 bg-golden/25 text-app-text"
                  : "border-border bg-surface text-white hover:border-muted",
              ].join(" ")}
            >
              {shoppingMode ? "Shopping mode on" : "Shopping mode"}
            </button>
          </div>
        </div>

        {pasteMsg ? (
          <p className="mt-2 text-xs text-muted">{pasteMsg}</p>
        ) : null}

        {pasteOpen && !shoppingMode ? (
          <div className="mt-3 space-y-2 rounded-xl border border-border bg-surface/60 p-3">
            <p className="text-xs text-muted">
              Paste one item per line (or commas). Review happens when you add —
              duplicates already on the list are skipped.
            </p>
            <textarea
              value={pasteText}
              onChange={(e) => setPasteText(e.target.value)}
              rows={5}
              placeholder={"milk\neggs\n2 lb chicken"}
              className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-white"
            />
            <div className="flex gap-2">
              <button
                type="button"
                disabled={!pasteText.trim()}
                onClick={submitPaste}
                className="rounded-lg border border-emerald-500/55 bg-emerald-500/20 px-3 py-1.5 text-sm text-app-text disabled:opacity-40"
              >
                Add lines
              </button>
              <button
                type="button"
                onClick={() => setPasteOpen(false)}
                className="text-sm text-muted hover:text-white"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : null}

        {!shoppingMode ? (
          <div className="mt-4 flex flex-wrap gap-2 rounded-xl border border-border bg-surface/60 p-3">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Item name"
              className="min-w-[10rem] flex-1 rounded-lg border border-border bg-surface px-3 py-2 text-sm text-white"
              onKeyDown={(e) => {
                if (e.key === "Enter") submitAdd();
              }}
            />
            <input
              value={qty}
              onChange={(e) => setQty(e.target.value)}
              placeholder="Qty"
              className="w-20 rounded-lg border border-border bg-surface px-2 py-2 text-sm text-white"
            />
            <input
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
              placeholder="Unit"
              className="w-20 rounded-lg border border-border bg-surface px-2 py-2 text-sm text-white"
            />
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as ShoppingCategory)}
              className="rounded-lg border border-border bg-surface px-2 py-2 text-sm text-white"
            >
              {SHOPPING_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {SHOPPING_CATEGORY_LABELS[c]}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={submitAdd}
              disabled={!name.trim()}
              className="rounded-lg border border-emerald-500/55 bg-emerald-500/20 px-3 py-2 text-sm font-medium text-app-text hover:bg-emerald-500/30 disabled:opacity-40"
            >
              Add
            </button>
          </div>
        ) : null}

        {!shoppingMode && frequentChips.length > 0 ? (
          <div className="mt-3 flex flex-wrap gap-1.5">
            <span className="w-full text-[10px] font-semibold uppercase tracking-wide text-muted">
              Frequent
            </span>
            {frequentChips.map((chip) => (
              <button
                key={chip.nameKey}
                type="button"
                onClick={() => void addManual({ name: chip.name })}
                className="rounded-full border border-border bg-surface px-2.5 py-1 text-xs text-white hover:border-muted"
              >
                + {chip.name}
              </button>
            ))}
          </div>
        ) : null}

        {!ready ? (
          <p className="mt-6 text-muted">Loading list…</p>
        ) : openCount === 0 && grouped.done.length === 0 ? (
          <div className="mt-6 space-y-2">
            <p className="text-muted">Your private list is empty.</p>
            <p className="text-sm text-muted">
              Only you can see this list. Add something above,{" "}
              <button
                type="button"
                className="text-white underline"
                onClick={() => setPasteOpen(true)}
              >
                paste a list
              </button>
              , or{" "}
              <Link to="/cookbook" className="text-white underline">
                pull ingredients from a recipe
              </Link>
              .
            </p>
          </div>
        ) : (
          <div className="mt-6 space-y-5">
            {grouped.pinned.length > 0 ? (
              <section>
                <h2 className="text-xs font-semibold uppercase tracking-wide text-muted">
                  Buy soon
                </h2>
                <ul className="mt-2 space-y-1.5">
                  {grouped.pinned.map(renderItem)}
                </ul>
              </section>
            ) : null}

            {SHOPPING_CATEGORIES.map((cat) => {
              const rows = grouped.open[cat];
              if (rows.length === 0) return null;
              return (
                <section key={cat}>
                  <h2 className="text-xs font-semibold uppercase tracking-wide text-muted">
                    {SHOPPING_CATEGORY_LABELS[cat]}
                  </h2>
                  <ul className="mt-2 space-y-1.5">{rows.map(renderItem)}</ul>
                </section>
              );
            })}

            {grouped.done.length > 0 ? (
              <section>
                <div className="flex items-center justify-between gap-2">
                  <h2 className="text-xs font-semibold uppercase tracking-wide text-muted">
                    Done
                  </h2>
                  <button
                    type="button"
                    onClick={() => setClearDoneOpen(true)}
                    className="text-xs text-muted hover:text-white"
                  >
                    Clear done
                  </button>
                </div>
                <ul className="mt-2 space-y-1.5">
                  {grouped.done.map((item) => (
                    <li key={item.id}>
                      <button
                        type="button"
                        onClick={() => void toggleComplete(item.id)}
                        className={[
                          "flex w-full items-center gap-3 rounded-lg border border-border/50 bg-surface/40 px-3 text-left opacity-70",
                          tapClass,
                        ].join(" ")}
                      >
                        <span
                          className={[
                            "flex shrink-0 items-center justify-center rounded border border-emerald-500/50 bg-emerald-500/20 text-emerald-200",
                            shoppingMode
                              ? "h-7 w-7 text-sm"
                              : "h-5 w-5 text-[10px]",
                          ].join(" ")}
                        >
                          ✓
                        </span>
                        <span className="block line-through text-muted">
                          {item.name}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}
          </div>
        )}
        </div>
      </main>

      <ConfirmDialog
        open={deleteId !== null}
        title="Delete item?"
        body="Removes it from your private shopping list."
        confirmLabel="Delete"
        danger
        onClose={() => setDeleteId(null)}
        onConfirm={() => {
          if (deleteId) void removeItem(deleteId);
          setDeleteId(null);
        }}
      />
      <ConfirmDialog
        open={clearDoneOpen}
        title="Clear done items?"
        body="Removes completed items from the list. Frequent chips still remember what you buy."
        confirmLabel="Clear done"
        danger
        onClose={() => setClearDoneOpen(false)}
        onConfirm={() => {
          void clearDone();
          setClearDoneOpen(false);
        }}
      />
    </>
  );
}
