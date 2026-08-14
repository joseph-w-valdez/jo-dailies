import { householdName } from '../lib/household'
import { JENGA_PLAYER_UIDS } from '../lib/jenga'

const choiceClass =
  'rounded-xl border border-border bg-surface/80 px-4 py-8 text-left hover:border-muted'

export function GameSeatPicker({
  prompt,
  optionLabel,
  onPick,
}: {
  prompt: string
  optionLabel: (name: string) => string
  onPick: (uid: string) => void
}) {
  return (
    <div className="space-y-3">
      <p className="text-center text-xs text-muted">{prompt}</p>
      <div className="grid gap-3 sm:grid-cols-2">
        {JENGA_PLAYER_UIDS.map((uid) => {
          const name = householdName(uid)
          return (
            <button
              key={uid}
              type="button"
              onClick={() => onPick(uid)}
              className={choiceClass}
            >
              <span className="block font-semibold text-white">
                {optionLabel(name)}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
