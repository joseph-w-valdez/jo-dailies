/** Pictionary word cards, themes, and round modifiers. */

export type PictionaryDifficulty = 'easy' | 'medium' | 'hard'

export const PICTIONARY_DIFFICULTIES: readonly PictionaryDifficulty[] = [
  'easy',
  'medium',
  'hard',
]

/** Max points a guesser can earn for each difficulty (instant guess). */
export const PICTIONARY_DIFFICULTY_POINTS: Record<PictionaryDifficulty, number> = {
  easy: 100,
  medium: 200,
  hard: 300,
}

export const PICTIONARY_DIFFICULTY_LABEL: Record<PictionaryDifficulty, string> = {
  easy: 'Easy',
  medium: 'Medium',
  hard: 'Hard',
}

export type PictionaryThemeId =
  | 'animals'
  | 'food'
  | 'household'
  | 'places'
  | 'actions'
  | 'movies'
  | 'holidays'
  | 'cats'
  | 'valorant'
  | 'idioms'

/** `all` mixes every built-in theme (plus custom cards when present). */
export type PictionaryDeckId = 'all' | PictionaryThemeId | 'custom'

export const PICTIONARY_CUSTOM_THEME = 'custom'

export type PictionaryCard = {
  id: string
  word: string
  difficulty: PictionaryDifficulty
  /** Theme id, or `custom`. */
  theme: string
}

type ThemeDef = {
  id: PictionaryThemeId
  label: string
  emoji: string
  words: Record<PictionaryDifficulty, readonly string[]>
}

const THEMES: readonly ThemeDef[] = [
  {
    id: 'animals',
    label: 'Animals',
    emoji: '🐾',
    words: {
      easy: ['cat', 'dog', 'fish', 'bird', 'snake', 'cow', 'pig', 'duck', 'frog', 'bee', 'spider', 'turtle'],
      medium: ['giraffe', 'elephant', 'penguin', 'octopus', 'kangaroo', 'flamingo', 'crab', 'bat', 'owl', 'snail', 'jellyfish', 'peacock'],
      hard: ['platypus', 'chameleon', 'narwhal', 'sloth', 'armadillo', 'seahorse', 'porcupine', 'axolotl', 'hedgehog', 'walrus', 'moth', 'anteater'],
    },
  },
  {
    id: 'food',
    label: 'Food',
    emoji: '🍕',
    words: {
      easy: ['pizza', 'apple', 'banana', 'egg', 'cake', 'ice cream', 'cookie', 'carrot', 'cheese', 'bread', 'donut', 'cherry'],
      medium: ['sushi', 'taco', 'hamburger', 'spaghetti', 'pancakes', 'popcorn', 'hot dog', 'watermelon', 'pineapple', 'croissant', 'burrito', 'corn on the cob'],
      hard: ['dumplings', 'boba tea', 'fondue', 'gingerbread house', 'ramen', 'lasagna', "s'mores", 'charcuterie board', 'fortune cookie', 'kebab', 'pretzel', 'avocado toast'],
    },
  },
  {
    id: 'household',
    label: 'Household',
    emoji: '🏠',
    words: {
      easy: ['chair', 'lamp', 'bed', 'door', 'clock', 'cup', 'key', 'spoon', 'window', 'book', 'phone', 'toothbrush'],
      medium: ['toaster', 'umbrella', 'ladder', 'vacuum', 'couch', 'bathtub', 'mirror', 'fridge', 'scissors', 'candle', 'remote control', 'laundry basket'],
      hard: ['ceiling fan', 'smoke alarm', 'ironing board', 'doorbell', 'thermostat', 'coat hanger', 'power strip', 'blender', 'mousetrap', 'rocking chair', 'extension cord', 'shower curtain'],
    },
  },
  {
    id: 'places',
    label: 'Places',
    emoji: '🗺️',
    words: {
      easy: ['house', 'beach', 'school', 'park', 'castle', 'farm', 'island', 'cave', 'bridge', 'mountain', 'desert', 'tent'],
      medium: ['airport', 'hospital', 'library', 'zoo', 'lighthouse', 'volcano', 'waterfall', 'playground', 'gas station', 'museum', 'bowling alley', 'movie theater'],
      hard: ['Eiffel Tower', 'Statue of Liberty', 'pyramids', 'Great Wall of China', 'Golden Gate Bridge', 'Stonehenge', 'Leaning Tower of Pisa', 'Mount Rushmore', 'Disneyland', 'Las Vegas', 'Venice', 'Hollywood sign'],
    },
  },
  {
    id: 'actions',
    label: 'Actions',
    emoji: '🏃',
    words: {
      easy: ['run', 'jump', 'sleep', 'swim', 'eat', 'cry', 'laugh', 'sing', 'dance', 'read', 'wave', 'fly'],
      medium: ['juggling', 'skateboarding', 'fishing', 'sneezing', 'yawning', 'painting', 'bowling', 'surfing', 'knitting', 'hiking', 'brushing teeth', 'taking a selfie'],
      hard: ['sleepwalking', 'procrastinating', 'moonwalking', 'photobombing', 'parallel parking', 'eavesdropping', 'daydreaming', 'binge-watching', 'tightrope walking', 'hiccuping', 'ghosting', 'meditating'],
    },
  },
  {
    id: 'movies',
    label: 'Movies & TV',
    emoji: '🎬',
    words: {
      easy: ['Frozen', 'Cars', 'Shrek', 'Batman', 'Spider-Man', 'Toy Story', 'Finding Nemo', 'Star Wars', 'Harry Potter', 'Jaws', 'Up', 'The Lion King'],
      medium: ['Titanic', 'Jurassic Park', 'Ghostbusters', 'The Wizard of Oz', 'Ratatouille', 'Minions', 'Stranger Things', 'Inside Out', 'Pirates of the Caribbean', 'SpongeBob', 'The Simpsons', 'Avatar'],
      hard: ['Inception', 'The Matrix', 'Back to the Future', 'Squid Game', 'Breaking Bad', 'The Office', 'Everything Everywhere All at Once', 'Spirited Away', 'Groundhog Day', 'Home Alone', 'Get Out', 'The Truman Show'],
    },
  },
  {
    id: 'holidays',
    label: 'Holidays',
    emoji: '🎉',
    words: {
      easy: ['Christmas tree', 'pumpkin', 'snowman', 'present', 'candy cane', 'Easter egg', 'fireworks', 'heart', 'birthday cake', 'ghost', 'turkey', 'balloon'],
      medium: ["jack-o'-lantern", 'Santa Claus', 'reindeer', 'mistletoe', 'Easter bunny', 'menorah', 'piñata', "New Year's Eve", 'trick-or-treat', 'stocking', 'valentine', 'four-leaf clover'],
      hard: ['Day of the Dead', 'Lunar New Year', 'Thanksgiving dinner', 'ugly sweater', "New Year's resolution", 'Mardi Gras', 'gingerbread man', 'Fourth of July', 'Hanukkah', 'Diwali', 'Secret Santa', "April Fools' Day"],
    },
  },
  {
    id: 'cats',
    label: 'Cats',
    emoji: '🐱',
    words: {
      easy: ['kitten', 'yarn ball', 'mouse', 'fish bone', 'litter box', 'whiskers', 'paw', 'cat tail', 'collar', 'catnip', 'scratching post', 'cat bed'],
      medium: ['cat nap', 'tabby', 'cat tree', 'laser pointer', 'hairball', 'cardboard box', 'Cheshire Cat', 'cat café', 'Garfield', 'Hello Kitty', 'cat burglar', 'cone of shame'],
      hard: ['zoomies', 'making biscuits', 'catloaf', 'if I fits I sits', 'nine lives', 'curiosity killed the cat', 'purring', "Schrödinger's cat", 'cat ears', 'crazy cat lady', 'knocking things off the table', 'cat-astrophe'],
    },
  },
  {
    id: 'valorant',
    label: 'Valorant',
    emoji: '🎯',
    words: {
      easy: ['Spike', 'Vandal', 'Operator', 'Sheriff', 'smoke', 'wall', 'knife', 'shield', 'headshot', 'sniper', 'grenade', 'Phantom'],
      medium: ['Jett', 'Sova', 'Sage', 'Killjoy', 'Reyna', 'Viper', 'Phoenix', 'Cypher', 'Ascent', 'Icebox', 'Bind', 'Haven'],
      hard: ['Ace', 'clutch', 'eco round', 'defuse', 'ninja defuse', 'one tap', 'Thrifty', 'flank', 'lurk', 'rotate', 'spray transfer', 'Spike plant'],
    },
  },
  {
    id: 'idioms',
    label: 'Idioms',
    emoji: '💡',
    words: {
      easy: ['piece of cake', 'cold feet', 'couch potato', 'night owl', 'fish out of water', 'top dog', 'hot potato', 'big cheese', 'early bird', 'bookworm', 'butterflies in your stomach', 'green thumb'],
      medium: ['break the ice', 'raining cats and dogs', 'spill the beans', 'under the weather', 'elephant in the room', 'hit the sack', 'cry over spilled milk', 'cost an arm and a leg', 'let the cat out of the bag', 'head in the clouds', 'once in a blue moon', 'bite the bullet'],
      hard: ['kill two birds with one stone', 'the ball is in your court', 'burn the midnight oil', 'a penny for your thoughts', 'beat around the bush', 'bite off more than you can chew', 'barking up the wrong tree', 'the last straw', 'jump on the bandwagon', 'a blessing in disguise', "steal someone's thunder", 'wild goose chase'],
    },
  },
]

export function pictionaryCardSlug(word: string): string {
  return word
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48)
}

function buildCards(theme: ThemeDef): PictionaryCard[] {
  const out: PictionaryCard[] = []
  for (const difficulty of PICTIONARY_DIFFICULTIES) {
    for (const word of theme.words[difficulty]) {
      out.push({
        id: `${theme.id}:${pictionaryCardSlug(word)}`,
        word,
        difficulty,
        theme: theme.id,
      })
    }
  }
  return out
}

export type PictionaryTheme = {
  id: PictionaryThemeId
  label: string
  emoji: string
  cards: readonly PictionaryCard[]
}

export const PICTIONARY_THEMES: readonly PictionaryTheme[] = THEMES.map(
  (theme) => ({
    id: theme.id,
    label: theme.label,
    emoji: theme.emoji,
    cards: buildCards(theme),
  }),
)

const THEME_BY_ID = new Map(PICTIONARY_THEMES.map((t) => [t.id, t]))

export function isPictionaryThemeId(raw: unknown): raw is PictionaryThemeId {
  return typeof raw === 'string' && THEME_BY_ID.has(raw as PictionaryThemeId)
}

export function isPictionaryDeckId(raw: unknown): raw is PictionaryDeckId {
  return raw === 'all' || raw === PICTIONARY_CUSTOM_THEME || isPictionaryThemeId(raw)
}

export function pictionaryThemeLabel(theme: string): string {
  if (theme === PICTIONARY_CUSTOM_THEME) return 'Custom'
  return THEME_BY_ID.get(theme as PictionaryThemeId)?.label ?? 'Mixed'
}

export function pictionaryThemeEmoji(theme: string): string {
  if (theme === PICTIONARY_CUSTOM_THEME) return '✏️'
  return THEME_BY_ID.get(theme as PictionaryThemeId)?.emoji ?? '🎲'
}

export function pictionaryDeckLabel(deck: PictionaryDeckId | null): string {
  if (deck == null) return 'No deck'
  if (deck === 'all') return 'All themes'
  return pictionaryThemeLabel(deck)
}

/** Every card the deck can deal from. */
export function pictionaryDeckPool(
  deck: PictionaryDeckId,
  customCards: readonly PictionaryCard[],
): PictionaryCard[] {
  if (deck === 'all') {
    return [...PICTIONARY_THEMES.flatMap((t) => t.cards), ...customCards]
  }
  if (deck === PICTIONARY_CUSTOM_THEME) return [...customCards]
  return [...(THEME_BY_ID.get(deck)?.cards ?? [])]
}

export type PictionaryModifierId =
  | 'offhand'
  | 'oneline'
  | 'noeraser'
  | 'mono'
  | 'tiny'
  | 'shapes'
  | 'eyesclosed'
  | 'speed'

export type PictionaryModifier = {
  id: PictionaryModifierId
  label: string
  blurb: string
  /** Tools the canvas locks while this modifier is active. */
  locks?: { eraser?: boolean; color?: string; size?: number }
  /** Round length override (ms). */
  turnMs?: number
  /** Multiplier on both players' points. */
  pointsMultiplier?: number
}

export const PICTIONARY_MODIFIERS: readonly PictionaryModifier[] = [
  { id: 'offhand', label: 'Off hand', blurb: 'Draw with your non-dominant hand.' },
  { id: 'oneline', label: 'One line', blurb: 'Try not to lift the pen — one continuous line.' },
  { id: 'noeraser', label: 'No eraser', blurb: 'Eraser, undo and clear are locked.', locks: { eraser: true } },
  { id: 'mono', label: 'Black ink', blurb: 'One color only.', locks: { color: '#111827' } },
  { id: 'tiny', label: 'Fine tip', blurb: 'Thinnest brush only.', locks: { size: 3 } },
  { id: 'shapes', label: 'Shapes only', blurb: 'Only circles, squares and straight lines.' },
  { id: 'eyesclosed', label: 'Eyes closed', blurb: 'Keep your eyes shut for the first 5 seconds.' },
  { id: 'speed', label: 'Speed round', blurb: 'Half the time, double the points.', turnMs: 30_000, pointsMultiplier: 2 },
]

const MODIFIER_BY_ID = new Map(PICTIONARY_MODIFIERS.map((m) => [m.id, m]))

export function pictionaryModifier(
  id: string | null | undefined,
): PictionaryModifier | null {
  if (!id) return null
  return MODIFIER_BY_ID.get(id as PictionaryModifierId) ?? null
}
