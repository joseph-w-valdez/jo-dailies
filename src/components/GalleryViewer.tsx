import { useEffect } from "react";

import type { GalleryEntry } from "../data/gallery";

interface GalleryViewerProps {
  entries: GalleryEntry[];
  index: number;
  onChangeIndex: (index: number) => void;
  onClose: () => void;
}

export function GalleryViewer({
  entries,
  index,
  onChangeIndex,
  onClose,
}: GalleryViewerProps) {
  const entry = entries[index];

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
  }, [hasNext, hasPrevious, index, onChangeIndex, onClose]);

  if (!entry) {
    return null;
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
              {entry.title}
            </h2>

            <p className="text-[11px] text-muted">
              {entry.type === "image" ? "🖼 Artwork" : "🎬 Timelapse"} ·{" "}
              {entry.date}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <span className="mr-2 text-[11px] text-muted">
            {index + 1} / {entries.length}
          </span>

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
            ←
          </button>
        )}

        {entry.type === "image" ? (
          <img
            key={entry.id}
            onClick={(event) => event.stopPropagation()}
            src={entry.src}
            alt={entry.title}
            className="max-h-full max-w-full object-contain"
          />
        ) : (
          <video
            key={entry.id}
            onClick={(event) => event.stopPropagation()}
            src={entry.src}
            autoPlay
            muted
            loop
            playsInline
            controls
            className="max-h-full max-w-full object-contain"
          />
        )}

        {hasNext && (
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onChangeIndex(index + 1);
            }}
            className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full border border-white/30 bg-white/90 p-3 text-black shadow-lg transition hover:scale-105 hover:bg-white"
          >
            →
          </button>
        )}
      </div>
    </section>
  );
}
