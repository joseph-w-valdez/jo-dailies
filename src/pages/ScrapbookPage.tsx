import { useEffect, useState } from "react";

import { ScrapbookViewer } from "../components/ScrapbookViewer";
import { deleteSnapshot, subscribeToSnapshots } from "../lib/scrapbook";
import type { ScrapbookEntry } from "../types";

export function ScrapbookPage() {
  const [entries, setEntries] = useState<ScrapbookEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  useEffect(() => {
    const unsubscribe = subscribeToSnapshots((snapshots) => {
      setEntries(snapshots);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  function getImageUrl(entry: ScrapbookEntry) {
    return `${entry.imageUrl}&v=${entry.createdAt}`;
  }

  async function handleDelete(entry: ScrapbookEntry) {
    const deletedIndex = entries.findIndex((item) => item.id === entry.id);

    await deleteSnapshot(entry);

    setEntries((current) => current.filter((item) => item.id !== entry.id));

    setSelectedIndex((currentIndex) => {
      if (currentIndex === null) {
        return null;
      }

      // If nothing remains
      if (entries.length <= 1) {
        return null;
      }

      // If deleting the last item, move back one
      if (deletedIndex >= entries.length - 1) {
        return deletedIndex - 1;
      }

      // Otherwise stay at same index because the next item slides in
      return deletedIndex;
    });
  }

  return (
    <main className="mx-auto max-w-7xl p-6">
      <h1 className="text-2xl font-bold text-white">Scrapbook</h1>

      {loading ? (
        <p className="mt-2 text-muted">Loading snapshots...</p>
      ) : entries.length === 0 ? (
        <p className="mt-2 text-muted">
          No snapshots yet. Click 📷 Save on the whiteboard to add one!
        </p>
      ) : (
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {entries.map((entry, index) => (
            <button
              key={entry.id}
              type="button"
              onClick={() => {
                console.log("Opening snapshot", {
                  index,
                  id: entry.id,
                  url: entry.imageUrl,
                });

                setSelectedIndex(index);
              }}
              className="overflow-hidden rounded-xl border border-border bg-surface text-left transition hover:-translate-y-0.5 hover:border-white/20 hover:shadow-lg"
            >
              <div
                className="flex w-full items-center justify-center overflow-hidden bg-black/20"
                style={{
                  aspectRatio: `${entry.width}/${entry.height}`,
                }}
              >
                <img
                  key={entry.id}
                  src={getImageUrl(entry)}
                  alt={`Snapshot from ${new Date(
                    entry.createdAt,
                  ).toLocaleDateString()}`}
                  className="h-full w-full object-contain"
                />
              </div>

              <div className="p-3">
                <p className="text-sm text-muted">
                  {new Date(entry.createdAt).toLocaleString([], {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                </p>
              </div>
            </button>
          ))}
        </div>
      )}

      {selectedIndex !== null && (
        <ScrapbookViewer
          onChangeIndex={setSelectedIndex}
          entries={entries}
          index={selectedIndex}
          onClose={() => setSelectedIndex(null)}
          onDelete={handleDelete}
        />
      )}
    </main>
  );
}
