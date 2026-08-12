import { useState } from "react";

import { GalleryViewer } from "../components/GalleryViewer";
import { galleryEntries } from "../data/gallery";

type SortOption = "newest" | "oldest" | "name-asc" | "name-desc";
type MediaFilter = "all" | "image" | "video";

export function GalleryPage() {
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);
  const [sortOption, setSortOption] = useState<SortOption>("newest");
  const [mediaFilter, setMediaFilter] = useState<MediaFilter>("all");

  const filteredEntries =
    mediaFilter === "all"
      ? galleryEntries
      : galleryEntries.filter((entry) => entry.type === mediaFilter);

  const sortedEntries = [...filteredEntries].sort((a, b) => {
    switch (sortOption) {
      case "oldest":
        return a.date.localeCompare(b.date);

      case "name-asc":
        return a.title.localeCompare(b.title);

      case "name-desc":
        return b.title.localeCompare(a.title);

      case "newest":
      default:
        return b.date.localeCompare(a.date);
    }
  });

  return (
    <main className="mx-auto max-w-7xl p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-white">Gallery</h1>

        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 text-sm text-muted">
            Show:
            <select
              value={mediaFilter}
              onChange={(event) =>
                setMediaFilter(event.target.value as MediaFilter)
              }
              className="rounded-md border border-border bg-surface px-2 py-1 text-sm text-white"
            >
              <option value="all">All</option>
              <option value="image">🖼 Images</option>
              <option value="video">🎬 Timelapses</option>
            </select>
          </label>

          <label className="flex items-center gap-2 text-sm text-muted">
            Sort:
            <select
              value={sortOption}
              onChange={(event) =>
                setSortOption(event.target.value as SortOption)
              }
              className="rounded-md border border-border bg-surface px-2 py-1 text-sm text-white"
            >
              <option value="newest">Newest</option>
              <option value="oldest">Oldest</option>
              <option value="name-asc">Name A-Z</option>
              <option value="name-desc">Name Z-A</option>
            </select>
          </label>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {sortedEntries.map((entry, index) => (
          <article
            key={entry.id}
            onClick={() => setViewerIndex(index)}
            className={[
              "cursor-pointer overflow-hidden rounded-xl border-2 transition hover:scale-[1.02]",
              entry.type === "image"
                ? "border-fuchsia-400/60 bg-fuchsia-500/15"
                : "border-cyan-400/60 bg-cyan-500/15",
            ].join(" ")}
          >
            <div className="relative">
              {entry.type === "image" ? (
                <img
                  src={entry.src}
                  alt={entry.title}
                  className="aspect-[4/3] w-full bg-black/20 object-contain"
                />
              ) : (
                <video
                  src={entry.src}
                  muted
                  playsInline
                  className="aspect-[4/3] w-full bg-black/20 object-contain"
                />
              )}

              <span
                className={[
                  "absolute right-2 top-2 rounded-full px-2 py-1 text-xs backdrop-blur-sm",
                  entry.type === "image"
                    ? "border border-fuchsia-300/30 bg-fuchsia-500/40 text-white"
                    : "border border-cyan-300/30 bg-cyan-500/40 text-white",
                ].join(" ")}
              >
                {entry.type === "image" ? "🖼 Artwork" : "🎬 Timelapse"}
              </span>
            </div>

            <div
              className={[
                "p-3",
                entry.type === "image" ? "bg-fuchsia-500/25" : "bg-cyan-500/25",
              ].join(" ")}
            >
              <h2 className="text-sm font-semibold text-white">
                {entry.title}
              </h2>

              <p className="mt-1 text-xs text-muted">{entry.date}</p>
            </div>
          </article>
        ))}
      </div>

      {viewerIndex !== null && (
        <GalleryViewer
          entries={sortedEntries}
          index={viewerIndex}
          onChangeIndex={(index) => setViewerIndex(index)}
          onClose={() => setViewerIndex(null)}
        />
      )}
    </main>
  );
}
