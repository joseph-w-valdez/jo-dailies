import { NoticeCard } from './NoticeCard'
import { NOTICE_CARDS } from '../lib/notices'

export function NoticeRail({ sideBySide }: { sideBySide: boolean }) {
  return (
    <div
      className={
        sideBySide
          ? 'sticky top-8 flex flex-col gap-4'
          : 'flex flex-wrap justify-center gap-4'
      }
    >
      {NOTICE_CARDS.map((card) => (
        <NoticeCard key={card.id} {...card} />
      ))}
    </div>
  )
}
