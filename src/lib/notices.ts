import { daysUntil } from './date'

export interface NoticeCardData {
  id: string
  /** Small eyebrow above the title. */
  eyebrow?: string
  title: string
  /** Main line, e.g. "Season 4 Cour 2 resumes". */
  body: string
  /** Display date / when, e.g. "August 12". */
  when?: string
  /** Local YYYY-MM-DD used for the day countdown. */
  date?: string
  /** Optional portrait key visual. */
  image?: string
  /** Tailwind-ish accent for the top ribbon. */
  accent?: string
}

export function noticeCountdownLabel(
  dateKey: string,
  now = new Date(),
): string {
  const days = daysUntil(dateKey, now)
  if (days > 1) return `${days} days left`
  if (days === 1) return 'tomorrow'
  if (days === 0) return 'today!'
  if (days === -1) return 'yesterday'
  return `${Math.abs(days)} days ago`
}

/** Edit these to drop new portrait banners on the right. */
export const NOTICE_CARDS: NoticeCardData[] = [
  {
    id: 'rezero-s4c2',
    eyebrow: 'Coming back',
    title: 'Re: Zero',
    body: 'Season 4 Cour 2 resumes',
    when: 'August 12',
    date: '2026-08-12',
    image: '/notices/rezero-s4c2.png',
    accent: 'bg-violet-500 text-white',
  },
  {
    id: 'apothecary-s3c1',
    eyebrow: 'Coming soon',
    title: 'Apothecary Diaries',
    body: 'Season 3 Cour 1 Airs',
    when: 'October 2026',
    date: '2026-10-01',
    image: '/notices/apothecary-diaries-s3c1.png',
    accent: 'bg-emerald-500 text-white',
  },
  {
    id: 'apothecary-movie',
    eyebrow: 'In theaters',
    title: 'Apothecary Diaries',
    body: 'The movie debuts',
    when: 'December 2026',
    date: '2026-12-01',
    image: '/notices/apothecary-diaries-movie.png',
    accent: 'bg-amber-400 text-black',
  },
]
