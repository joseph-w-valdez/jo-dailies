import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";

type TheaterMode = "joseph" | "joha" | "both";

const TRACKERS: {
  id: "joseph" | "joha";
  name: string;
  tag: string;
  href: string;
}[] = [
  {
    id: "joseph",
    name: "Joseph",
    tag: "itsqq#uwu",
    href: "https://tracker.gg/valorant/profile/riot/itsqq%23uwu/overview",
  },
  {
    id: "joha",
    name: "Joha",
    tag: "ChipsAhoy#7666",
    href: "https://tracker.gg/valorant/profile/riot/ChipsAhoy%237666/overview?playlist=unrated&platform=pc&season=4f0864e2-40af-28a4-de2c-0e9e64e75f23",
  },
];

function TrackerFrame({
  title,
  src,
  className,
}: {
  title: string;
  src: string;
  className?: string;
}) {
  return (
    <iframe
      title={title}
      src={src}
      className={["block w-full bg-surface", className].filter(Boolean).join(" ")}
      loading="lazy"
      referrerPolicy="no-referrer"
    />
  );
}

export function TrackerPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<TheaterMode>("both");

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") navigate("/");
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [navigate]);

  const shown =
    mode === "both" ? TRACKERS : TRACKERS.filter((t) => t.id === mode);
  const title =
    mode === "both"
      ? "Joseph & Joha"
      : (TRACKERS.find((t) => t.id === mode)?.name ?? "Tracker");

  return createPortal(
    <div
      className="fixed inset-0 z-[70] flex flex-col bg-surface-raised"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div className="flex shrink-0 flex-wrap items-center gap-x-2 gap-y-1 border-b border-border px-2 py-1">
        <button
          type="button"
          onClick={() => navigate("/")}
          className="rounded-md border border-border bg-surface px-2 py-0.5 text-[11px] font-medium text-muted hover:border-muted hover:text-white"
        >
          Back
        </button>

        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-3 gap-y-0.5">
          {shown.map((tracker) => (
            <p
              key={tracker.id}
              className="flex min-w-0 items-baseline gap-1.5 text-[11px]"
            >
              <span className="font-semibold text-white">{tracker.name}</span>
              <span className="truncate text-muted">{tracker.tag}</span>
              <a
                href={tracker.href}
                target="_blank"
                rel="noreferrer"
                className="shrink-0 text-muted hover:text-white"
              >
                Open
              </a>
            </p>
          ))}
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-1">
          {(
            [
              ["joseph", "Joseph"],
              ["joha", "Joha"],
              ["both", "Both"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setMode(id)}
              aria-pressed={mode === id}
              aria-label={`Theater ${label}`}
              className={[
                "rounded-md border px-2 py-0.5 text-[11px] font-medium transition",
                mode === id
                  ? "border-golden/50 bg-golden/15 text-golden"
                  : "border-border bg-surface text-white hover:border-muted",
              ].join(" ")}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div
        className={[
          "flex min-h-0 flex-1",
          mode === "both" ? "flex-col lg:flex-row" : "flex-col",
        ].join(" ")}
      >
        {shown.map((tracker, index) => (
          <div
            key={tracker.id}
            className={[
              "flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-surface",
              mode === "both" && index > 0
                ? "border-t border-border lg:border-t-0 lg:border-l"
                : "",
            ].join(" ")}
          >
            <TrackerFrame
              title={`Valorant tracker — ${tracker.name} (${tracker.tag})`}
              src={tracker.href}
              className="min-h-0 flex-1 border-0"
            />
          </div>
        ))}
      </div>
    </div>,
    document.body,
  );
}
