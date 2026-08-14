import { useTurnPushSetting } from '../hooks/useTurnPush'

export function TurnPushToggle() {
  const { enabled, error, supported, setTurnPushEnabled } = useTurnPushSetting()

  return (
    <div className="flex flex-col items-end gap-1">
      <label className="flex cursor-pointer items-center gap-2 rounded-full border border-border bg-surface/70 px-3 py-1.5 text-[11px] text-muted hover:border-white/20 hover:text-white">
        <input
          type="checkbox"
          checked={enabled}
          disabled={!supported}
          onChange={(e) => void setTurnPushEnabled(e.target.checked)}
          className="size-3.5 accent-golden"
        />
        Turn pings
      </label>
      {error ? (
        <p className="max-w-[12rem] text-right text-[10px] text-rose-300">{error}</p>
      ) : null}
    </div>
  )
}
