import { NoticeCard } from './NoticeCard'
import { NOTICE_CARDS } from '../lib/notices'
import { daysUntil } from '../lib/date'

export function NoticeRail({ sideBySide }: { sideBySide: boolean }) {
  const cards = NOTICE_CARDS.filter(
    (card) => !card.date || daysUntil(card.date) >= 0,
  )

  if (cards.length === 0) return null

  return (
    <div
      className={
        sideBySide
          ? 'flex flex-col gap-4'
          : 'flex flex-wrap justify-center gap-4'
      }
    >
      {cards.map((card) => (
        <NoticeCard key={card.id} {...card} />
      ))}
    </div>
  )
}
