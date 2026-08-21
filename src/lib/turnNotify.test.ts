import { describe, expect, it } from 'vitest'
import { arcadeTurnNotifyUid, scrabbleTurnNotifyUid } from './turnNotify'

const jo = 'cBSmIOeTysM7hzi5Xnm7rkmsUFW2'
const joha = 'PLxEvRfAjSbj7kQumrbQ5xHF4S03'

describe('arcadeTurnNotifyUid', () => {
  it('notifies the new turn seat', () => {
    expect(
      arcadeTurnNotifyUid(
        { status: 'playing', turnUid: jo, hotseat: false },
        { status: 'playing', turnUid: joha, hotseat: false },
      ),
    ).toBe(joha)
  })

  it('skips unchanged turns', () => {
    expect(
      arcadeTurnNotifyUid(
        { status: 'playing', turnUid: jo },
        { status: 'playing', turnUid: jo },
      ),
    ).toBeNull()
  })

  it('skips hotseat', () => {
    expect(
      arcadeTurnNotifyUid(
        { status: 'playing', turnUid: jo, hotseat: false },
        { status: 'playing', turnUid: joha, hotseat: true },
      ),
    ).toBeNull()
  })

  it('skips finished games', () => {
    expect(
      arcadeTurnNotifyUid(
        { status: 'playing', turnUid: jo },
        { status: 'finished', turnUid: joha },
      ),
    ).toBeNull()
  })

  it('notifies when a new game starts', () => {
    expect(
      arcadeTurnNotifyUid(
        { status: 'finished', turnUid: joha },
        { status: 'playing', turnUid: jo },
      ),
    ).toBe(jo)
  })

  it('skips Wordle setup phases even when status is playing', () => {
    expect(
      arcadeTurnNotifyUid(
        { status: 'playing', phase: 'pickMode', turnUid: jo },
        { status: 'playing', phase: 'versusSetup', turnUid: joha },
      ),
    ).toBeNull()
  })

  it('notifies when Wordle enters playing and turn is yours', () => {
    expect(
      arcadeTurnNotifyUid(
        { status: 'playing', phase: 'versusSetup', turnUid: jo },
        { status: 'playing', phase: 'playing', turnUid: joha },
      ),
    ).toBe(joha)
  })

  it('skips Chess while white seat is unset', () => {
    expect(
      arcadeTurnNotifyUid(
        { status: 'playing', turnUid: jo, whiteUid: null },
        { status: 'playing', turnUid: joha, whiteUid: null },
      ),
    ).toBeNull()
  })

  it('notifies Chess when the turn flips after white is set', () => {
    expect(
      arcadeTurnNotifyUid(
        { status: 'playing', turnUid: jo, whiteUid: jo, hotseat: false },
        { status: 'playing', turnUid: joha, whiteUid: jo, hotseat: false },
      ),
    ).toBe(joha)
  })

  it('keeps scrabbleTurnNotifyUid as an alias', () => {
    expect(scrabbleTurnNotifyUid).toBe(arcadeTurnNotifyUid)
  })
})
