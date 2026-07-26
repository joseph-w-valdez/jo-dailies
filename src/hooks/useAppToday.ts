import { useEffect, useState } from 'react'
import { msUntilNextAppMidnight, todayKey } from '../lib/date'

/**
 * One shared Pacific-day subscription for the whole app.
 * All hooks calling useAppToday() see the same rollover (timer + tab wake).
 */
const listeners = new Set<() => void>()
let cachedToday = todayKey()
let timer = 0
let started = false

function notify() {
  for (const listener of listeners) listener()
}

function syncToday(): boolean {
  const next = todayKey()
  if (next === cachedToday) return false
  cachedToday = next
  notify()
  return true
}

function scheduleMidnight() {
  window.clearTimeout(timer)
  timer = window.setTimeout(() => {
    syncToday()
    scheduleMidnight()
  }, msUntilNextAppMidnight())
}

function onWake() {
  if (document.visibilityState === 'hidden') return
  syncToday()
  // Reschedule — background timers can oversleep past midnight.
  scheduleMidnight()
}

function startDayClock() {
  if (started || typeof window === 'undefined') return
  started = true
  cachedToday = todayKey()
  scheduleMidnight()
  document.addEventListener('visibilitychange', onWake)
  window.addEventListener('focus', onWake)
}

/**
 * Pacific "today" that updates at America/Los_Angeles midnight (and when the
 * tab wakes), so dailies, pets, and the calendar roll over together.
 */
export function useAppToday(): string {
  const [today, setToday] = useState(() => {
    startDayClock()
    return cachedToday
  })

  useEffect(() => {
    startDayClock()
    const onChange = () => setToday(cachedToday)
    listeners.add(onChange)
    setToday(cachedToday)
    syncToday()
    return () => {
      listeners.delete(onChange)
    }
  }, [])

  return today
}
