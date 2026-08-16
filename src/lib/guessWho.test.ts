import { describe, expect, it } from 'vitest'
import {
  agentsInGuessWhoRow,
  createInitialGuessWho,
  flipGuessWhoRole,
  guessGuessWhoAgent,
  hasUsedGuessWhoSkill,
  normalizeGuessWho,
  passGuessWhoTurn,
  pickGuessWhoSecret,
  selectGuessWhoFirst,
  surrenderGuessWho,
  toggleGuessWhoFlip,
  useGuessWhoSkill,
} from './guessWho'
import { JENGA_PLAYER_UIDS } from './jenga'
import { agentById, VALORANT_AGENTS } from './valorantAgents'

const [a, b] = JENGA_PLAYER_UIDS
const agentA = VALORANT_AGENTS[0]!.id
const agentB = VALORANT_AGENTS[1]!.id
const agentC = VALORANT_AGENTS[2]!.id

function bothPicked() {
  let state = createInitialGuessWho(a!)
  state = pickGuessWhoSecret(state, a!, agentA)!
  state = pickGuessWhoSecret(state, b!, agentB)!
  return state
}

describe('guessWho', () => {
  it('loads all valorant agents', () => {
    expect(VALORANT_AGENTS.length).toBe(29)
  })

  it('locks secrets then starts after first picker', () => {
    let state = bothPicked()
    expect(state.seats[0].secretId).toBe(agentA)
    expect(state.seats[1].secretId).toBe(agentB)
    expect(state.phase).toBe('picking')
    state = selectGuessWhoFirst(state, b!)!
    expect(state.phase).toBe('playing')
    expect(state.turnUid).toBe(b)
    expect(state.firstUid).toBe(b)
  })

  it('flips agents on your board including your own secret face', () => {
    let state = bothPicked()
    state = selectGuessWhoFirst(state, a!)!
    // Your secret face is still a candidate for *their* mystery.
    state = toggleGuessWhoFlip(state, a!, agentA)!
    expect(state.seats[0].flipped).toContain(agentA)
    state = toggleGuessWhoFlip(state, a!, agentC)!
    expect(state.seats[0].flipped).toContain(agentC)
    state = toggleGuessWhoFlip(state, a!, agentC)!
    expect(state.seats[0].flipped).not.toContain(agentC)
  })

  it('correct guess wins; wrong guess loses', () => {
    let state = bothPicked()
    state = selectGuessWhoFirst(state, a!)!
    const win = guessGuessWhoAgent(state, a!, agentB)!
    expect(win.phase).toBe('finished')
    expect(win.winnerUid).toBe(a)
    expect(win.lastGuess?.correct).toBe(true)

    const lose = guessGuessWhoAgent(state, a!, agentC)!
    expect(lose.phase).toBe('finished')
    expect(lose.winnerUid).toBe(b)
    expect(lose.lastGuess?.correct).toBe(false)
  })

  it('passes the turn', () => {
    let state = bothPicked()
    state = selectGuessWhoFirst(state, a!)!
    state = passGuessWhoTurn(state, a!)!
    expect(state.turnUid).toBe(b)
  })

  it('surrender awards the opponent', () => {
    let state = bothPicked()
    state = selectGuessWhoFirst(state, a!)!
    state = surrenderGuessWho(state, a!)!
    expect(state.winnerUid).toBe(b)
    expect(state.phase).toBe('finished')
  })

  it('normalizes legacy-ish docs and heals phase', () => {
    const remote = normalizeGuessWho(
      {
        seats: [
          { secretId: agentA, flipped: [agentC] },
          { secretId: agentB, flipped: [] },
        ],
        phase: 'picking',
        firstUid: a,
        turnUid: a,
        version: 2,
        roundId: 'gw-test',
        updatedAt: 1,
      },
      a!,
    )
    expect(remote.phase).toBe('playing')
    expect(remote.seats[0].flipped).toEqual([agentC])
  })

  it('runs once-per-game cheat skills', () => {
    let state = bothPicked()
    state = selectGuessWhoFirst(state, a!)!

    const sova = useGuessWhoSkill(state, a!, 'sova')!
    expect(sova.revealedRoleByUid[b!]).toBe(agentById(agentB)!.role)
    expect(hasUsedGuessWhoSkill(sova, a!, 'sova')).toBe(true)
    expect(useGuessWhoSkill(sova, a!, 'sova')).toBeNull()

    const cypher = useGuessWhoSkill(state, a!, 'cypher')!
    expect(cypher.nameHalfByUid[b!]).toMatch(/early|late/)

    let rng = 0
    const jett = useGuessWhoSkill(state, a!, 'jett', {
      random: () => {
        rng += 0.17
        return rng % 1
      },
    })!
    expect(jett.seats[1].flipped.length).toBe(4)
    expect(jett.seats[0].flipped.length).toBe(0)

    let cloveRng = 0
    const clove = useGuessWhoSkill(state, a!, 'clove', {
      random: () => {
        cloveRng += 0.31
        return cloveRng % 1
      },
    })!
    expect(clove.seats[1].flipped.length).toBe(4)
    expect(clove.seats[0].flipped.length).toBe(0)
    expect(clove.lastSkill?.note).toMatch(/Clove smoked/)

    const phoenix = useGuessWhoSkill(state, a!, 'phoenix')!
    expect(phoenix.flashedBoardUid).toBe(b)
    expect(phoenix.lastSkill?.note).toMatch(/Phoenix flash/)
    const afterPass = passGuessWhoTurn(phoenix, a!)!
    expect(afterPass.flashedBoardUid).toBe(b)
    const cleared = passGuessWhoTurn(afterPass, b!)!
    expect(cleared.flashedBoardUid).toBeNull()

    const secretIdx = VALORANT_AGENTS.findIndex((ag) => ag.id === agentB)
    const tejoRow = Math.floor(secretIdx / 8)
    const tejoHit = useGuessWhoSkill(state, a!, 'tejo', { row: tejoRow })!
    expect(tejoHit.lastSkill?.note).toMatch(/DIRECT HIT/)
    for (const ag of agentsInGuessWhoRow(tejoRow)) {
      expect(tejoHit.seats[0].flipped).toContain(ag.id)
    }
    const missRow = tejoRow === 0 ? 1 : 0
    const tejoMiss = useGuessWhoSkill(state, a!, 'tejo', { row: missRow })!
    expect(tejoMiss.lastSkill?.note).toMatch(/miss/)
  })

  it('bulk-flips a role for QOL', () => {
    let state = bothPicked()
    state = selectGuessWhoFirst(state, a!)!
    const role = agentById(agentC)!.role
    state = flipGuessWhoRole(state, a!, role, true)!
    for (const ag of VALORANT_AGENTS) {
      if (ag.role !== role) continue
      expect(state.seats[0].flipped).toContain(ag.id)
    }
  })
})
