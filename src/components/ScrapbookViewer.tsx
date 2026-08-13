import { useEffect, useState } from "react";
import { getBlob, ref } from "firebase/storage";

import { ConfirmDialog } from "./ConfirmDialog";
import { storage } from "../lib/firebase";
import type { ScrapbookEntry } from "../types";

interface ScrapbookViewerProps {
  entries: ScrapbookEntry[];
  index: number;
  onChangeIndex: (index: number) => void;
  onClose: () => void;
  onDelete: (entry: ScrapbookEntry) => void;
}

export function ScrapbookViewer({
  entries,
  index,
  onChangeIndex,
  onClose,
  onDelete,
}: ScrapbookViewerProps) {
  const entry = entries[index];

  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    setConfirmDelete(false);
  }, [index]);

  const hasPrevious = index > 0;
  const hasNext = index < entries.length - 1;

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
        return;
      }

      if (event.key === "ArrowLeft" && hasPrevious) {
        onChangeIndex(index - 1);
        return;
      }

      if (event.key === "ArrowRight" && hasNext) {
        onChangeIndex(index + 1);
      }
    };

    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [confirmDelete, hasNext, hasPrevious, index, onChangeIndex, onClose]);

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
      <header
        onClick={(event) => event.stopPropagation()}
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
          <span className="mr-2 text-[11px] text-muted">
            {index + 1} / {entries.length}
          </span>

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
        </div>
      </header>

      <div className="relative flex min-h-0 flex-1 items-center justify-center p-8">
        {hasPrevious && (
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onChangeIndex(index - 1);
            }}
            className="absolute left-4 top-1/2 -translate-y-1/2 rounded-full border border-white/30 bg-white/90 p-3 text-black shadow-lg transition hover:scale-105 hover:bg-white"
          >
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M3 12L10 5V9H20.2C20.48 9 20.62 9 20.727 9.0545C20.8211 9.10243 20.8976 9.17892 20.9455 9.273C21 9.37996 21 9.51997 21 9.8V14.2C21 14.48 21 14.62 20.9455 14.727C20.8976 14.8211 20.8211 14.8976 20.727 14.9455C20.62 15 20.48 15 20.2 15H10V19L3 12Z"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        )}

        <img
          key={entry.id}
          onClick={(event) => event.stopPropagation()}
          src={`${entry.imageUrl}&v=${entry.createdAt}`}
          alt={`Snapshot from ${new Date(entry.createdAt).toLocaleString()}`}
          className="max-h-full max-w-full object-contain"
        />

        {hasNext && (
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onChangeIndex(index + 1);
            }}
            className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full border border-white/30 bg-white/90 p-3 text-black shadow-lg transition hover:scale-105 hover:bg-white"
          >
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M21 12L14 5V9H3.8C3.51997 9 3.37996 9 3.273 9.0545C3.17892 9.10243 3.10243 9.17892 3.0545 9.273C3 9.37996 3 9.51997 3 9.8V14.2C3 14.48 3 14.62 3.0545 14.727C3.10243 14.8211 3.17892 14.8976 3.273 14.9455C3.37996 15 3.51997 15 3.8 15H14V19L21 12Z"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        )}
      </div>

      <ConfirmDialog
        open={confirmDelete}
        title="Delete snapshot?"
        body="This removes the snapshot from the scrapbook for both of you."
        confirmLabel="Delete"
        danger
        onClose={() => setConfirmDelete(false)}
        onConfirm={handleDelete}
      />
    </section>
  );
}
