import {
  JENGA_PLAYER_UIDS,
  otherPlayerUid,
  parseOptionalSeatUid,
  pickTwoJengaCats,
} from './jenga'

export const CODENAMES_SIZE = 25
export const CODENAMES_TURNS = 9

export type CodenamesPack = 'standard' | 'full'
export type DuetRole = 'agent' | 'neutral' | 'assassin'

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
  'net','night','note','novel','nurse','nut','octopus','oil','olive',
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

/** Agents, maps, guns, and short terms that fit a Codenames tile. */
export const CODENAMES_VALORANT = [
  'jett','phoenix','sage','sova','viper','cypher','omen','raze','reyna','killjoy',
  'breach','brimstone','skye','yoru','astra','kayo','chamber','neon','fade','harbor',
  'gekko','deadlock','iso','clove','vyse','tejo','waylay',
  'ascent','bind','haven','split','icebox','breeze','fracture','pearl','lotus','sunset',
  'abyss','corrode',
  'vandal','phantom','operator','sheriff','ghost','spectre','bucky','judge','odin',
  'ares','classic','frenzy','shorty','marshal','outlaw','stinger','bulldog','guardian',
  'spike','ult','eco','ace','clutch','flash','smoke','molly','peek','site','mid',
  'heaven','orb','plant','defuse','retake','lurk','flank','util','radiant','immortal',
  'premier','unrated','credits','rotate','trade','whiff','entry','anchor','duelist',
  'sentinel','initiator','controller','knife','op','sheriffeco','headshot','wallbang',
  'oneway','popflash','postplant','pistol','thrifty','flawless','teamace','smurf',
] as const

export type CodenamesCard = {
  id: number
  word: string
  roles: Record<string, DuetRole>
  contacted: boolean
  bystanderFrom: string[]
}

export type CodenamesPhase = 'clue' | 'guess' | 'sudden' | 'finished'

export type CodenamesState = {
  cards: CodenamesCard[]
  wordPack: CodenamesPack | null
  clueUid: string | null
  phase: CodenamesPhase
  clue: string | null
  clueCount: number | null
  turnsLeft: number
  status: 'playing' | 'won' | 'lost'
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

function emptyRoles(): Record<string, DuetRole> {
  const out: Record<string, DuetRole> = {}
  for (const uid of JENGA_PLAYER_UIDS) out[uid] = 'neutral'
  return out
}

export function wordPoolForPack(pack: CodenamesPack): string[] {
  const classic = CODENAMES_WORDS.filter((w) => !w.includes(' '))
  if (pack === 'standard') return classic
  const seen = new Set(classic.map((w) => w.toLowerCase()))
  const extra = CODENAMES_VALORANT.filter((w) => {
    if (w.length > 12 || w.includes(' ')) return false
    if (seen.has(w.toLowerCase())) return false
    seen.add(w.toLowerCase())
    return true
  })
  return [...classic, ...extra]
}

function duetPairs(): [DuetRole, DuetRole][] {
  const pairs: [DuetRole, DuetRole][] = [
    ['agent', 'agent'],
    ['agent', 'agent'],
    ['agent', 'agent'],
    ['agent', 'assassin'],
    ['assassin', 'agent'],
    ['agent', 'neutral'],
    ['agent', 'neutral'],
    ['agent', 'neutral'],
    ['agent', 'neutral'],
    ['agent', 'neutral'],
    ['neutral', 'agent'],
    ['neutral', 'agent'],
    ['neutral', 'agent'],
    ['neutral', 'agent'],
    ['neutral', 'agent'],
    ['assassin', 'assassin'],
    ['assassin', 'neutral'],
    ['neutral', 'assassin'],
    ['neutral', 'neutral'],
    ['neutral', 'neutral'],
    ['neutral', 'neutral'],
    ['neutral', 'neutral'],
    ['neutral', 'neutral'],
    ['neutral', 'neutral'],
    ['neutral', 'neutral'],
  ]
  return pairs
}

export function dealCodenames(
  pack: CodenamesPack,
  random: () => number = Math.random,
): CodenamesCard[] {
  const a = JENGA_PLAYER_UIDS[0]!
  const b = JENGA_PLAYER_UIDS[1]!
  const pool = shuffle(wordPoolForPack(pack), random).slice(0, CODENAMES_SIZE)
  const pairs = shuffle(duetPairs(), random)
  return pool.map((word, i) => {
    const pair = pairs[i] ?? (['neutral', 'neutral'] as const)
    return {
      id: i,
      word: word.toUpperCase(),
      roles: { [a]: pair[0], [b]: pair[1] },
      contacted: false,
      bystanderFrom: [],
    }
  })
}

export function createInitialCodenames(
  opts?: { hotseat?: boolean },
): CodenamesState {
  return {
    cards: [],
    wordPack: null,
    clueUid: null,
    phase: 'clue',
    clue: null,
    clueCount: null,
    turnsLeft: CODENAMES_TURNS,
    status: 'playing',
    hotseat: Boolean(opts?.hotseat),
    cats: pickTwoJengaCats(),
    version: 1,
    roundId: newRoundId(),
    updatedAt: Date.now(),
  }
}

export function selectCodenamesPack(
  state: CodenamesState,
  pack: CodenamesPack,
  random: () => number = Math.random,
): CodenamesState | null {
  if (state.wordPack !== null) return null
  if (state.status !== 'playing') return null
  return {
    ...state,
    wordPack: pack,
    cards: dealCodenames(pack, random),
    updatedAt: Date.now(),
  }
}

export function selectCodenamesFirstClue(
  state: CodenamesState,
  uid: string,
): CodenamesState | null {
  if (state.wordPack === null || state.clueUid !== null) return null
  if (state.cards.length !== CODENAMES_SIZE) return null
  if (!JENGA_PLAYER_UIDS.includes(uid as (typeof JENGA_PLAYER_UIDS)[number])) {
    return null
  }
  return {
    ...state,
    clueUid: uid,
    phase: 'clue',
    updatedAt: Date.now(),
  }
}

export function roleFor(
  card: CodenamesCard,
  uid: string,
): DuetRole {
  return card.roles[uid] ?? 'neutral'
}

export function isAgentCard(card: CodenamesCard): boolean {
  return JENGA_PLAYER_UIDS.some((uid) => roleFor(card, uid) === 'agent')
}

export function remainingAgents(cards: CodenamesCard[]): number {
  return cards.filter((c) => isAgentCard(c) && !c.contacted).length
}

export function remainingForUid(
  cards: CodenamesCard[],
  uid: string,
): number {
  return cards.filter((c) => roleFor(c, uid) === 'agent' && !c.contacted).length
}

export function guesserUid(clueUid: string): string {
  return otherPlayerUid(clueUid)
}

function allAgentsFound(cards: CodenamesCard[]): boolean {
  return remainingAgents(cards) === 0
}

function finishWin(state: CodenamesState, cards: CodenamesCard[]): CodenamesState {
  return {
    ...state,
    cards,
    status: 'won',
    phase: 'finished',
    clue: null,
    clueCount: null,
    updatedAt: Date.now(),
  }
}

function finishLoss(state: CodenamesState, cards: CodenamesCard[]): CodenamesState {
  return {
    ...state,
    cards,
    status: 'lost',
    phase: 'finished',
    clue: null,
    clueCount: null,
    updatedAt: Date.now(),
  }
}

function spendTurn(state: CodenamesState, cards: CodenamesCard[]): CodenamesState {
  if (allAgentsFound(cards)) return finishWin(state, cards)
  const turnsLeft = Math.max(0, state.turnsLeft - 1)
  const clueUid = state.clueUid ? otherPlayerUid(state.clueUid) : state.clueUid
  if (turnsLeft <= 0) {
    return {
      ...state,
      cards,
      turnsLeft: 0,
      clueUid,
      phase: 'sudden',
      clue: null,
      clueCount: null,
      updatedAt: Date.now(),
    }
  }
  return {
    ...state,
    cards,
    turnsLeft,
    clueUid,
    phase: 'clue',
    clue: null,
    clueCount: null,
    updatedAt: Date.now(),
  }
}

export function submitCodenamesClue(
  state: CodenamesState,
  uid: string,
  clue: string,
  count: number,
): CodenamesState | null {
  if (state.status !== 'playing' || state.phase !== 'clue') return null
  if (!state.clueUid || uid !== state.clueUid) return null
  const text = clue.trim()
  if (!text || text.includes(' ')) return null
  const upper = text.toUpperCase()
  if (state.cards.some((c) => c.word === upper)) return null
  const n = Math.floor(count)
  if (n < 0 || n > 9) return null
  return {
    ...state,
    clue: upper,
    clueCount: n,
    phase: 'guess',
    updatedAt: Date.now(),
  }
}

export function applyCodenamesGuess(
  state: CodenamesState,
  uid: string,
  cardId: number,
): CodenamesState | null {
  if (state.status !== 'playing') return null
  const card = state.cards.find((c) => c.id === cardId)
  if (!card || card.contacted) return null
  if (card.bystanderFrom.length >= 2) return null

  if (state.phase === 'sudden') {
    const keyUid = otherPlayerUid(uid)
    if (remainingForUid(state.cards, keyUid) === 0) return null
    if (card.bystanderFrom.includes(keyUid)) return null
    const role = roleFor(card, keyUid)
    if (role === 'assassin' || role === 'neutral') {
      return finishLoss(state, touchCard(state.cards, cardId, { bystander: keyUid }))
    }
    const cards = touchCard(state.cards, cardId, { contacted: true })
    if (allAgentsFound(cards)) return finishWin(state, cards)
    return { ...state, cards, updatedAt: Date.now() }
  }

  if (state.phase !== 'guess' || !state.clueUid) return null
  if (uid !== guesserUid(state.clueUid)) return null
  const keyUid = state.clueUid
  if (card.bystanderFrom.includes(keyUid)) return null
  const role = roleFor(card, keyUid)
  if (role === 'assassin') {
    return finishLoss(state, touchCard(state.cards, cardId, { contacted: true }))
  }
  if (role === 'neutral') {
    return spendTurn(
      state,
      touchCard(state.cards, cardId, { bystander: keyUid }),
    )
  }
  const cards = touchCard(state.cards, cardId, { contacted: true })
  if (allAgentsFound(cards)) return finishWin(state, cards)
  return { ...state, cards, updatedAt: Date.now() }
}

export function endCodenamesGuesses(
  state: CodenamesState,
  uid: string,
): CodenamesState | null {
  if (state.status !== 'playing' || state.phase !== 'guess') return null
  if (!state.clueUid || uid !== guesserUid(state.clueUid)) return null
  return spendTurn(state, state.cards)
}

/** Co-op concede — mark the round lost. */
export function surrenderCodenames(
  state: CodenamesState,
): CodenamesState | null {
  if (state.status !== 'playing' || state.phase === 'finished') return null
  if (state.wordPack == null || state.clueUid == null) return null
  return finishLoss(state, state.cards)
}

function touchCard(
  cards: CodenamesCard[],
  cardId: number,
  opts: { contacted?: boolean; bystander?: string },
): CodenamesCard[] {
  return cards.map((c) => {
    if (c.id !== cardId) return c
    const bystanderFrom = opts.bystander
      ? [...new Set([...c.bystanderFrom, opts.bystander])]
      : c.bystanderFrom
    return {
      ...c,
      contacted: opts.contacted ? true : c.contacted,
      bystanderFrom,
    }
  })
}

function parseRole(raw: unknown): DuetRole {
  if (raw === 'agent' || raw === 'assassin' || raw === 'neutral') return raw
  return 'neutral'
}

function parseRoles(raw: unknown): Record<string, DuetRole> | null {
  if (!raw || typeof raw !== 'object') return null
  const o = raw as Record<string, unknown>
  const roles = emptyRoles()
  for (const uid of JENGA_PLAYER_UIDS) {
    roles[uid] = parseRole(o[uid])
  }
  return roles
}

function clampNum(n: unknown, fallback = 0): number {
  const x = typeof n === 'number' ? n : Number(n)
  return Number.isFinite(x) ? x : fallback
}

function isDuetDoc(s: Record<string, unknown>): boolean {
  if (!Array.isArray(s.cards) || s.cards.length === 0) {
    return s.wordPack === 'standard' || s.wordPack === 'full' || s.wordPack === null
  }
  const first = s.cards[0]
  return Boolean(first && typeof first === 'object' && 'roles' in first)
}

export function normalizeCodenames(raw: unknown): CodenamesState {
  if (!raw || typeof raw !== 'object') return createInitialCodenames()
  const s = raw as Record<string, unknown>
  if (!isDuetDoc(s)) return createInitialCodenames({ hotseat: Boolean(s.hotseat) })
  const base = createInitialCodenames({ hotseat: Boolean(s.hotseat) })
  const cards: CodenamesCard[] = []
  if (Array.isArray(s.cards)) {
    for (const row of s.cards) {
      if (!row || typeof row !== 'object') continue
      const r = row as Record<string, unknown>
      const roles = parseRoles(r.roles)
      if (!roles) continue
      const bystanderFrom = Array.isArray(r.bystanderFrom)
        ? r.bystanderFrom.filter(
            (id): id is string => typeof id === 'string' && Boolean(id),
          )
        : []
      cards.push({
        id: Math.floor(clampNum(r.id, cards.length)),
        word: typeof r.word === 'string' ? r.word : '???',
        roles,
        contacted: Boolean(r.contacted),
        bystanderFrom,
      })
    }
  }
  const pack =
    s.wordPack === 'standard' || s.wordPack === 'full' ? s.wordPack : null
  const phase: CodenamesPhase =
    s.phase === 'guess' ||
    s.phase === 'finished' ||
    s.phase === 'sudden' ||
    s.phase === 'clue'
      ? s.phase
      : 'clue'
  const status: CodenamesState['status'] =
    s.status === 'won' || s.status === 'lost' ? s.status : 'playing'
  return {
    ...base,
    cards: cards.length === CODENAMES_SIZE ? cards : pack ? base.cards : [],
    wordPack: pack,
    clueUid: parseOptionalSeatUid(
      s.clueUid,
      'clueUid' in s,
      null,
    ),
    phase: status === 'playing' ? phase : 'finished',
    clue: typeof s.clue === 'string' ? s.clue : null,
    clueCount:
      typeof s.clueCount === 'number' && Number.isFinite(s.clueCount)
        ? Math.floor(s.clueCount)
        : null,
    turnsLeft: Math.max(
      0,
      Math.min(CODENAMES_TURNS, Math.floor(clampNum(s.turnsLeft, CODENAMES_TURNS))),
    ),
    status,
    hotseat: Boolean(s.hotseat),
    version: Math.max(1, Math.floor(clampNum(s.version, 1))),
    roundId: typeof s.roundId === 'string' ? s.roundId : base.roundId,
    updatedAt: Math.floor(clampNum(s.updatedAt, Date.now())),
  }
}
