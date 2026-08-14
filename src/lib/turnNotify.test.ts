import { describe, expect, it } from 'vitest'
import { scrabbleTurnNotifyUid } from './turnNotify'

const jo = 'cBSmIOeTysM7hzi5Xnm7rkmsUFW2'
const joha = 'PLxEvRfAjSbj7kQumrbQ5xHF4S03'

describe('scrabbleTurnNotifyUid', () => {
  it('notifies the new turn seat', () => {
    expect(
      scrabbleTurnNotifyUid(
        { status: 'playing', turnUid: jo, hotseat: false },
        { status: 'playing', turnUid: joha, hotseat: false },
      ),
    ).toBe(joha)
  })

  it('skips unchanged turns', () => {
    expect(
      scrabbleTurnNotifyUid(
        { status: 'playing', turnUid: jo },
        { status: 'playing', turnUid: jo },
      ),
    ).toBeNull()
  })

  it('skips hotseat', () => {
    expect(
      scrabbleTurnNotifyUid(
        { status: 'playing', turnUid: jo, hotseat: false },
        { status: 'playing', turnUid: joha, hotseat: true },
      ),
    ).toBeNull()
  })

  it('skips finished games', () => {
    expect(
      scrabbleTurnNotifyUid(
        { status: 'playing', turnUid: jo },
        { status: 'finished', turnUid: joha },
      ),
    ).toBeNull()
  })

  it('notifies when a new game starts', () => {
    expect(
      scrabbleTurnNotifyUid(
        { status: 'finished', turnUid: joha },
        { status: 'playing', turnUid: jo },
      ),
    ).toBe(jo)
  })
})
