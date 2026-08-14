import { JENGA_PLAYER_UIDS, pickTwoJengaCats } from './jenga'

export const CODENAMES_SIZE = 25

export const CODENAMES_WORDS = [
  'apple','arm','back','band','bank','bar','bass','bat','beam','bear',
  'beat','bed','bee','bell','berry','bill','block','board','bomb','bond',
  'boom','boot','bottle','bow','box','branch','bug','cape','card','case',
  'cast','cat','cell','cent','charge','check','chick','chip','club','coach',
  'code','cold','comic','compound','cook','copper','crane','crash','cricket','cross',
  'crow','date','deck','degree','diamond','dice','dinosaur','doctor','dog','dress',
  'drill','drop','duck','eagle','egypt','engine','face','fall','fan','fence',
  'field','file','film','fire','fish','fly','force','fox','gas','ghost',
  'giant','glass','gold','grass','green','ground','hand','hawk','head','heart',
  'helicopter','hole','hood','hook','horn','horse','hospital','hotel','ice','india',
  'iron','ivory','jam','jet','jupiter','kangaroo','ketchup','key','kid','king',
  'kiwi','knife','knight','lab','lap','laser','lawyer','lead','lemon','life',
  'light','limousine','link','lion','litter','loch','lock','log','london','luck',
  'mail','maple','marble','mask','match','mercury','mexico','microscope','millionaire','mint',
  'missile','model','moon','moscow','mount','mouse','mouth','mug','nail','needle',
  'net','new york','night','note','novel','nurse','nut','octopus','oil','olive',
  'olympus','opera','orange','organ','palm','pan','pants','paper','parachute','park',
  'part','pass','paste','penguin','phoenix','piano','pie','pilot','pin','pipe',
  'pirate','pistol','pit','pitch','plane','plastic','plate','platypus','play','plot',
  'point','poison','pole','police','pool','port','post','pound','press','prince',
  'pyramid','queen','rabbit','racket','ray','revolution','ring','robin','robot','rock',
  'rome','root','rose','roulette','round','row','ruler','satellite','saturn','scale',
  'school','scientist','scorpion','screen','scuba','seal','server','shadow','shakespeare','shark',
  'ship','shoe','shop','shot','sink','skyscraper','slip','slug','smuggler','snow',
  'snowman','sock','soldier','soul','sound','space','spell','spider','spike','spine',
  'spot','spring','spy','square','stadium','staff','star','state','stream','strike',
  'string','sub','suit','superhero','swing','switch','table','tablet','tag','tail',
  'tap','teacher','telescope','temple','theater','thumb','tick','tie','time','tokyo',
  'tooth','torch','tower','track','train','triangle','trip','trunk','tube','turkey',
  'unicorn','vacuum','van','vet','wake','wall','war','washer','watch','water',
  'wave','web','well','whale','whip','wind','witch','worm','yard','zebra',
] as const

export type CodenameTeam = 'red' | 'blue' | 'neutral' | 'assassin'

export type CodenamesCard = {
  id: number
  word: string
  team: CodenameTeam
  revealed: boolean
}

export type CodenamesPhase = 'clue' | 'guess' | 'finished'

export type CodenamesState = {
  cards: CodenamesCard[]
  /** Whose team is acting. */
  turnTeam: 'red' | 'blue'
  phase: CodenamesPhase
  clue: string | null
  clueCount: number | null
  guessesLeft: number
  status: 'playing' | 'won'
  winnerTeam: 'red' | 'blue' | null
  hotseat: boolean
  cats: [string, string]
  version: number
  roundId: string
  updatedAt: number
}

function newRoundId(): string {
  return `cdn-${Date.now().toString(36)}-${Math.floor(Math.random() * 1e9).toString(36)}`
}

function shuffle<T>(arr: T[], random: () => number): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1))
    ;[a[i], a[j]] = [a[j]!, a[i]!]
  }
  return a
}

export function dealCodenames(
  random: () => number = Math.random,
): CodenamesCard[] {
  const pool = shuffle(
    CODENAMES_WORDS.filter((w) => !w.includes(' ')),
    random,
  ).slice(0, CODENAMES_SIZE)
  // 9 red, 8 blue, 7 neutral, 1 assassin (red starts)
  const teams: CodenameTeam[] = [
    ...Array.from({ length: 9 }, () => 'red' as const),
    ...Array.from({ length: 8 }, () => 'blue' as const),
    ...Array.from({ length: 7 }, () => 'neutral' as const),
    'assassin',
  ]
  const assigned = shuffle(teams, random)
  return pool.map((word, i) => ({
    id: i,
    word: word.toUpperCase(),
    team: assigned[i]!,
    revealed: false,
  }))
}

export function createInitialCodenames(
  opts?: { hotseat?: boolean; random?: () => number },
): CodenamesState {
  return {
    cards: dealCodenames(opts?.random),
    turnTeam: 'red',
    phase: 'clue',
    clue: null,
    clueCount: null,
    guessesLeft: 0,
    status: 'playing',
    winnerTeam: null,
    hotseat: Boolean(opts?.hotseat),
    cats: pickTwoJengaCats(),
    version: 1,
    roundId: newRoundId(),
    updatedAt: Date.now(),
  }
}

export function teamForUid(uid: string): 'red' | 'blue' | null {
  if (uid === JENGA_PLAYER_UIDS[0]) return 'red'
  if (uid === JENGA_PLAYER_UIDS[1]) return 'blue'
  return null
}

export function uidForTeam(team: 'red' | 'blue'): string {
  return team === 'red' ? JENGA_PLAYER_UIDS[0]! : JENGA_PLAYER_UIDS[1]!
}

export function remainingForTeam(
  cards: CodenamesCard[],
  team: 'red' | 'blue',
): number {
  return cards.filter((c) => c.team === team && !c.revealed).length
}

export function submitCodenamesClue(
  state: CodenamesState,
  uid: string,
  clue: string,
  count: number,
): CodenamesState | null {
  if (state.status !== 'playing' || state.phase !== 'clue') return null
  const team = teamForUid(uid)
  if (!team || team !== state.turnTeam) return null
  const text = clue.trim()
  if (!text || text.includes(' ')) return null
  const n = Math.floor(count)
  if (n < 0 || n > 9) return null
  return {
    ...state,
    clue: text.toUpperCase(),
    clueCount: n,
    guessesLeft: n === 0 ? 1 : n + 1,
    phase: 'guess',
    updatedAt: Date.now(),
  }
}

export function applyCodenamesGuess(
  state: CodenamesState,
  uid: string,
  cardId: number,
): CodenamesState | null {
  if (state.status !== 'playing' || state.phase !== 'guess') return null
  const team = teamForUid(uid)
  if (!team || team !== state.turnTeam) return null
  const card = state.cards.find((c) => c.id === cardId)
  if (!card || card.revealed) return null

  const cards = state.cards.map((c) =>
    c.id === cardId ? { ...c, revealed: true } : c,
  )

  if (card.team === 'assassin') {
    return {
      ...state,
      cards,
      status: 'won',
      phase: 'finished',
      winnerTeam: team === 'red' ? 'blue' : 'red',
      guessesLeft: 0,
      updatedAt: Date.now(),
    }
  }

  if (remainingForTeam(cards, team) === 0) {
    return {
      ...state,
      cards,
      status: 'won',
      phase: 'finished',
      winnerTeam: team,
      guessesLeft: 0,
      updatedAt: Date.now(),
    }
  }

  const correct = card.team === team
  if (!correct) {
    // Wrong card ends turn
    const nextTeam = team === 'red' ? 'blue' : 'red'
    return {
      ...state,
      cards,
      turnTeam: nextTeam,
      phase: 'clue',
      clue: null,
      clueCount: null,
      guessesLeft: 0,
      updatedAt: Date.now(),
    }
  }

  const guessesLeft = state.guessesLeft - 1
  if (guessesLeft <= 0) {
    const nextTeam = team === 'red' ? 'blue' : 'red'
    return {
      ...state,
      cards,
      turnTeam: nextTeam,
      phase: 'clue',
      clue: null,
      clueCount: null,
      guessesLeft: 0,
      updatedAt: Date.now(),
    }
  }

  return {
    ...state,
    cards,
    guessesLeft,
    updatedAt: Date.now(),
  }
}

export function endCodenamesGuesses(
  state: CodenamesState,
  uid: string,
): CodenamesState | null {
  if (state.status !== 'playing' || state.phase !== 'guess') return null
  const team = teamForUid(uid)
  if (!team || team !== state.turnTeam) return null
  const nextTeam = team === 'red' ? 'blue' : 'red'
  return {
    ...state,
    turnTeam: nextTeam,
    phase: 'clue',
    clue: null,
    clueCount: null,
    guessesLeft: 0,
    updatedAt: Date.now(),
  }
}

function clampNum(n: unknown, fallback = 0): number {
  const x = typeof n === 'number' ? n : Number(n)
  return Number.isFinite(x) ? x : fallback
}

export function normalizeCodenames(raw: unknown): CodenamesState {
  if (!raw || typeof raw !== 'object') return createInitialCodenames()
  const s = raw as Record<string, unknown>
  const base = createInitialCodenames({ hotseat: Boolean(s.hotseat) })
  const cards: CodenamesCard[] = []
  if (Array.isArray(s.cards)) {
    for (const row of s.cards) {
      if (!row || typeof row !== 'object') continue
      const r = row as Record<string, unknown>
      const team =
        r.team === 'red' ||
        r.team === 'blue' ||
        r.team === 'neutral' ||
        r.team === 'assassin'
          ? r.team
          : 'neutral'
      cards.push({
        id: Math.floor(clampNum(r.id, cards.length)),
        word: typeof r.word === 'string' ? r.word : '???',
        team,
        revealed: Boolean(r.revealed),
      })
    }
  }
  return {
    ...base,
    cards: cards.length === CODENAMES_SIZE ? cards : base.cards,
    turnTeam: s.turnTeam === 'blue' ? 'blue' : 'red',
    phase:
      s.phase === 'guess' || s.phase === 'finished' || s.phase === 'clue'
        ? s.phase
        : 'clue',
    clue: typeof s.clue === 'string' ? s.clue : null,
    clueCount:
      typeof s.clueCount === 'number' && Number.isFinite(s.clueCount)
        ? Math.floor(s.clueCount)
        : null,
    guessesLeft: Math.max(0, Math.floor(clampNum(s.guessesLeft, 0))),
    status: s.status === 'won' ? 'won' : 'playing',
    winnerTeam:
      s.winnerTeam === 'red' || s.winnerTeam === 'blue' ? s.winnerTeam : null,
    hotseat: Boolean(s.hotseat),
    version: Math.max(1, Math.floor(clampNum(s.version, 1))),
    roundId: typeof s.roundId === 'string' ? s.roundId : base.roundId,
    updatedAt: Math.floor(clampNum(s.updatedAt, Date.now())),
  }
}
