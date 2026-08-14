import { useEffect, useMemo, useRef, useState } from "react";
import { CatWallpaper, WALLPAPER_ICONS } from "./components/CatWallpaper";
import { CursorTrail, useCursorTrailSetting } from "./components/CursorTrail";
import { DailyCard } from "./components/DailyCard";
import { DayEditor } from "./components/DayEditor";
import { FirebaseAuthProvider } from "./components/FirebaseAuthProvider";
import { GameFrame } from "./components/GameFrame";
import { MonthCalendar } from "./components/MonthCalendar";
import { NoticeRail } from "./components/NoticeRail";
import { PetCare } from "./components/PetCare";
import { ScrollTopButton } from "./components/ScrollTopButton";
import { StreakBar } from "./components/StreakBar";
import { TogetherTodos } from "./components/TogetherTodos";
import { Watchlist } from "./components/Watchlist";
import { Whiteboard } from "./components/Whiteboard";
import { AppHeader } from "./components/AppHeader";
import { GuestThemeBar } from "./components/ThemePicker";
import { ArcadePage } from "./pages/ArcadePage";
import { GAMES, GAME_COUNT } from "./games";
import { useDailies } from "./hooks/useDailies";
import { useFirebaseAuth } from "./hooks/firebaseAuthContext";
import {
  SharedThemeProvider,
  useSharedTheme,
} from "./hooks/useSharedTheme";
import { useShellLayout } from "./hooks/useShellLayout";
import { parseKey } from "./lib/date";
import { isRoomUid } from "./lib/jenga";
import { pickLoadingFlavor } from "./lib/loadingFlavor";
import { petIdleSrc } from "./lib/petAssets";
import type { GameId } from "./types";
import { NAV_LINKS } from "./nav";
import { BrowserRouter, Link, Navigate, Route, Routes } from "react-router-dom";
import { ScrapbookPage } from "./pages/ScrapbookPage";
import { GalleryPage } from "./pages/GalleryPage";
import { CookbookPage } from "./pages/CookbookPage";
import { RecipeEditorPage } from "./pages/RecipeEditorPage";
import { RecipeViewerPage } from "./pages/RecipeViewerPage";
import { ShoppingPage } from "./pages/ShoppingPage";
import { WheelPage } from "./pages/WheelPage";

function HomePage() {
  const {
    today,
    streaks,
    todayCount,
    todayGolden,
    toggle,
    openAndComplete,
    openExternal,
    isDone,
    dayCount,
  } = useDailies();
  const { trailEnabled, setTrailEnabled } = useCursorTrailSetting();
  const { theme, setTheme } = useSharedTheme();
  const { shellRef, leftBySide, rightBySide } = useShellLayout();

  const todayDate = parseKey(today);
  const [viewYear, setViewYear] = useState(todayDate.getFullYear());
  const [viewMonth, setViewMonth] = useState(todayDate.getMonth());
  const [selectedKey, setSelectedKey] = useState(today);
  const [framedGameId, setFramedGameId] = useState<GameId | null>(null);
  const [frameSession, setFrameSession] = useState(0);

  // When the Pacific day rolls over, keep calendar + Edit day on "today" if
  // that's what you were viewing (including jumping the month when needed).
  const prevTodayRef = useRef(today);
  useEffect(() => {
    if (prevTodayRef.current === today) return;
    const previousToday = prevTodayRef.current;
    prevTodayRef.current = today;
    if (selectedKey !== previousToday) return;
    setSelectedKey(today);
    const d = parseKey(today);
    setViewYear(d.getFullYear());
    setViewMonth(d.getMonth());
  }, [today, selectedKey]);

  const framedGame = GAMES.find((g) => g.id === framedGameId) ?? null;

  const shiftMonth = (delta: number) => {
    const d = new Date(viewYear, viewMonth + delta, 1);
    setViewYear(d.getFullYear());
    setViewMonth(d.getMonth());
  };

  const handleOpen = (gameId: GameId) => {
    const game = GAMES.find((g) => g.id === gameId);
    if (!game) return;

    openAndComplete(gameId);

    if (game.embeddable) {
      setFrameSession((n) => n + 1);
      setFramedGameId(gameId);
      return;
    }

    openExternal(gameId);
    setFramedGameId(null);
  };

  const gridClass = rightBySide
    ? "grid-cols-[400px_minmax(0,64rem)_480px] justify-center"
    : leftBySide
      ? "grid-cols-[400px_minmax(0,64rem)] justify-center"
      : "grid-cols-1";

  return (
    <>
      <CatWallpaper />
      <CursorTrail enabled={trailEnabled} />
      <div
        ref={shellRef}
        className={[
          "pointer-events-none relative z-10 mx-auto grid min-h-full w-full max-w-[140rem] gap-6 px-4 py-8 sm:px-6",
          gridClass,
        ].join(" ")}
      >
        <div
          className={[
            "pointer-events-none order-1 relative z-20 flex min-w-0 flex-col gap-6 [&>*]:pointer-events-auto",
            leftBySide ? "col-start-2 row-start-1" : "",
          ].join(" ")}
        >
          <StreakBar
            streaks={streaks}
            todayGolden={todayGolden}
            todayCount={todayCount}
            gameCount={GAME_COUNT}
            theme={theme}
            onThemeChange={setTheme}
            cursorTrail={trailEnabled}
            onCursorTrailChange={setTrailEnabled}
          />

          <section>
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">
              Today&apos;s dailies
            </h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {GAMES.map((game) => (
                <DailyCard
                  key={game.id}
                  game={game}
                  done={isDone(today, game.id)}
                  active={framedGameId === game.id}
                  onOpen={() => handleOpen(game.id)}
                  onToggle={() => toggle(today, game.id)}
                />
              ))}
            </div>
          </section>

          {framedGame && (
            <GameFrame
              key={frameSession}
              game={framedGame}
              onClose={() => setFramedGameId(null)}
              onOpenExternal={() => openExternal(framedGame.id)}
            />
          )}

          <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
            <MonthCalendar
              year={viewYear}
              month={viewMonth}
              selectedKey={selectedKey}
              todayKey={today}
              dayCount={dayCount}
              onSelect={setSelectedKey}
              onPrevMonth={() => shiftMonth(-1)}
              onNextMonth={() => shiftMonth(1)}
            />
            <DayEditor
              dateKey={selectedKey}
              isDone={(entryId) => isDone(selectedKey, entryId)}
              onToggle={(entryId) => toggle(selectedKey, entryId)}
            />
          </div>

          <TogetherTodos />

          <Whiteboard />

          <PetCare valorantStoreDone={isDone(today, "valorant-store")} />
        </div>

        <aside
          className={[
            "pointer-events-none order-2 relative z-10 w-full [&>*]:pointer-events-auto",
            leftBySide ? "col-start-1 row-start-1" : "",
          ].join(" ")}
        >
          <Watchlist />
        </aside>

        <aside
          className={[
            "pointer-events-none order-3 w-full [&>*]:pointer-events-auto",
            rightBySide ? "col-start-3 row-start-1" : "",
          ].join(" ")}
        >
          <NoticeRail sideBySide={rightBySide} />
        </aside>
      </div>

      <ScrollTopButton />
    </>
  );
}

function LoginPage() {
  const { error, signIn } = useFirebaseAuth();
  const loginPet = useMemo(
    () =>
      petIdleSrc(
        WALLPAPER_ICONS[Math.floor(Math.random() * WALLPAPER_ICONS.length)]!,
      ),
    [],
  );

  return (
    <main className="relative grid min-h-screen place-items-center overflow-hidden px-4">
      <CatWallpaper />
      <section className="relative z-10 w-full max-w-sm rounded-2xl border border-border bg-surface-raised/95 p-6 text-center shadow-2xl shadow-black/40">
        <img
          src={loginPet}
          alt=""
          className="mx-auto mb-3 size-20 object-contain"
        />
        <h1 className="text-xl font-semibold text-white">Jo Dailies</h1>
        <p className="mt-2 text-sm text-muted">
          Sign in for dailies, or browse the gallery as a guest.
        </p>
        <button
          type="button"
          onClick={() => void signIn()}
          className="mt-5 w-full rounded-xl bg-streak px-4 py-2.5 text-sm font-semibold text-black transition hover:brightness-110"
        >
          Continue with Google
        </button>
        <Link
          to="/gallery"
          className="mt-3 block w-full rounded-xl border border-border bg-surface px-4 py-2.5 text-sm font-medium text-white transition hover:border-muted"
        >
          Continue as guest
        </Link>
        {error ? (
          <p className="mt-3 text-xs text-rose-300" role="alert">
            {error}
          </p>
        ) : null}
      </section>
    </main>
  );
}

const GALLERY_NAV = NAV_LINKS.filter((link) => link.to === "/gallery");

function GalleryOnlyLayout() {
  return (
    <div className="min-h-screen">
      <AppHeader links={GALLERY_NAV} />
      <div className="relative z-10 mx-auto max-w-7xl px-6 pt-6">
        <GuestThemeBar />
      </div>
      <GalleryPage wallpaper={false} />
    </div>
  );
}

function AppContent() {
  const { user, loading } = useFirebaseAuth();
  const loadingFlavor = useMemo(() => pickLoadingFlavor(), []);

  if (loading) {
    return (
      <main className="grid min-h-screen place-items-center px-4">
        <p className="text-sm text-muted">{loadingFlavor}</p>
      </main>
    );
  }

  const inRoom = isRoomUid(user?.uid);

  if (inRoom) {
    return (
      <div className="min-h-screen">
        <AppHeader />
        {/* Paths must stay in sync with NAV_LINKS in src/nav.ts */}
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/scrapbook" element={<ScrapbookPage />} />
          <Route path="/arcade" element={<ArcadePage />} />
          <Route path="/gallery" element={<GalleryPage />} />
          <Route path="/cookbook" element={<CookbookPage />} />
          <Route path="/cookbook/new" element={<RecipeEditorPage />} />
          <Route path="/cookbook/:recipeId" element={<RecipeViewerPage />} />
          <Route
            path="/cookbook/:recipeId/edit"
            element={<RecipeEditorPage />}
          />
          <Route path="/shopping" element={<ShoppingPage />} />
          <Route path="/wheel" element={<WheelPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    );
  }

  return (
    <Routes>
      <Route
        path="/gallery"
        element={<GalleryOnlyLayout />}
      />
      {user ? (
        <Route path="*" element={<Navigate to="/gallery" replace />} />
      ) : (
        <>
          <Route path="/" element={<LoginPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </>
      )}
    </Routes>
  );
}

function App() {
  return (
    <BrowserRouter>
      <FirebaseAuthProvider>
        <SharedThemeProvider>
          <AppContent />
        </SharedThemeProvider>
      </FirebaseAuthProvider>
    </BrowserRouter>
  );
}

export default App;
