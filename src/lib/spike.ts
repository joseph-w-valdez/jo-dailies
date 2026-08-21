/**
 * Spike — shared 2P Valorant card duel (UID seats).
 *
 * Round ends (one of): elimination | spike_detonate | spike_defuse
 * Match ends: first_to `roundsToWin`
 *
 * Economy: credits carry between rounds. Buy a gun each round (Classic free).
 * Action cards are gun-agnostic; equipped gun scales DC + damage.
 * Ult meter 0–6: orb / plant / defuse +1, elimination kill +2, loser +1;
 * sticky ult when full (no passive charge on fight hits).
 */

import { householdName } from './household'
import {
  JENGA_PLAYER_UIDS,
  isRoomUid,
  nextTurnUid,
  otherPlayerUid,
  parseOptionalSeatUid,
} from './jenga'
import {
  persistLabel,
  scaleGunDamage,
  spikeAgents,
  spikeAgentUniques,
  spikeCard,
  spikeCardEffectSummary,
  spikeGun,
  spikeUltCard,
  SPIKE_AGENT_IDS,
  SPIKE_CARDS,
  SPIKE_GUNS,
  SPIKE_LOSS_INCOME,
  SPIKE_START_CREDITS,
  SPIKE_ULT_COST,
  SPIKE_WIN_INCOME,
  type SpikeCardDef,
  type SpikeGunId,
  type SpikePersist,
} from './spikeCards'
import { agentById } from './valorantAgents'

export {
  persistLabel,
  spikeAgents,
  spikeAgentUniques,
  spikeCard,
  spikeCardEffectSummary,
  spikeGun,
  spikeUltCard,
  SPIKE_AGENT_IDS,
  SPIKE_CARDS,
  SPIKE_GUNS,
  SPIKE_LOSS_INCOME,
  SPIKE_START_CREDITS,
  SPIKE_ULT_COST,
  SPIKE_WIN_INCOME,
}
export type { SpikeCardDef, SpikeGunId, SpikePersist }

export const SPIKE_MAX_HP = 100
/** Opening hand size and soft cap after each turn's draw. */
export const SPIKE_HAND_SIZE = 6
/** Cards drawn after each play (then trimmed back to hand size). */
export const SPIKE_DRAW_PER_TURN = 2
export const SPIKE_ROUNDS_TO_WIN = 3
/**
 * One card per deal/refill is a special: this chance it's Grab Ult Orb,
 * otherwise an agent unique (so 50/50 orb vs unique).
 */
export const SPIKE_SPECIAL_ORB_CHANCE = 0.5
export const SPIKE_TIMER_TURNS = 4
/** Successful card hits needed before site Plant / Defuse / Tap unlock. */
export const SPIKE_ENCOUNTERS_TO_SITE = 3
export const SPIKE_SITE_PLANT_DC = 11
export const SPIKE_SITE_DEFUSE_DC = 12
export const SPIKE_SITE_TAP_DC = 9

export type SpikeSide = 'atk' | 'def'
export type SpikeSeat = string // uid
export type SpikeRoundReason =
  | 'elimination'
  | 'spike_detonate'
  | 'spike_defuse'
export type SpikeMatchReason = 'first_to'

export type SpikeFighter = {
  uid: string
  agentId: string
  side: SpikeSide
  hp: number
  hand: string[]
  persist: SpikePersist | null
  credits: number
  gunId: SpikeGunId
  /** 0–SPIKE_ULT_COST; persists across rounds. */
  ultCharge: number
  /** Locked agent for this buy; both seats must lock before guns. */
  agentReady: boolean
  buyReady: boolean
  /** Successful card hits this round (site unlock at SPIKE_ENCOUNTERS_TO_SITE). */
  encounters: number
}

export type SpikeMatch = {
  version: number
  updatedAt: number
  roundId: string
  hotseat: boolean
  firstUid: string | null
  turnUid: string
  winnerUid: string | null
  phase: 'buy' | 'playing' | 'round_over' | 'match_over'
  fighters: Record<string, SpikeFighter> // both JENGA_PLAYER_UIDS keys always present
  deck: string[]
  discard: string[]
  spike: null | { plantedBy: string; turnsLeft: number }
  rounds: Record<string, number> // uid -> wins
  roundsToWin: number
  log: { text: string; roll?: number }[]
  roundEnd: null | {
    reason: SpikeRoundReason
    winnerUid: string
    summary: string
  }
  matchEnd: null | {
    reason: 'first_to'
    winnerUid: string
    summary: string
  }
}

export function roundReasonLabel(reason: SpikeRoundReason): string {
  if (reason === 'elimination') return 'Elimination'
  if (reason === 'spike_detonate') return 'Spike detonated'
  return 'Spike defused'
}

export function foeUid(uid: string): string {
  return otherPlayerUid(uid)
}

export function fighter(state: SpikeMatch, uid: string): SpikeFighter {
  return state.fighters[uid]!
}

function whoLabel(uid: string): string {
  return householdName(uid)
}

function clampNum(n: unknown, fallback = 0): number {
  const v = typeof n === 'number' ? n : Number(n)
  return Number.isFinite(v) ? v : fallback
}

function newRoundId(): string {
  return `sp-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

function shuffle<T>(items: T[], rng: () => number): T[] {
  const out = [...items]
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1))
    ;[out[i], out[j]] = [out[j]!, out[i]!]
  }
  return out
}

function between(
  range: readonly [number, number],
  rng: () => number,
): number {
  return range[0] + Math.floor(rng() * (range[1] - range[0] + 1))
}

function get(m: SpikeMatch, uid: string): SpikeFighter {
  return m.fighters[uid]!
}

function set(m: SpikeMatch, uid: string, f: SpikeFighter): SpikeMatch {
  return {
    ...m,
    fighters: { ...m.fighters, [uid]: f },
    updatedAt: Date.now(),
  }
}

function emptyRounds(): Record<string, number> {
  const out: Record<string, number> = {}
  for (const uid of JENGA_PLAYER_UIDS) out[uid] = 0
  return out
}

function log(m: SpikeMatch, text: string, roll?: number): SpikeMatch {
  return { ...m, log: [...m.log.slice(-80), { text, roll }] }
}

function drop(hand: string[], id: string): string[] {
  const next = [...hand]
  const i = next.indexOf(id)
  if (i >= 0) next.splice(i, 1)
  return next
}

function draw(
  hand: string[],
  deck: string[],
  discard: string[],
  n: number,
  rng: () => number,
  side: SpikeSide,
  spikeLive: boolean,
) {
  let h = [...hand]
  let d = [...deck]
  let disc = [...discard]
  for (let i = 0; i < n; i += 1) {
    let found: string | null = null
    const parked: string[] = []
    while (!found) {
      if (d.length === 0) {
        if (disc.length === 0) break
        // Agent uniques are injected, not recirculated through the shared deck.
        d = shuffle(
          disc.filter((id) => !spikeCard(id)?.agentId),
          rng,
        )
        disc = []
      }
      if (d.length === 0) break
      const c = d.shift()
      if (!c) break
      if (cardPlayableNow(c, side, spikeLive)) found = c
      else parked.push(c)
    }
    // Side/situation-locked cards stay available for later / the other seat.
    if (parked.length) d.push(...parked)
    if (found) h.push(found)
    else break
  }
  return { hand: h, deck: d, discard: disc }
}

function agentUniqueIds(agentId: string): string[] {
  return SPIKE_CARDS.filter(
    (c) => c.agentId === agentId && c.kind !== 'ult',
  ).map((c) => c.id)
}

function takeFromDeck(
  deck: string[],
  match: (id: string) => boolean,
): { card: string | null; deck: string[] } {
  const i = deck.findIndex(match)
  if (i < 0) return { card: null, deck }
  const next = [...deck]
  const [card] = next.splice(i, 1)
  return { card: card ?? null, deck: next }
}

function pickUnique(agentId: string, rng: () => number): string | null {
  const ids = agentUniqueIds(agentId)
  if (!ids.length) return null
  return ids[Math.floor(rng() * ids.length)] ?? null
}

function cardPlayableNow(
  cardId: string,
  side: SpikeSide,
  spikeLive: boolean,
): boolean {
  const card = spikeCard(cardId)
  if (!card) return false
  // Side locks — ATK never draws defuse, DEF never draws plant.
  if (card.plant && side !== 'atk') return false
  if (card.defuse && side !== 'def') return false
  // Plant is dead once the spike is already down; defuse can be held early
  // for counterplay and only becomes playable after plant.
  if (card.plant && spikeLive) return false
  return true
}

/**
 * Deal or refill with one special card: 50/50 Grab Ult Orb vs agent unique.
 * Remaining cards come from the shared deck, filtered by ATK/DEF and spike
 * state so plant/defuse never land unplayable. Uniques are injected (not
 * shared-deck), so you never draw the foe's kit.
 */
function drawForAgent(
  hand: string[],
  deck: string[],
  discard: string[],
  n: number,
  agentId: string,
  side: SpikeSide,
  spikeLive: boolean,
  rng: () => number,
): { hand: string[]; deck: string[]; discard: string[] } {
  if (n <= 0) return { hand, deck, discard }

  let h = [...hand]
  let d = [...deck]
  let disc = [...discard]
  let remaining = n

  if (remaining > 0) {
    const wantOrb = rng() < SPIKE_SPECIAL_ORB_CHANCE
    if (wantOrb) {
      const taken = takeFromDeck(d, (id) => id === 'grab_ult_orb')
      d = taken.deck
      h.push(taken.card ?? 'grab_ult_orb')
      remaining -= 1
    } else {
      const uid = pickUnique(agentId, rng)
      if (uid) {
        h.push(uid)
        remaining -= 1
      } else {
        // No unique kit — fall back to an orb so the special slot still fires.
        const taken = takeFromDeck(d, (id) => id === 'grab_ult_orb')
        d = taken.deck
        h.push(taken.card ?? 'grab_ult_orb')
        remaining -= 1
      }
    }
  }

  return draw(h, d, disc, remaining, rng, side, spikeLive)
}

/** Drop random cards until at max — shared cards recirculate, uniques do not. */
function trimHand(
  hand: string[],
  discard: string[],
  max: number,
  rng: () => number,
): { hand: string[]; discard: string[] } {
  let h = [...hand]
  let disc = [...discard]
  while (h.length > max) {
    const i = Math.floor(rng() * h.length)
    const [card] = h.splice(i, 1)
    if (!card) break
    if (!spikeCard(card)?.agentId) disc.push(card)
  }
  return { hand: h, discard: disc }
}

function buildDeck(rng: () => number): string[] {
  const shared = SPIKE_CARDS.filter(
    (c) =>
      !c.agentId &&
      c.kind !== 'ult' &&
      !c.plant &&
      !c.defuse &&
      c.id !== 'fake_plant',
  ).flatMap((c) =>
    // Keep orb copies in the shared pile for natural draws + hand bias pulls.
    c.id === 'grab_ult_orb'
      ? [c.id, c.id, c.id, c.id, c.id, c.id]
      : [c.id, c.id],
  )
  return shuffle(shared, rng)
}

function isGunAction(card: SpikeCardDef): boolean {
  return card.kind === 'action' || Boolean(card.usesGun)
}

function isSpikeGunId(id: unknown): id is SpikeGunId {
  return typeof id === 'string' && SPIKE_GUNS.some((g) => g.id === id)
}

function isSpikePersist(v: unknown): v is SpikePersist {
  return v === 'angle' || v === 'smoke' || v === 'trap' || v === 'molly'
}

function isSpikeSide(v: unknown): v is SpikeSide {
  return v === 'atk' || v === 'def'
}

function isAgentId(id: unknown): id is string {
  return typeof id === 'string' && SPIKE_AGENT_IDS.includes(id)
}

/** Effective d20 target for this card with agent + gun + clutch mods. */
export function spikeCardNeed(
  card: SpikeCardDef,
  agentId: string,
  gunId: SpikeGunId,
  hp: number = SPIKE_MAX_HP,
): number {
  let dc = card.dc
  if (card.agentId === agentId && card.agentDcBonus) dc -= card.agentDcBonus
  if (isGunAction(card)) dc += spikeGun(gunId).dcMod
  if (card.id === 'clutch_swing' && hp < 40) dc -= 3
  return Math.max(4, Math.min(19, dc))
}

export function siteLine(m: SpikeMatch, viewerUid?: string): string {
  const view =
    viewerUid && m.fighters[viewerUid]
      ? viewerUid
      : (m.firstUid ?? JENGA_PLAYER_UIDS[0]!)
  const me = get(m, view)
  const themUid = foeUid(view)
  const them = get(m, themUid)
  const bits = [
    `${whoLabel(view)} ${me.side.toUpperCase()}`,
    spikeGun(me.gunId).name,
  ]
  if (me.persist) bits.push(`${whoLabel(view)}: ${persistLabel(me.persist)}`)
  if (them.persist) {
    bits.push(`${whoLabel(themUid)}: ${persistLabel(them.persist)}`)
  }
  if (m.spike) bits.push(`Spike ${m.spike.turnsLeft}`)
  bits.push(`Site ${me.encounters}/${SPIKE_ENCOUNTERS_TO_SITE}`)
  return bits.join(' · ')
}

function emptyFighter(uid: string, side: SpikeSide): SpikeFighter {
  return {
    uid,
    agentId: SPIKE_AGENT_IDS[0]!,
    side,
    hp: SPIKE_MAX_HP,
    hand: [],
    persist: null,
    credits: SPIKE_START_CREDITS,
    gunId: 'classic',
    ultCharge: 0,
    agentReady: false,
    buyReady: false,
    encounters: 0,
  }
}

/** Both seats have locked agents — buy moves to the gun shop. */
export function spikeAgentsLocked(m: SpikeMatch): boolean {
  return JENGA_PLAYER_UIDS.every((id) => get(m, id).agentReady)
}

function emptyFighters(): Record<string, SpikeFighter> {
  const out: Record<string, SpikeFighter> = {}
  for (let i = 0; i < JENGA_PLAYER_UIDS.length; i += 1) {
    const uid = JENGA_PLAYER_UIDS[i]!
    out[uid] = emptyFighter(uid, i === 0 ? 'atk' : 'def')
  }
  return out
}

function addUltCharge(
  m: SpikeMatch,
  uid: string,
  amount: number,
): SpikeMatch {
  if (amount <= 0) return m
  const f = get(m, uid)
  const before = f.ultCharge
  const after = Math.min(SPIKE_ULT_COST, before + amount)
  if (after === before) return m
  const who = whoLabel(uid)
  let next = set(m, uid, { ...f, ultCharge: after })
  next = log(next, `${who} ult +${after - before} (${after}/${SPIKE_ULT_COST})`)
  if (before < SPIKE_ULT_COST && after >= SPIKE_ULT_COST) {
    next = log(next, `${who} ult ready`)
  }
  return next
}

export function createInitialSpike(
  uid: string,
  opts?: { hotseat?: boolean },
): SpikeMatch {
  const turnUid =
    typeof uid === 'string' && uid ? uid : JENGA_PLAYER_UIDS[0]!
  return {
    version: 1,
    updatedAt: Date.now(),
    roundId: newRoundId(),
    hotseat: Boolean(opts?.hotseat),
    firstUid: null,
    turnUid,
    winnerUid: null,
    phase: 'buy',
    fighters: emptyFighters(),
    deck: [],
    discard: [],
    spike: null,
    rounds: emptyRounds(),
    roundsToWin: SPIKE_ROUNDS_TO_WIN,
    log: [{ text: `Buy phase — pick who attacks first · $${SPIKE_START_CREDITS}` }],
    roundEnd: null,
    matchEnd: null,
  }
}

export function selectSpikeFirst(
  state: SpikeMatch,
  uid: string,
): SpikeMatch | null {
  if (state.firstUid !== null) return null
  if (state.phase !== 'buy') return null
  if (!isRoomUid(uid)) return null
  const other = foeUid(uid)
  const fighters = {
    ...state.fighters,
    [uid]: { ...get(state, uid), side: 'atk' as const },
    [other]: { ...get(state, other), side: 'def' as const },
  }
  const a = agentById(fighters[uid]!.agentId)?.name ?? whoLabel(uid)
  const b = agentById(fighters[other]!.agentId)?.name ?? whoLabel(other)
  return log(
    {
      ...state,
      firstUid: uid,
      turnUid: uid,
      fighters,
      updatedAt: Date.now(),
    },
    `Sides locked — ${whoLabel(uid)} ATK (${a}) vs ${whoLabel(other)} DEF (${b})`,
  )
}

export function setSpikeAgent(
  state: SpikeMatch,
  uid: string,
  agentId: string,
): SpikeMatch | null {
  if (state.phase !== 'buy') return null
  if (!isRoomUid(uid)) return null
  if (!isAgentId(agentId)) return null
  const f = get(state, uid)
  if (f.agentReady || f.buyReady) return null
  return set(state, uid, { ...f, agentId })
}

export function setSpikeAgentReady(
  state: SpikeMatch,
  uid: string,
  ready: boolean,
): SpikeMatch | null {
  if (state.phase !== 'buy') return null
  if (!isRoomUid(uid)) return null
  const f = get(state, uid)
  if (f.agentReady === ready) return state
  if (ready) {
    let next = set(state, uid, { ...f, agentReady: true })
    next = log(
      next,
      `${whoLabel(uid)} locks ${agentById(f.agentId)?.name ?? f.agentId}`,
    )
    if (spikeAgentsLocked(next)) {
      next = log(next, 'Agents locked — buy guns')
    }
    return next
  }
  // Unlocking agent also clears gun-ready and returns this seat to agent pick.
  let next = set(state, uid, { ...f, agentReady: false, buyReady: false })
  return log(
    next,
    `${whoLabel(uid)} unlocks agent — can change character`,
  )
}

export function buySpikeGun(
  state: SpikeMatch,
  uid: string,
  gunId: SpikeGunId,
): SpikeMatch | null {
  if (state.phase !== 'buy') return null
  if (!isRoomUid(uid)) return null
  if (!spikeAgentsLocked(state)) return null
  const gun = spikeGun(gunId)
  const f = get(state, uid)
  if (f.buyReady) return null
  // Refund current gun cost into the purchase (swap within the buy phase).
  const current = spikeGun(f.gunId)
  const purse = f.credits + current.cost
  if (gun.cost > purse) return null
  const credits = purse - gun.cost
  let next = set(state, uid, { ...f, gunId, credits })
  next = log(
    next,
    `${whoLabel(uid)} equips ${gun.name} (−$${gun.cost}, $${credits} left)`,
  )
  return next
}

export function setSpikeBuyReady(
  state: SpikeMatch,
  uid: string,
  ready: boolean,
): SpikeMatch | null {
  if (state.phase !== 'buy') return null
  if (!isRoomUid(uid)) return null
  if (!spikeAgentsLocked(state)) return null
  const f = get(state, uid)
  if (!f.agentReady) return null
  if (f.buyReady === ready) return state
  return set(state, uid, { ...f, buyReady: ready })
}

/** If both seats are buy-ready, deal hands and start the round. */
export function confirmSpikeBuyIfReady(
  state: SpikeMatch,
  rng: () => number = Math.random,
): SpikeMatch {
  if (state.phase !== 'buy') return state
  if (!state.firstUid) return state
  if (!spikeAgentsLocked(state)) return state
  if (!JENGA_PLAYER_UIDS.every((id) => get(state, id).buyReady)) return state

  let deck = state.deck.length ? state.deck : buildDeck(rng)
  let discard = state.discard
  const fighters: Record<string, SpikeFighter> = { ...state.fighters }

  for (const uid of JENGA_PLAYER_UIDS) {
    const f = fighters[uid]!
    let hand: string[] = []
    ;({ hand, deck, discard } = drawForAgent(
      [],
      deck,
      discard,
      SPIKE_HAND_SIZE,
      f.agentId,
      f.side,
      false,
      rng,
    ))
    fighters[uid] = {
      ...f,
      hand,
      hp: SPIKE_MAX_HP,
      persist: null,
      agentReady: false,
      buyReady: false,
      encounters: 0,
    }
  }

  let next: SpikeMatch = {
    ...state,
    phase: 'playing',
    deck,
    discard,
    fighters,
    spike: null,
    turnUid: state.firstUid,
    roundEnd: null,
    updatedAt: Date.now(),
  }
  const a = get(next, state.firstUid)
  const bUid = foeUid(state.firstUid)
  const b = get(next, bUid)
  next = log(
    next,
    `Round live — ${whoLabel(state.firstUid)} ${spikeGun(a.gunId).name} vs ${whoLabel(bUid)} ${spikeGun(b.gunId).name}`,
  )
  return next
}

function awardIncome(m: SpikeMatch, winnerUid: string): SpikeMatch {
  const fighters: Record<string, SpikeFighter> = { ...m.fighters }
  const bits: string[] = []
  for (const uid of JENGA_PLAYER_UIDS) {
    const gain = uid === winnerUid ? SPIKE_WIN_INCOME : SPIKE_LOSS_INCOME
    const f = fighters[uid]!
    const credits = f.credits + gain
    fighters[uid] = { ...f, credits }
    bits.push(`${whoLabel(uid)} +$${gain} ($${credits})`)
  }
  return log({ ...m, fighters }, `Income — ${bits.join(' · ')}`)
}

function endRound(
  m: SpikeMatch,
  reason: SpikeRoundReason,
  winnerUid: string,
  summary: string,
): SpikeMatch {
  const rounds: Record<string, number> = { ...m.rounds }
  rounds[winnerUid] = (rounds[winnerUid] ?? 0) + 1

  const fighters: Record<string, SpikeFighter> = { ...m.fighters }
  for (const uid of JENGA_PLAYER_UIDS) {
    fighters[uid] = {
      ...fighters[uid]!,
      persist: null,
      hand: [],
    }
  }

  let next = log(
    {
      ...m,
      phase: 'round_over',
      rounds,
      fighters,
      roundEnd: { reason, winnerUid, summary },
      spike: null,
      updatedAt: Date.now(),
    },
    summary,
  )
  if (reason === 'elimination') {
    next = addUltCharge(next, winnerUid, 2)
  }
  if (reason === 'spike_defuse') {
    next = addUltCharge(next, winnerUid, 1)
  }
  // Consolation so the behind player can still farm toward ult.
  next = addUltCharge(next, foeUid(winnerUid), 1)
  next = awardIncome(next, winnerUid)

  const matchWinner = JENGA_PLAYER_UIDS.find(
    (id) => (next.rounds[id] ?? 0) >= next.roundsToWin,
  )
  if (matchWinner) {
    const scores = JENGA_PLAYER_UIDS.map(
      (id) => `${whoLabel(id)} ${next.rounds[id] ?? 0}`,
    ).join('–')
    const matchSummary = `Match over — ${whoLabel(matchWinner)} wins (${scores})`
    next = {
      ...next,
      phase: 'match_over',
      winnerUid: matchWinner,
      matchEnd: {
        reason: 'first_to',
        winnerUid: matchWinner,
        summary: matchSummary,
      },
    }
    next = log(next, matchSummary)
  }
  return next
}

function dmg(m: SpikeMatch, target: string, amount: number): SpikeMatch {
  if (amount <= 0) return m
  const f = get(m, target)
  return set(m, target, { ...f, hp: Math.max(0, f.hp - amount) })
}

function heal(m: SpikeMatch, uid: string, amount: number): SpikeMatch {
  if (amount <= 0) return m
  const f = get(m, uid)
  return set(m, uid, {
    ...f,
    hp: Math.min(SPIKE_MAX_HP, f.hp + amount),
  })
}

function checkDead(m: SpikeMatch): SpikeMatch {
  if (m.phase !== 'playing') return m
  for (const uid of JENGA_PLAYER_UIDS) {
    if (get(m, uid).hp > 0) continue
    const winnerUid = foeUid(uid)
    return endRound(
      m,
      'elimination',
      winnerUid,
      `${whoLabel(uid)} eliminated — ${whoLabel(winnerUid)} wins the round`,
    )
  }
  return m
}

function tickSpike(m: SpikeMatch): SpikeMatch {
  if (!m.spike || m.phase !== 'playing') return m
  const turnsLeft = m.spike.turnsLeft - 1
  if (turnsLeft <= 0) {
    return endRound(
      m,
      'spike_detonate',
      m.spike.plantedBy,
      `Spike detonates — ${whoLabel(m.spike.plantedBy)} wins the round`,
    )
  }
  return log(
    { ...m, spike: { ...m.spike, turnsLeft } },
    `Spike timer: ${turnsLeft}`,
  )
}

function react(
  m: SpikeMatch,
  attacker: string,
  rng: () => number,
): { m: SpikeMatch; stopped: boolean } {
  const defender = foeUid(attacker)
  const def = get(m, defender)
  if (def.persist !== 'angle') return { m, stopped: false }

  const gun = spikeGun(def.gunId)
  const need = Math.max(6, Math.min(16, 10 + gun.dcMod))
  const roll = 1 + Math.floor(rng() * 20)
  let next = log(
    m,
    `${whoLabel(defender)} react with ${gun.name} (holding) d20=${roll} need ${need}+`,
    roll,
  )
  if (roll >= need) {
    const base = between([35, 60], rng)
    const hit = scaleGunDamage(base, def.gunId, true)
    next = dmg(next, attacker, hit)
    next = set(next, defender, { ...get(next, defender), persist: null })
    next = log(next, `Reaction hits for ${hit}. Hold spent.`)
    next = checkDead(next)
    return { m: next, stopped: next.phase !== 'playing' }
  }
  next = set(next, defender, { ...get(next, defender), persist: null })
  next = log(next, 'Reaction whiffs — hold broken.')
  return { m: next, stopped: false }
}

export function canPlaySpikeCard(
  m: SpikeMatch,
  uid: string,
  cardId: string,
): string | null {
  if (m.phase !== 'playing') return 'Round is over'
  if (m.turnUid !== uid) return 'Not your turn'
  const f = get(m, uid)
  const card = spikeCard(cardId)
  if (!card) return 'Unknown card'

  const ult = spikeUltCard(f.agentId)
  const isUltPlay = Boolean(ult && cardId === ult.id)
  if (isUltPlay) {
    if (f.ultCharge < SPIKE_ULT_COST) return 'Ult not ready'
  } else if (!f.hand.includes(cardId)) {
    return 'Card not in hand'
  }

  if (card.agentId && card.agentId !== f.agentId) return 'Wrong agent unique'
  if (card.plant && f.side !== 'atk') return 'Only attackers plant'
  if (card.plant && m.spike) return 'Spike already down'
  if (card.defuse && f.side !== 'def') return 'Only defenders defuse'
  if (card.defuse && !m.spike) return 'No spike to defuse'
  return null
}

export function playSpikeCard(
  m: SpikeMatch,
  uid: string,
  cardId: string,
  rng: () => number = Math.random,
): SpikeMatch | null {
  if (canPlaySpikeCard(m, uid, cardId)) return null
  const card = spikeCard(cardId)!
  const enemy = foeUid(uid)
  const who = whoLabel(uid)
  const self = get(m, uid)
  const isUlt = card.kind === 'ult'

  let next: SpikeMatch
  if (isUlt) {
    next = set(m, uid, { ...self, ultCharge: 0 })
    next = log(next, `${who} ult spent — ${card.name}`)
  } else {
    next = set(m, uid, {
      ...self,
      hand: drop(self.hand, cardId),
    })
    next = { ...next, discard: [...next.discard, cardId] }
    next = log(
      next,
      `${who} play ${card.name}${isGunAction(card) ? ` (${spikeGun(self.gunId).name})` : ''}`,
    )
  }

  const enemyF = get(next, enemy)
  if (isGunAction(card) && enemyF.persist === 'angle') {
    const r = react(next, uid, rng)
    next = r.m
    if (r.stopped) return next
  }

  let e = get(next, enemy)
  if (isGunAction(card) && e.persist === 'trap') {
    const chip = between([12, 22], rng)
    next = dmg(next, uid, chip)
    next = set(next, enemy, { ...e, persist: null })
    next = log(next, `Trap springs for ${chip}`)
    next = checkDead(next)
    if (next.phase !== 'playing') return next
    e = get(next, enemy)
  }
  if (isGunAction(card) && e.persist === 'molly') {
    const chip = between([8, 16], rng)
    next = dmg(next, uid, chip)
    next = log(next, `Molly chips ${chip}`)
    next = checkDead(next)
    if (next.phase !== 'playing') return next
  }

  let need = spikeCardNeed(
    card,
    get(next, uid).agentId,
    get(next, uid).gunId,
    get(next, uid).hp,
  )
  if (isGunAction(card) && get(next, enemy).persist === 'smoke') need += 2

  const roll = 1 + Math.floor(rng() * 20)
  let outcome: 'miss' | 'graze' | 'hit' = 'miss'
  if (roll >= need) outcome = 'hit'
  else if (card.dcGraze != null && roll >= card.dcGraze) outcome = 'graze'
  next = log(next, `d20=${roll} vs DC ${need} → ${outcome}`, roll)

  if (outcome === 'miss') {
    next = log(next, `${card.name} fails`)
    if (card.missSelfDamage) {
      const chip = between(card.missSelfDamage, rng)
      next = dmg(next, uid, chip)
      next = log(next, `Orb contest chips ${who} for ${chip}`)
      next = checkDead(next)
      if (next.phase !== 'playing') return next
    }
  } else {
    if (outcome === 'hit') {
      next = addEncounter(next, uid)
    }
    let hit = 0
    if (outcome === 'hit' && card.damageHit) hit = between(card.damageHit, rng)
    if (outcome === 'graze' && card.damageGraze) {
      hit = between(card.damageGraze, rng)
    }
    if (
      card.agentId === get(next, uid).agentId &&
      card.agentDamageBonus
    ) {
      hit += card.agentDamageBonus
    }
    hit = scaleGunDamage(
      hit,
      get(next, uid).gunId,
      card.usesGun ?? card.kind === 'action',
    )

    if (card.heal) {
      const h = between(card.heal, rng)
      next = heal(next, uid, h)
      next = log(next, `Heal ${h} → ${get(next, uid).hp} HP`)
    }

    if (hit > 0) {
      next = dmg(next, enemy, hit)
      next = log(
        next,
        `${outcome === 'graze' ? 'Graze' : 'Hit'} ${hit} — ${whoLabel(enemy)} ${get(next, enemy).hp} HP`,
      )
      next = checkDead(next)
      if (next.phase !== 'playing') return next
    }

    if (card.clearEnemyPersist && outcome === 'hit') {
      const ef = get(next, enemy)
      if (ef.persist) {
        next = set(next, enemy, { ...ef, persist: null })
        next = log(next, 'Enemy hold cleared')
      }
    }

    if (card.persist) {
      next = set(next, uid, {
        ...get(next, uid),
        persist: card.persist,
      })
      next = log(next, `Persist: ${persistLabel(card.persist)}`)
    }

    if (card.id === 'waste_clock' && outcome === 'hit' && next.spike) {
      const turnsLeft = Math.max(1, next.spike.turnsLeft - 1)
      next = {
        ...next,
        spike: { ...next.spike, turnsLeft },
      }
      next = log(next, `Clock wasted — spike now ${turnsLeft}`)
    }

    // Ult charge only from ultGain cards (orb). Hit or safe graze.
    // No passive +1 on fight hits (anti-snowball).
    if (
      card.ultGain &&
      (outcome === 'hit' || outcome === 'graze') &&
      card.kind !== 'ult'
    ) {
      next = addUltCharge(next, uid, card.ultGain)
      if (outcome === 'graze' && !card.damageGraze) {
        next = log(next, 'Safe orb pickup')
      }
    }
  }

  return finishSpikeTurn(next, uid, rng)
}

function addEncounter(m: SpikeMatch, uid: string): SpikeMatch {
  const f = get(m, uid)
  if (f.encounters >= SPIKE_ENCOUNTERS_TO_SITE) return m
  const encounters = f.encounters + 1
  let next = set(m, uid, { ...f, encounters })
  next = log(
    next,
    `${whoLabel(uid)} site ${encounters}/${SPIKE_ENCOUNTERS_TO_SITE}`,
  )
  if (encounters >= SPIKE_ENCOUNTERS_TO_SITE) {
    next = log(
      next,
      f.side === 'atk'
        ? `${whoLabel(uid)} unlocked Plant`
        : `${whoLabel(uid)} unlocked Defuse + Tap`,
    )
  }
  return next
}

function finishSpikeTurn(
  m: SpikeMatch,
  uid: string,
  rng: () => number,
): SpikeMatch {
  const me = get(m, uid)
  const spikeLive = Boolean(m.spike)
  let hand = me.hand.filter((id) => {
    const c = spikeCard(id)
    return !c?.plant && !c?.defuse && id !== 'fake_plant'
  })
  const dumped = me.hand.filter((id) => !hand.includes(id))
  let discard = m.discard
  let next = m
  if (dumped.length) {
    discard = [...discard, ...dumped]
    next = log(
      next,
      `${whoLabel(uid)} shelve ${dumped
        .map((id) => spikeCard(id)?.name ?? id)
        .join(', ')}`,
    )
  }
  const drawn = drawForAgent(
    hand,
    next.deck,
    discard,
    SPIKE_DRAW_PER_TURN,
    me.agentId,
    me.side,
    spikeLive,
    rng,
  )
  const trimmed = trimHand(drawn.hand, drawn.discard, SPIKE_HAND_SIZE, rng)
  next = {
    ...next,
    deck: drawn.deck,
    discard: trimmed.discard,
  }
  next = set(next, uid, { ...get(next, uid), hand: trimmed.hand })

  next = tickSpike(next)
  if (next.phase !== 'playing') return next
  return { ...next, turnUid: nextTurnUid(uid), updatedAt: Date.now() }
}

export type SpikeSiteAction = 'plant' | 'defuse' | 'tap'

export function canPlaySpikeSite(
  m: SpikeMatch,
  uid: string,
  action: SpikeSiteAction,
): string | null {
  if (m.phase !== 'playing') return 'Round is over'
  if (m.turnUid !== uid) return 'Not your turn'
  const f = get(m, uid)
  if (f.encounters < SPIKE_ENCOUNTERS_TO_SITE) {
    return `Need ${SPIKE_ENCOUNTERS_TO_SITE} site hits (have ${f.encounters})`
  }
  if (action === 'plant') {
    if (f.side !== 'atk') return 'Only attackers plant'
    if (m.spike) return 'Spike already down'
    return null
  }
  if (action === 'defuse' || action === 'tap') {
    if (f.side !== 'def') return 'Only defenders defuse / tap'
    if (!m.spike) return 'No spike to interact with'
    return null
  }
  return 'Unknown site action'
}

export function playSpikeSite(
  m: SpikeMatch,
  uid: string,
  action: SpikeSiteAction,
  rng: () => number = Math.random,
): SpikeMatch | null {
  if (canPlaySpikeSite(m, uid, action)) return null
  const who = whoLabel(uid)
  const need =
    action === 'plant'
      ? SPIKE_SITE_PLANT_DC
      : action === 'defuse'
        ? SPIKE_SITE_DEFUSE_DC
        : SPIKE_SITE_TAP_DC
  const label =
    action === 'plant' ? 'Plant' : action === 'defuse' ? 'Defuse' : 'Tap'

  let next = log(m, `${who} site ${label}`)
  const roll = 1 + Math.floor(rng() * 20)
  const hit = roll >= need
  next = log(next, `d20=${roll} vs DC ${need} → ${hit ? 'hit' : 'miss'}`, roll)

  if (!hit) {
    next = log(next, `${label} fails`)
    return finishSpikeTurn(next, uid, rng)
  }

  if (action === 'plant') {
    next = {
      ...next,
      spike: { plantedBy: uid, turnsLeft: SPIKE_TIMER_TURNS },
    }
    next = log(next, `Spike planted — ${SPIKE_TIMER_TURNS} turns`)
    next = addUltCharge(next, uid, 1)
    return finishSpikeTurn(next, uid, rng)
  }

  if (action === 'defuse') {
    return endRound(
      next,
      'spike_defuse',
      uid,
      `Spike defused — ${who} wins the round`,
    )
  }

  if (next.spike) {
    const turnsLeft = Math.max(1, next.spike.turnsLeft - 1)
    const shaved = turnsLeft < next.spike.turnsLeft
    next = {
      ...next,
      spike: { ...next.spike, turnsLeft },
    }
    next = log(
      next,
      shaved
        ? `Fake tap — spike now ${turnsLeft}`
        : `Fake tap — spike stays at ${turnsLeft}`,
    )
  }
  return finishSpikeTurn(next, uid, rng)
}

export function startNextSpikeRound(
  m: SpikeMatch,
  rng: () => number = Math.random,
): SpikeMatch {
  if (m.phase !== 'round_over' || m.matchEnd) return m
  const fighters: Record<string, SpikeFighter> = {}
  for (const uid of JENGA_PLAYER_UIDS) {
    const f = get(m, uid)
    fighters[uid] = {
      ...f,
      hp: SPIKE_MAX_HP,
      hand: [],
      persist: null,
      gunId: 'classic',
      agentReady: false,
      buyReady: false,
      encounters: 0,
    }
  }
  const scoreBits = JENGA_PLAYER_UIDS.map(
    (id) => `${whoLabel(id)} ${m.rounds[id] ?? 0}`,
  ).join('–')
  const creditBits = JENGA_PLAYER_UIDS.map(
    (id) => `${whoLabel(id)} $${get(m, id).credits}`,
  ).join(' · ')
  return {
    ...m,
    phase: 'buy',
    fighters,
    deck: buildDeck(rng),
    discard: [],
    spike: null,
    turnUid: m.firstUid ?? m.turnUid,
    roundEnd: null,
    roundId: newRoundId(),
    updatedAt: Date.now(),
    log: [
      ...m.log,
      {
        text: `— Buy phase — score ${scoreBits} · ${creditBits} —`,
      },
    ],
  }
}

function parseHand(raw: unknown): string[] {
  if (!Array.isArray(raw)) return []
  const out: string[] = []
  for (const item of raw) {
    if (typeof item === 'string' && item) out.push(item)
  }
  return out
}

function parseStringIds(raw: unknown): string[] {
  if (!Array.isArray(raw)) return []
  return raw.filter((id): id is string => typeof id === 'string' && Boolean(id))
}

function normalizeFighter(
  raw: unknown,
  uid: string,
  fallbackSide: SpikeSide,
): SpikeFighter {
  if (!raw || typeof raw !== 'object') return emptyFighter(uid, fallbackSide)
  const o = raw as Record<string, unknown>
  return {
    uid,
    agentId: isAgentId(o.agentId) ? o.agentId : SPIKE_AGENT_IDS[0]!,
    side: isSpikeSide(o.side) ? o.side : fallbackSide,
    hp: Math.max(0, Math.min(SPIKE_MAX_HP, Math.floor(clampNum(o.hp, SPIKE_MAX_HP)))),
    hand: parseHand(o.hand),
    persist: isSpikePersist(o.persist) ? o.persist : null,
    credits: Math.max(0, Math.floor(clampNum(o.credits, SPIKE_START_CREDITS))),
    gunId: isSpikeGunId(o.gunId) ? o.gunId : 'classic',
    ultCharge: Math.max(
      0,
      Math.min(SPIKE_ULT_COST, Math.floor(clampNum(o.ultCharge, 0))),
    ),
    buyReady: Boolean(o.buyReady),
    agentReady: Boolean(o.agentReady),
    encounters: Math.max(
      0,
      Math.min(
        SPIKE_ENCOUNTERS_TO_SITE,
        Math.floor(clampNum(o.encounters, 0)),
      ),
    ),
  }
}

function normalizeFighters(raw: unknown): Record<string, SpikeFighter> {
  const bag =
    raw && typeof raw === 'object'
      ? (raw as Record<string, unknown>)
      : {}
  const out: Record<string, SpikeFighter> = {}
  for (let i = 0; i < JENGA_PLAYER_UIDS.length; i += 1) {
    const uid = JENGA_PLAYER_UIDS[i]!
    out[uid] = normalizeFighter(bag[uid], uid, i === 0 ? 'atk' : 'def')
  }
  return out
}

function normalizeRounds(raw: unknown): Record<string, number> {
  const out = emptyRounds()
  if (!raw || typeof raw !== 'object') return out
  const bag = raw as Record<string, unknown>
  for (const uid of JENGA_PLAYER_UIDS) {
    out[uid] = Math.max(0, Math.floor(clampNum(bag[uid], 0)))
  }
  return out
}

function normalizeLog(
  raw: unknown,
): { text: string; roll?: number }[] {
  if (!Array.isArray(raw)) return []
  const out: { text: string; roll?: number }[] = []
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue
    const o = item as Record<string, unknown>
    if (typeof o.text !== 'string' || !o.text) continue
    const entry: { text: string; roll?: number } = { text: o.text }
    if (typeof o.roll === 'number' && Number.isFinite(o.roll)) {
      entry.roll = o.roll
    }
    out.push(entry)
  }
  return out.slice(-80)
}

function normalizeRoundEnd(
  raw: unknown,
): SpikeMatch['roundEnd'] {
  if (!raw || typeof raw !== 'object') return null
  const o = raw as Record<string, unknown>
  const reason =
    o.reason === 'elimination' ||
    o.reason === 'spike_detonate' ||
    o.reason === 'spike_defuse'
      ? o.reason
      : null
  const winnerUid =
    typeof o.winnerUid === 'string' && isRoomUid(o.winnerUid)
      ? o.winnerUid
      : null
  if (!reason || !winnerUid) return null
  return {
    reason,
    winnerUid,
    summary: typeof o.summary === 'string' ? o.summary : '',
  }
}

function normalizeMatchEnd(
  raw: unknown,
): SpikeMatch['matchEnd'] {
  if (!raw || typeof raw !== 'object') return null
  const o = raw as Record<string, unknown>
  const winnerUid =
    typeof o.winnerUid === 'string' && isRoomUid(o.winnerUid)
      ? o.winnerUid
      : null
  if (o.reason !== 'first_to' || !winnerUid) return null
  return {
    reason: 'first_to',
    winnerUid,
    summary: typeof o.summary === 'string' ? o.summary : '',
  }
}

function normalizeSpikePlant(
  raw: unknown,
): SpikeMatch['spike'] {
  if (!raw || typeof raw !== 'object') return null
  const o = raw as Record<string, unknown>
  if (typeof o.plantedBy !== 'string' || !isRoomUid(o.plantedBy)) return null
  const turnsLeft = Math.max(0, Math.floor(clampNum(o.turnsLeft, 0)))
  return { plantedBy: o.plantedBy, turnsLeft }
}

export function normalizeSpike(raw: unknown, uid: string): SpikeMatch {
  if (!raw || typeof raw !== 'object') return createInitialSpike(uid)
  const s = raw as Record<string, unknown>
  const phaseRaw = typeof s.phase === 'string' ? s.phase : 'buy'
  const phase: SpikeMatch['phase'] =
    phaseRaw === 'buy' ||
    phaseRaw === 'playing' ||
    phaseRaw === 'round_over' ||
    phaseRaw === 'match_over'
      ? phaseRaw
      : 'buy'
  const turnUid =
    typeof s.turnUid === 'string' && isRoomUid(s.turnUid)
      ? s.turnUid
      : isRoomUid(uid)
        ? uid
        : JENGA_PLAYER_UIDS[0]!
  const firstUid = parseOptionalSeatUid(
    s.firstUid,
    Object.prototype.hasOwnProperty.call(s, 'firstUid'),
    null,
  )
  const winnerUid =
    typeof s.winnerUid === 'string' && isRoomUid(s.winnerUid)
      ? s.winnerUid
      : null
  const matchEnd = normalizeMatchEnd(s.matchEnd)
  const roundEnd = normalizeRoundEnd(s.roundEnd)

  return {
    version: Math.max(1, Math.floor(clampNum(s.version, 1))),
    updatedAt: Math.floor(clampNum(s.updatedAt, Date.now())),
    roundId:
      typeof s.roundId === 'string' && s.roundId ? s.roundId : newRoundId(),
    hotseat: Boolean(s.hotseat),
    firstUid,
    turnUid,
    winnerUid: matchEnd?.winnerUid ?? winnerUid,
    phase: matchEnd ? 'match_over' : phase,
    fighters: normalizeFighters(s.fighters),
    deck: parseStringIds(s.deck),
    discard: parseStringIds(s.discard),
    spike: normalizeSpikePlant(s.spike),
    rounds: normalizeRounds(s.rounds),
    roundsToWin: Math.max(
      1,
      Math.floor(clampNum(s.roundsToWin, SPIKE_ROUNDS_TO_WIN)),
    ),
    log: normalizeLog(s.log),
    roundEnd,
    matchEnd,
  }
}
