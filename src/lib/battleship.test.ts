import { describe, expect, it } from 'vitest'
import {
  applyBattleshipShot,
  battleshipToDoc,
  cellIndex,
  createInitialBattleship,
  normalizeBattleship,
  placeShip,
  selectBattleshipFirst,
  setPlayerReady,
  type BsShip,
} from './battleship'
import { JENGA_PLAYER_UIDS } from './jenga'
import { matchFromGameTransition } from './arcadeMatches'
import { toFirestoreData } from './firebase'

const jo = JENGA_PLAYER_UIDS[0]!
const joha = JENGA_PLAYER_UIDS[1]!

function readyFleet(uid: string, state: ReturnType<typeof createInitialBattleship>) {
  let s = state
  const ships: BsShip[] = [
    { id: 'carrier', x: 0, y: 0, horizontal: true, length: 5 },
    { id: 'battleship', x: 0, y: 1, horizontal: true, length: 4 },
    { id: 'cruiser', x: 0, y: 2, horizontal: true, length: 3 },
    { id: 'submarine', x: 0, y: 3, horizontal: true, length: 3 },
    { id: 'destroyer', x: 0, y: 4, horizontal: true, length: 2 },
    { id: 'patrol', x: 0, y: 5, horizontal: true, length: 2 },
  ]
  for (const ship of ships) {
    s = placeShip(s, uid, ship)!
  }
  s = setPlayerReady(s, uid, true)!
  return s
}

describe('battleship attack history', () => {
  it('keeps hits/misses through firestore serialize + normalize', () => {
    let s = selectBattleshipFirst(createInitialBattleship(jo), jo)!
    s = readyFleet(jo, s)
    s = readyFleet(joha, s)
    expect(s.status).toBe('playing')

    s = applyBattleshipShot(s, jo, 0, 0)!
    expect(s.boards[joha]!.received[cellIndex(0, 0)]).toBe('hit')
    expect(s.shotLog).toHaveLength(1)

    s = applyBattleshipShot(s, joha, 9, 9)!
    expect(s.boards[jo]!.received[cellIndex(9, 9)]).toBe('miss')
    expect(s.shotLog).toHaveLength(2)

    const doc = toFirestoreData(battleshipToDoc(s))
    // Sparse maps — no dense null arrays on the wire.
    expect(Array.isArray((doc as { boards: Record<string, { received: unknown }> }).boards[joha]!.received)).toBe(
      false,
    )

    const roundTripped = normalizeBattleship(doc, jo)
    expect(roundTripped.boards[joha]!.received[cellIndex(0, 0)]).toBe('hit')
    expect(roundTripped.boards[jo]!.received[cellIndex(9, 9)]).toBe('miss')
    expect(roundTripped.shotLog).toHaveLength(2)
  })

  it('rebuilds marks from shotLog when received was wiped', () => {
    let s = selectBattleshipFirst(createInitialBattleship(jo), jo)!
    s = readyFleet(jo, s)
    s = readyFleet(joha, s)
    s = applyBattleshipShot(s, jo, 1, 0)!

    const broken = {
      ...battleshipToDoc(s),
      boards: {
        [jo]: { ships: s.boards[jo]!.ships, ready: true, received: {} },
        [joha]: { ships: s.boards[joha]!.ships, ready: true, received: {} },
      },
    }
    const fixed = normalizeBattleship(broken, jo)
    expect(fixed.boards[joha]!.received[cellIndex(1, 0)]).toBe('hit')
  })

  it('records cattleship finishes in match history', () => {
    const prev = {
      status: 'playing',
      roundId: 'bs-1',
      hotseat: false,
      winnerUid: null,
    }
    const next = {
      status: 'won',
      roundId: 'bs-1',
      hotseat: false,
      winnerUid: jo,
      updatedAt: 1000,
    }
    const match = matchFromGameTransition('battleship', prev, next)
    expect(match).toMatchObject({
      gameId: 'battleship',
      roundId: 'bs-1',
      winnerUid: jo,
      result: 'win',
    })
  })
})
