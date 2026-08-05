export type GameId = "connections" | "stackdown" | "chess" | "waffle";

/** Fun edit-day items — not counted toward streaks or golden days. */
export type ExtraId =
  | "text-jo"
  | "valorant-store"
  | "ask-jo-day"
  | "cry-corner"
  | "gn-slep-wal";

export type DayEntryId = GameId | ExtraId;

export type DayLog = Partial<Record<DayEntryId, true>>;

export interface Store {
  version: 1;
  days: Record<string, DayLog>;
}

export interface Streaks {
  current: number;
  best: number;
  golden: number;
  goldenBest: number;
}

export interface GameDef {
  id: GameId;
  label: string;
  url: string;
  accent: string;
  /** When false, Open pops a new tab and closes any iframe. */
  embeddable: boolean;
  /** Approximate dark mode for light embeds we can't theme directly. */
  darkEmbed?: boolean;
}

export interface ExtraDef {
  id: ExtraId;
  label: string;
  accent: string;
}

export interface ScrapbookEntry {
  id: string;
  imageUrl: string;
  storagePath: string;
  createdAt: number;
  width: number;
  height: number;
}
