import { describe, expect, it } from 'vitest'
import { householdName } from './household'
import { JENGA_PLAYER_UIDS } from './jenga'
import {
  canPlaySpikeCard,
  confirmSpikeBuyIfReady,
  createInitialSpike,
  fighter,
  canPlaySpikeSite,
  playSpikeCard,
  playSpikeSite,
  selectSpikeFirst,
  setSpikeAgentReady,
  setSpikeBuyReady,
  SPIKE_AGENT_IDS,
  SPIKE_CARDS,
  SPIKE_ROUNDS_TO_WIN,
  SPIKE_START_CREDITS,
  SPIKE_ULT_COST,
  startNextSpikeRound,
  spikeCard,
  spikeUltCard,
} from './spike'

const P0 = JENGA_PLAYER_UIDS[0]!
const P1 = JENGA_PLAYER_UIDS[1]!

function beginPlaying(opts?: {
  firstUid?: string
  random?: () => number
  agent0?: string
  agent1?: string
}) {
  const first = opts?.firstUid ?? P0
  const rng = opts?.random ?? Math.random
  let m = createInitialSpike(first)
  m = selectSpikeFirst(m, first)!
  // Optionally pin agents after first pick (still in buy, not ready).
  if (opts?.agent0 || opts?.agent1) {
    m = {
      ...m,
      fighters: {
        ...m.fighters,
        [P0]: {
          ...fighter(m, P0),
          agentId: opts.agent0 ?? fighter(m, P0).agentId,
        },
        [P1]: {
          ...fighter(m, P1),
          agentId: opts.agent1 ?? fighter(m, P1).agentId,
        },
      },
    }
  }
  m = setSpikeAgentReady(m, P0, true)!
  m = setSpikeAgentReady(m, P1, true)!
  m = setSpikeBuyReady(m, P0, true)!
  m = setSpikeBuyReady(m, P1, true)!
  return confirmSpikeBuyIfReady(m, rng)
}

function withFighter(
  m: ReturnType<typeof beginPlaying>,
  uid: string,
  patch: Partial<ReturnType<typeof fighter>>,
) {
  return {
    ...m,
    fighters: {
      ...m.fighters,
      [uid]: { ...fighter(m, uid), ...patch },
    },
  }
}

/** Always rolls high for d20 + damage bands. */
const alwaysHigh = () => 0.99

describe('spike UID seats', () => {
  it('create → first → both ready → confirm deals hands', () => {
    let m = createInitialSpike(P0)
    expect(m.phase).toBe('buy')
    expect(m.firstUid).toBeNull()
    expect(fighter(m, P0).credits).toBe(SPIKE_START_CREDITS)
    expect(fighter(m, P0).ultCharge).toBe(0)
    expect(fighter(m, P0).hand).toHaveLength(0)
    expect(fighter(m, P0).buyReady).toBe(false)
    expect(fighter(m, P1).buyReady).toBe(false)
    expect(m.deck).toHaveLength(0)

    m = selectSpikeFirst(m, P0)!
    expect(m.firstUid).toBe(P0)
    expect(m.turnUid).toBe(P0)
    expect(fighter(m, P0).side).toBe('atk')
    expect(fighter(m, P1).side).toBe('def')

    expect(confirmSpikeBuyIfReady(m, () => 0.42)).toBe(m)

    // Buy-ready is ignored until both agents are locked.
    expect(setSpikeBuyReady(m, P0, true)).toBeNull()

    m = setSpikeAgentReady(m, P0, true)!
    m = setSpikeAgentReady(m, P1, true)!
    m = setSpikeBuyReady(m, P0, true)!
    m = setSpikeBuyReady(m, P1, true)!
    m = confirmSpikeBuyIfReady(m, () => 0.42)
    expect(m.phase).toBe('playing')
    expect(m.roundsToWin).toBe(SPIKE_ROUNDS_TO_WIN)
    expect(fighter(m, P0).hand.length).toBeGreaterThan(0)
    expect(fighter(m, P1).hand.length).toBeGreaterThan(0)
    expect(fighter(m, P0).buyReady).toBe(false)
    expect(fighter(m, P1).buyReady).toBe(false)
    expect(m.turnUid).toBe(P0)
  })

  it('plays until a round ends by elimination, detonate, or defuse', () => {
    let seed = 0.11
    const random = () => {
      seed = (seed * 9.1 + 0.17) % 1
      return seed
    }
    let m = beginPlaying({
      firstUid: P0,
      agent0: SPIKE_AGENT_IDS[1]!,
      agent1: SPIKE_AGENT_IDS[4]!,
      random,
    })
    for (let i = 0; i < 80 && m.phase === 'playing'; i += 1) {
      const uid = m.turnUid
      const hand = fighter(m, uid).hand
      const id = hand.find((c) => canPlaySpikeCard(m, uid, c) == null)
      if (!id) break
      m = playSpikeCard(m, uid, id, random)!
    }
    expect(['round_over', 'match_over']).toContain(m.phase)
    expect(m.roundEnd).not.toBeNull()
    expect(['elimination', 'spike_detonate', 'spike_defuse']).toContain(
      m.roundEnd!.reason,
    )
    expect(fighter(m, P0).credits).toBeGreaterThan(SPIKE_START_CREDITS)
  })

  it('returns to buy phase for the next round', () => {
    let seed = 0.3
    const random = () => {
      seed = (seed * 7.3 + 0.09) % 1
      return seed
    }
    let m = beginPlaying({
      firstUid: P1,
      agent0: SPIKE_AGENT_IDS[3]!,
      agent1: SPIKE_AGENT_IDS[0]!,
      random,
    })
    for (let i = 0; i < 100 && m.phase === 'playing'; i += 1) {
      const uid = m.turnUid
      const id = fighter(m, uid).hand.find(
        (c) => canPlaySpikeCard(m, uid, c) == null,
      )
      if (!id) break
      m = playSpikeCard(m, uid, id, random)!
    }
    if (m.phase === 'round_over') {
      const next = startNextSpikeRound(m, random)
      expect(next.phase).toBe('buy')
      expect(
        (next.rounds[P0] ?? 0) + (next.rounds[P1] ?? 0),
      ).toBeGreaterThan(0)
      expect(fighter(next, P0).gunId).toBe('classic')
      expect(fighter(next, P0).buyReady).toBe(false)
    }
  })

  it('eliminates on lethal damage and awards the other seat', () => {
    let m = beginPlaying({
      firstUid: P0,
      agent0: SPIKE_AGENT_IDS[0]!,
      agent1: SPIKE_AGENT_IDS[1]!,
      random: () => 0.4,
    })
    m = {
      ...withFighter(m, P0, {
        hand: ['spray_transfer'],
        persist: null,
        ultCharge: 0,
      }),
      turnUid: P0,
      spike: null,
    }
    m = withFighter(m, P1, { persist: null, hp: 1 })
    m = playSpikeCard(m, P0, 'spray_transfer', alwaysHigh)!
    expect(m.phase).toBe('round_over')
    expect(m.roundEnd?.reason).toBe('elimination')
    expect(m.roundEnd?.winnerUid).toBe(P0)
    expect(m.roundEnd?.summary).toContain(householdName(P1))
  })
})

describe('spike ult meter', () => {
  it('does not charge +1 on a normal fight hit', () => {
    let m = beginPlaying({
      firstUid: P0,
      agent0: SPIKE_AGENT_IDS[0]!,
      agent1: SPIKE_AGENT_IDS[1]!,
      random: () => 0.4,
    })
    m = {
      ...withFighter(m, P0, {
        hand: ['spray_transfer'],
        ultCharge: 0,
        persist: null,
      }),
      turnUid: P0,
      spike: null,
    }
    m = withFighter(m, P1, { persist: null, hp: 100 })
    m = playSpikeCard(m, P0, 'spray_transfer', alwaysHigh)!
    expect(fighter(m, P0).ultCharge).toBe(0)
  })

  it('charges +1 on Grab Ult Orb hit or safe graze', () => {
    let m = beginPlaying({
      firstUid: P0,
      agent0: SPIKE_AGENT_IDS[0]!,
      agent1: SPIKE_AGENT_IDS[1]!,
      random: () => 0.4,
    })
    m = {
      ...withFighter(m, P0, {
        hand: ['grab_ult_orb'],
        ultCharge: 1,
        persist: null,
      }),
      turnUid: P0,
      spike: null,
    }
    m = withFighter(m, P1, { persist: null, hp: 100 })
    m = playSpikeCard(m, P0, 'grab_ult_orb', alwaysHigh)!
    expect(fighter(m, P0).ultCharge).toBe(2)
  })

  it('blocks ult until full, then spends charge on play', () => {
    let m = beginPlaying({
      firstUid: P0,
      agent0: SPIKE_AGENT_IDS[0]!,
      agent1: SPIKE_AGENT_IDS[1]!,
      random: () => 0.4,
    })
    const ult = spikeUltCard(fighter(m, P0).agentId)!
    expect(ult.kind).toBe('ult')

    m = {
      ...withFighter(m, P0, {
        ultCharge: SPIKE_ULT_COST - 1,
        persist: null,
      }),
      turnUid: P0,
      spike: null,
    }
    m = withFighter(m, P1, { persist: null, hp: 100 })
    expect(canPlaySpikeCard(m, P0, ult.id)).toBe('Ult not ready')

    m = withFighter(m, P0, { ultCharge: SPIKE_ULT_COST })
    expect(canPlaySpikeCard(m, P0, ult.id)).toBeNull()

    m = playSpikeCard(m, P0, ult.id, alwaysHigh)!
    expect(fighter(m, P0).ultCharge).toBe(0)
  })

  it('carries ult charge into the next buy phase', () => {
    let m = beginPlaying({
      firstUid: P0,
      agent0: SPIKE_AGENT_IDS[0]!,
      agent1: SPIKE_AGENT_IDS[1]!,
      random: () => 0.4,
    })
    m = {
      ...withFighter(m, P0, { ultCharge: 4, hand: [], persist: null }),
      phase: 'round_over',
      rounds: { [P0]: 1, [P1]: 0 },
      roundEnd: {
        reason: 'elimination',
        winnerUid: P0,
        summary: 'test',
      },
      matchEnd: null,
    }
    m = withFighter(m, P1, { hand: [], persist: null })
    const next = startNextSpikeRound(m, () => 0.4)
    expect(next.phase).toBe('buy')
    expect(fighter(next, P0).ultCharge).toBe(4)
  })

  it('gives every roster agent an ult and five unique cards', () => {
    for (const agentId of SPIKE_AGENT_IDS) {
      const ult = spikeUltCard(agentId)
      expect(ult, agentId).not.toBeNull()
      expect(ult!.kind).toBe('ult')
      expect(ult!.agentId).toBe(agentId)

      const uniques = SPIKE_CARDS.filter(
        (c) => c.agentId === agentId && c.kind !== 'ult',
      )
      expect(uniques.length, agentId).toBe(5)
    }
  })

  it('puts one special card in opening hands (50/50 orb vs unique)', () => {
    let orbHands = 0
    let uniqueHands = 0
    const trials = 100
    for (let i = 0; i < trials; i += 1) {
      let seed = (i + 1) * 0.017
      const rng = () => {
        seed = (seed * 9.7 + 0.13) % 1
        return seed
      }
      const m = beginPlaying({
        firstUid: P0,
        agent0: SPIKE_AGENT_IDS[0]!,
        agent1: SPIKE_AGENT_IDS[1]!,
        random: rng,
      })
      const p0 = fighter(m, P0)
      const p1 = fighter(m, P1)
      const hasOrb = p0.hand.includes('grab_ult_orb')
      const hasUnique = p0.hand.some(
        (id) => spikeCard(id)?.agentId === p0.agentId,
      )
      if (hasOrb) orbHands += 1
      if (hasUnique) uniqueHands += 1
      expect(hasOrb || hasUnique).toBe(true)
      expect(
        p0.hand.every((id) => {
          const c = spikeCard(id)
          return !c?.agentId || c.agentId === p0.agentId
        }),
      ).toBe(true)
      // Site plant/defuse are buttons — never dealt into hands.
      expect(
        p0.hand.every((id) => {
          const c = spikeCard(id)
          return !c?.plant && !c?.defuse && id !== 'fake_plant'
        }),
      ).toBe(true)
      expect(
        p1.hand.every((id) => {
          const c = spikeCard(id)
          return !c?.plant && !c?.defuse && id !== 'fake_plant'
        }),
      ).toBe(true)
    }
    expect(orbHands / trials).toBeGreaterThan(0.25)
    expect(orbHands / trials).toBeLessThan(0.75)
    expect(uniqueHands / trials).toBeGreaterThan(0.25)
  })

  it('never deals plant or defuse cards from the shared deck', () => {
    for (let i = 0; i < 40; i += 1) {
      let seed = (i + 1) * 0.031
      const rng = () => {
        seed = (seed * 11.3 + 0.19) % 1
        return seed
      }
      const m = beginPlaying({ firstUid: P0, random: rng })
      for (const uid of [P0, P1] as const) {
        const f = fighter(m, uid)
        expect(
          f.hand.every((id) => {
            const c = spikeCard(id)
            return !c?.plant && !c?.defuse && id !== 'fake_plant'
          }),
        ).toBe(true)
      }
    }
  })

  it('unlocks site plant after 3 encounter hits', () => {
    let m = beginPlaying({
      firstUid: P0,
      agent0: SPIKE_AGENT_IDS[0]!,
      agent1: SPIKE_AGENT_IDS[1]!,
      random: () => 0.99,
    })
    m = {
      ...withFighter(m, P0, {
        encounters: 2,
        hand: ['spray_transfer'],
        persist: null,
      }),
      turnUid: P0,
      spike: null,
    }
    expect(canPlaySpikeSite(m, P0, 'plant')).toMatch(/Need/)
    m = playSpikeCard(m, P0, 'spray_transfer', () => 0.99)!
    expect(fighter(m, P0).encounters).toBe(3)
    m = { ...m, turnUid: P0 }
    expect(canPlaySpikeSite(m, P0, 'plant')).toBeNull()
    m = playSpikeSite(m, P0, 'plant', () => 0.99)!
    expect(m.spike).not.toBeNull()
  })
})
