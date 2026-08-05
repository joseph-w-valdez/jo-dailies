import { useEffect, useState } from "react";
import { getBlob, ref } from "firebase/storage";

import { storage } from "../lib/firebase";
import type { ScrapbookEntry } from "../types";

interface ScrapbookViewerProps {
  entries: ScrapbookEntry[];
  index: number;
  onClose: () => void;
  onDelete: (entry: ScrapbookEntry) => void;
}

export function ScrapbookViewer({
  entries,
  index,
  onClose,
  onDelete,
}: ScrapbookViewerProps) {
  const entry = entries[index];
  console.log("🖼️ Viewer render", {
    index,
    id: entry?.id,
    url: entry?.imageUrl,
    createdAt: entry?.createdAt,
  });

  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (confirmDelete) {
        if (event.key === "Escape") {
          setConfirmDelete(false);
        }

        return;
      }

      if (event.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [confirmDelete, onClose]);

  if (!entry) {
    return null;
  }

  async function handleDownload() {
    const date = new Date(entry.createdAt);

    const filename = `whiteboard-${date.getFullYear()}-${String(
      date.getMonth() + 1,
    ).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}_${String(
      date.getHours(),
    ).padStart(2, "0")}-${String(date.getMinutes()).padStart(2, "0")}.png`;

    const blob = await getBlob(ref(storage, entry.storagePath));

    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();

    URL.revokeObjectURL(url);
  }

  function handleDelete() {
    onDelete(entry);
  }

  return (
    <section
      className="fixed inset-0 z-50 flex flex-col bg-black/85 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="flex min-h-0 flex-1 flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <header
          className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-3 py-1.5"
          style={{
            background:
              "linear-gradient(90deg, rgba(255,255,255,0.06), transparent 55%)",
          }}
        >
          <div className="flex min-w-0 items-center gap-2">
            <span className="size-2 shrink-0 rounded-full bg-streak" />

            <div className="min-w-0">
              <h2 className="truncate text-xs font-semibold text-white">
                Whiteboard Snapshot
              </h2>

              <p className="text-[11px] text-muted">
                {new Date(entry.createdAt).toLocaleString([], {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                  hour: "numeric",
                  minute: "2-digit",
                })}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {confirmDelete ? (
              <>
                <span className="mr-2 text-[11px] font-medium text-white/85">
                  Delete this snapshot?
                </span>

                <button
                  type="button"
                  onClick={handleDelete}
                  className="rounded-md bg-rose-500 px-2 py-1 text-[11px] font-bold text-white transition hover:bg-rose-400"
                >
                  Delete
                </button>

                <button
                  type="button"
                  onClick={() => setConfirmDelete(false)}
                  className="rounded-md px-2 py-1 text-[11px] text-muted transition hover:text-white"
                >
                  Cancel
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={handleDownload}
                  className="rounded-md border border-border bg-surface px-2 py-1 text-[11px] font-medium text-white hover:border-muted"
                >
                  Download
                </button>

                <button
                  type="button"
                  onClick={() => setConfirmDelete(true)}
                  className="rounded-md border border-rose-500/40 bg-rose-500/15 px-2 py-1 text-[11px] font-medium text-rose-200 transition hover:border-rose-400 hover:bg-rose-500/25"
                >
                  Delete
                </button>

                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-md border border-border px-2 py-1 text-[11px] text-muted hover:bg-surface hover:text-white"
                >
                  Close
                </button>
              </>
            )}
          </div>
        </header>

        <div className="flex min-h-0 flex-1 items-center justify-center p-8">
          <img
            key={entry.id}
            src={`${entry.imageUrl}&v=${entry.createdAt}`}
            alt={`Snapshot from ${new Date(entry.createdAt).toLocaleString()}`}
            className="max-h-full max-w-full object-contain"
          />
        </div>
      </div>
    </section>
  );
}
