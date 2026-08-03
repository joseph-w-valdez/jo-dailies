/** Overall expression a line should be delivered with. */
export type FaceMood =
  | 'neutral'
  | 'happy'
  | 'sad'
  | 'playful'
  | 'blush'
  | 'excited'
  | 'cheeky'
  | 'annoyed'
  | 'angry'
  | 'panicked'

/** A spoken line plus the face it should wear. */
export interface QuoteLine {
  text: string
  mood: FaceMood
}

/** Per-asset personality lines — used when the pet is content, or as light filler. */
const PET_QUOTES: Record<string, readonly QuoteLine[]> = {
  '/cats/cat-1.png': [
    { text: 'I was promised snacks.', mood: 'sad' },
    { text: 'This room needs more sunbeams.', mood: 'neutral' },
    { text: 'I fit. Therefore I sit.', mood: 'cheeky' },
    { text: 'Did you hear that tiny noise?', mood: 'neutral' },
    { text: 'My paws are extremely busy.', mood: 'neutral' },
    { text: 'I have inspected everything.', mood: 'cheeky' },
    { text: 'A nap would solve this.', mood: 'neutral' },
    { text: 'You may admire me now.', mood: 'cheeky' },
    { text: 'I left you a little mystery.', mood: 'cheeky' },
    { text: 'The floor is suspicious today.', mood: 'annoyed' },
    { text: 'I require one gentle pat.', mood: 'blush' },
    { text: 'No thoughts. Only whiskers.', mood: 'happy' },
  ],
  '/cats/cat-2.png': [
    { text: 'Adventure is over there!', mood: 'excited' },
    { text: 'Race you to the other wall!', mood: 'excited' },
    { text: 'I found a very good corner.', mood: 'happy' },
    { text: 'Zoomies loading…', mood: 'cheeky' },
    { text: 'What if we climbed that?', mood: 'cheeky' },
    { text: 'I am faster than the wind.', mood: 'excited' },
    { text: 'There could be treats nearby.', mood: 'cheeky' },
    { text: 'I must investigate!', mood: 'excited' },
    { text: 'Follow me, I have no plan.', mood: 'cheeky' },
    { text: 'Today feels extra bouncy.', mood: 'happy' },
    { text: 'My tail says hello!', mood: 'happy' },
    { text: 'Bet you can’t catch me.', mood: 'cheeky' },
  ],
  '/cats/cat-3.png': [
    { text: 'Please hold all my calls.', mood: 'annoyed' },
    { text: 'I am conducting important rest.', mood: 'neutral' },
    { text: 'Five more minutes…', mood: 'sad' },
    { text: 'This is my softest pose.', mood: 'happy' },
    { text: 'Wake me when snacks happen.', mood: 'cheeky' },
    { text: 'I dreamed of a giant tuna.', mood: 'happy' },
    { text: 'My schedule is mostly naps.', mood: 'sad' },
    { text: 'Quiet, I’m being adorable.', mood: 'blush' },
    { text: 'The blanket understands me.', mood: 'happy' },
    { text: 'I can yawn bigger than you.', mood: 'cheeky' },
    { text: 'Resting is serious business.', mood: 'annoyed' },
    { text: 'Zzz… still listening…', mood: 'sad' },
  ],
  '/cats/cat-4.png': [
    { text: 'I have several opinions.', mood: 'blush' },
    { text: 'That furniture moved. I saw it.', mood: 'blush' },
    { text: 'Everything is under control.', mood: 'cheeky' },
    { text: 'I am watching the situation.', mood: 'annoyed' },
    { text: 'Perhaps one more cushion?', mood: 'neutral' },
    { text: 'This arrangement pleases me.', mood: 'happy' },
    { text: 'I approve… for now.', mood: 'cheeky' },
    { text: 'The room passes inspection.', mood: 'neutral' },
    { text: 'Please respect my tiny authority.', mood: 'blush' },
    { text: 'I know where the treats are.', mood: 'cheeky' },
    { text: 'A dignified little stroll.', mood: 'happy' },
    { text: 'Naturally, this is my kingdom.', mood: 'excited' },
  ],
  '/cats/cat-5.png': [
    { text: 'Hi! Hi! Hi!', mood: 'excited' },
    { text: 'You came back!', mood: 'happy' },
    { text: 'Can we play now?', mood: 'cheeky' },
    { text: 'I saved this spot for you.', mood: 'blush' },
    { text: 'Best room ever!', mood: 'excited' },
    { text: 'Look at my happy paws!', mood: 'happy' },
    { text: 'I missed you for seven minutes.', mood: 'sad' },
    { text: 'Everything is more fun together.', mood: 'happy' },
    { text: 'Tell me I’m doing great!', mood: 'blush' },
    { text: 'I brought maximum enthusiasm.', mood: 'excited' },
    { text: 'One cuddle, please!', mood: 'blush' },
    { text: 'Today is a good day to purr.', mood: 'happy' },
  ],
  '/cats/cat-6.png': [
    { text: 'A shadow moved over there.', mood: 'neutral' },
    { text: 'I am practically invisible.', mood: 'cheeky' },
    { text: 'The night understands me.', mood: 'neutral' },
    { text: 'Tiny paws, enormous secrets.', mood: 'cheeky' },
    { text: 'I have become the darkness.', mood: 'cheeky' },
    { text: 'No one saw that. Excellent.', mood: 'cheeky' },
    { text: 'Meet me by the moonbeam.', mood: 'blush' },
    { text: 'I know a shortcut.', mood: 'cheeky' },
    { text: 'Stealth mode: mostly working.', mood: 'annoyed' },
    { text: 'The shadows are very cozy.', mood: 'happy' },
    { text: 'I was never here.', mood: 'cheeky' },
    { text: 'My eyes are little lanterns.', mood: 'happy' },
  ],
  '/cats/cat-7.png': [
    { text: 'Is that for me?', mood: 'cheeky' },
    { text: 'I brought you a purr.', mood: 'happy' },
    { text: 'May I sit nearby?', mood: 'blush' },
    { text: 'You smell like home.', mood: 'blush' },
    { text: 'My heart did a tiny bounce.', mood: 'blush' },
    { text: 'I saved my best blink for you.', mood: 'happy' },
    { text: 'Let’s be cozy together.', mood: 'blush' },
    { text: 'I trust this particular cushion.', mood: 'happy' },
    { text: 'Your company is acceptable.', mood: 'cheeky' },
    { text: 'I made biscuits in spirit.', mood: 'happy' },
    { text: 'Here, have one slow blink.', mood: 'blush' },
    { text: 'We are a very good team.', mood: 'happy' },
  ],
  '/cats/cat-8.png': [
    { text: 'I demand a grand entrance!', mood: 'excited' },
    { text: 'Behold my magnificent fluff.', mood: 'excited' },
    { text: 'The drama is necessary.', mood: 'annoyed' },
    { text: 'This room needs a throne.', mood: 'annoyed' },
    { text: 'I have arrived fashionably early.', mood: 'cheeky' },
    { text: 'My tail deserves applause.', mood: 'excited' },
    { text: 'Please announce my next nap.', mood: 'cheeky' },
    { text: 'Elegance takes practice.', mood: 'neutral' },
    { text: 'I only eat imaginary delicacies.', mood: 'cheeky' },
    { text: 'That corner lacks grandeur.', mood: 'annoyed' },
    { text: 'A portrait would be appropriate.', mood: 'cheeky' },
    { text: 'Yes, the spotlight is mine.', mood: 'excited' },
  ],
  '/cats/cat-9.png': [
    { text: 'Hmm… curious.', mood: 'neutral' },
    { text: 'I am solving a tiny puzzle.', mood: 'neutral' },
    { text: 'The evidence points to snacks.', mood: 'cheeky' },
    { text: 'Something happened here.', mood: 'annoyed' },
    { text: 'Let me think with my whiskers.', mood: 'neutral' },
    { text: 'I have formed a hypothesis.', mood: 'cheeky' },
    { text: 'That box knows too much.', mood: 'annoyed' },
    { text: 'No clue escapes these paws.', mood: 'cheeky' },
    { text: 'I’m following a very small lead.', mood: 'neutral' },
    { text: 'Mystery level: intriguing.', mood: 'cheeky' },
    { text: 'The culprit was probably gravity.', mood: 'annoyed' },
    { text: 'Case closed. Time for a nap.', mood: 'happy' },
  ],
  '/cats/extra-sage.png': [
    { text: 'Patience grows the best catnip.', mood: 'neutral' },
    { text: 'The softest path is still a path.', mood: 'neutral' },
    { text: 'A quiet room holds many answers.', mood: 'neutral' },
    { text: 'Breathe in. Purr out.', mood: 'happy' },
    { text: 'Today’s wisdom: take the nap.', mood: 'cheeky' },
    { text: 'Even tiny paws leave a journey.', mood: 'neutral' },
    { text: 'The moon rewards the curious.', mood: 'happy' },
    { text: 'Listen closely to the rain.', mood: 'neutral' },
    { text: 'A full bowl brings clear thoughts.', mood: 'happy' },
    { text: 'Peace begins with a warm spot.', mood: 'happy' },
    { text: 'You already know what matters.', mood: 'blush' },
    { text: 'The whiskers point the way.', mood: 'neutral' },
  ],
  '/cats/extra-bulba.png': [
    { text: 'Sunlight makes my leaves happy!', mood: 'happy' },
    { text: 'I found a seed of courage.', mood: 'excited' },
    { text: 'Water, naps, and friendship!', mood: 'happy' },
    { text: 'Let’s grow something lovely.', mood: 'blush' },
    { text: 'My bulb is feeling extra bright.', mood: 'excited' },
    { text: 'Fresh air tastes green.', mood: 'happy' },
    { text: 'Small sprouts become big dreams.', mood: 'happy' },
    { text: 'I’m photosynthesizing… probably.', mood: 'cheeky' },
    { text: 'Every day needs a little sunshine.', mood: 'happy' },
    { text: 'The garden says hello!', mood: 'excited' },
    { text: 'I brought a pocket-sized spring.', mood: 'happy' },
    { text: 'Leaf me one tiny snack?', mood: 'cheeky' },
  ],
}

const FALLBACK_QUOTES: readonly QuoteLine[] = [
  { text: 'Hello from down here!', mood: 'happy' },
  { text: 'This is a very good room.', mood: 'happy' },
  { text: 'I have something important to say.', mood: 'cheeky' },
  { text: 'Could today include a snack?', mood: 'sad' },
  { text: 'Tiny pet, enormous feelings.', mood: 'blush' },
  { text: 'Let’s have a cozy day.', mood: 'happy' },
]

/** Expanded care lines — heavily favored when that need is outstanding. */
const HUNGRY_QUOTES = [
  'My tummy just filed a complaint.',
  'Feed me before I invent snacks.',
  'Is dinner fashionably late?',
  'I can hear the empty bowl from here.',
  'A single crunch would change everything.',
  'Hunger makes me dramatic.',
  'Please. The kibble. Immediately.',
  'I have not forgotten breakfast.',
  'My stomach is doing tiny somersaults.',
  'Treat diplomacy starts now.',
  'I will trade one purr for food.',
  'This vibe is… undernourished.',
  'Snack o’clock was twenty minutes ago.',
  'I am a growing… mystery creature.',
  'The pantry called. It said hurry.',
  'Feed me and I become nicer.',
  'Starvation mode: theatrical.',
  'I dreamed of a never-ending buffet.',
  'My whiskers point toward the kitchen.',
  'Please unlock the snack vault.',
] as const

const DIRTY_QUOTES = [
  'I require a spa day. Immediately.',
  'Bath time? …Fine. Gently.',
  'I am glamorous and also sticky.',
  'Someone left glitter? No. That’s me.',
  'A rinse would restore my dignity.',
  'I smell like adventure. Too much adventure.',
  'Please scrub the chaos off me.',
  'My fur has opinions about this dirt.',
  'Clean me and I will sparkle again.',
  'I demand bubble rights.',
  'This mess is not my brand.',
  'A warm towel would fix my whole day.',
  'I’m 40% fluff, 60% mystery smudge.',
  'Bath me like the royalty I am.',
  'The dust bunnies recruited me.',
  'I need a reset… and soap.',
  'Please restore factory-fresh me.',
  'My ears feel scandalous.',
  'Clean paws, clear conscience.',
  'I will tolerate water. Briefly.',
] as const

const PLAY_QUOTES = [
  'Play with me or I perish of boredom!',
  'My toys are lonely and so am I.',
  'Zoomies available upon request.',
  'One toss. Just one. Okay five.',
  'I have so much unused energy.',
  'Entertain me, champion!',
  'I practiced my pounce for this.',
  'Let’s make the room a stadium.',
  'Boredom is illegal in this kingdom.',
  'Chase me. I dare you.',
  'I invented a new game: “catch me”.',
  'My paws are ready for mischief.',
  'Playtime is a human responsibility.',
  'I will accept string diplomacy.',
  'The floor is a racetrack. Prove it.',
  'I need enrichment. Immediately.',
  'A feather would solve everything.',
  'Please unlock chaotic good mode.',
  'I have been so patient. Relatively.',
  'Come onnnn, just a little play!',
] as const

const NEGLECTED_QUOTES = [
  'Hungry AND dusty. Peak tragedy.',
  'I am a tiny abandoned opera.',
  'Feed me. Bathe me. Save me.',
  'This is an emergency of the fluff.',
  'I have entered full protest mode.',
  'Care checklist: empty. Mood: betrayed.',
  'I will forgive you for snacks and soap.',
  'Please reverse my decline arc.',
  'I am one soft towel away from recovery.',
  'Lonely, sticky, and snackless. Wow.',
  'Somebody check on this creature!',
  'My standards have left the building.',
  'I need the whole care package.',
  'This is not the lifestyle I ordered.',
  'Rescue mission: commence.',
  'I am holding a very polite grudge.',
] as const

const HAPPY_QUOTES = [
  'Full tummy. Fresh fluff. Immortal.',
  'I could purr a whole symphony.',
  'Life is soft and correctly seasoned.',
  'Thank you for existing near me.',
  'I am thriving in this ecosystem.',
  'Best caretakers. 10/10. No notes.',
  'My heart is doing little biscuits.',
  'Today feels correctly managed.',
] as const

/** Salty Valorant teammate energy — curated with Jo. */
const VALORANT_QUOTES: readonly QuoteLine[] = [
  { text: 'Stop peeking mid every round', mood: 'annoyed' },
  { text: 'Can we get ONE smoke please', mood: 'sad' },
  { text: 'Just plant the spike', mood: 'annoyed' },
  { text: 'This Jett is throwing', mood: 'angry' },
  { text: "I AM NOT just your bottom frag!", mood: 'angry' },
  { text: "I AM NOT just your healer!", mood: 'angry' },
  {
    text: 'meow meow meow meow meow now meow meow meow meow',
    mood: 'cheeky',
  },
  { text: 'Pick up the OP!', mood: 'excited' },
  { text: 'Ooooh! A Sheriff!', mood: 'cheeky' },
  { text: 'Can you get me my lucky Phantom?', mood: 'cheeky' },
  { text: "I'M SO GOOD SOMETIMES!", mood: 'excited' },
  { text: "I'm reporting them", mood: 'angry' },
  { text: 'Are they cheating?', mood: 'sad' },
  { text: 'Are they dumb?', mood: 'annoyed' },
  { text: 'Are they stupid or are they dumb?', mood: 'angry' },
  { text: "I'm doing my shorty trick", mood: 'cheeky' },
  { text: "I'm checking my store", mood: 'neutral' },
  { text: 'This Jett is cracked', mood: 'annoyed' },
  { text: 'Heal me, Sova', mood: 'sad' },
  { text: 'This is my pocket Sova', mood: 'cheeky' },
  { text: 'My Breach just ulted me', mood: 'sad' },
  { text: '*shoots floor repeatedly*', mood: 'cheeky' },
  { text: 'Get me out of this game', mood: 'sad' },
  { text: 'If only we had a sentinel', mood: 'annoyed' },
  { text: 'Turn around~', mood: 'excited' },
  { text: 'Do you want an OP?', mood: 'excited' },
  { text: 'I forgot to buy any util', mood: 'sad' },
  { text: "Don't forget to buy armor", mood: 'sad' },
]

/** Soft protests when a wallpaper cat is first grabbed. */
const DRAG_QUOTES: readonly QuoteLine[] = [
  { text: 'What did I do, mother?', mood: 'sad' },
  { text: 'What did I do, father?', mood: 'sad' },
  { text: 'I was being so good…', mood: 'sad' },
  { text: 'Please put me back…', mood: 'sad' },
  { text: "I don't need any shots", mood: 'sad' },
  { text: 'but… I was sleeping…', mood: 'sad' },
  { text: 'are you bored again?', mood: 'sad' },
  { text: 'help?.. someone?.. anyone?!?', mood: 'sad' },
]

/** Louder protests after being shaken around mid-drag. */
const SHAKE_QUOTES: readonly QuoteLine[] = [
  { text: 'aaaaaaaa', mood: 'panicked' },
  { text: "Don't bully me!", mood: 'panicked' },
  { text: 'WHY ARE WE RUNNING?!', mood: 'panicked' },
  { text: 'I regret everything!', mood: 'panicked' },
  { text: "I'LL BITE YOU!", mood: 'panicked' },
  { text: 'I NEED AN ADULT', mood: 'panicked' },
  { text: "I promise I'll get some kills", mood: 'panicked' },
  { text: 'yes, jo', mood: 'panicked' },
  { text: "I'll remember this!", mood: 'panicked' },
  { text: "Fine, I'll buy you a Phantom…", mood: 'panicked' },
]

/** Relative weight inside the Valorant pool (default 1 each). */
const VALORANT_LINE_WEIGHT: Partial<Record<string, number>> = {
  "I'M SO GOOD SOMETIMES!": 4,
}

const SAGE_SPECIES = '/cats/extra-sage.png'

/** How the mouth behaves while this line is on screen. */
export type SpeechMode = 'animate' | 'hold'

/** Optional per-line layer tweaks on top of the mood's default face recipe. */
export interface FaceOverrides {
  mood?: FaceMood
  eyes?: string
  mouth?: string
  /** One effect, or several to stack (e.g. blush plus tears). */
  effect?: string | readonly string[]
  /**
   * `hold` keeps the expression mouth for the whole line (grin, tongue, etc).
   * Defaults to `animate` for moods that flap while talking.
   */
  speech?: SpeechMode
}

export interface PetQuoteResult extends FaceOverrides {
  text: string
  mood: FaceMood
}

export interface PetQuoteNeeds {
  hungry: boolean
  dirty: boolean
  bored: boolean
}

/**
 * Where the pet lives. Wallpaper cats never get Valorant — except the sage
 * cat (Valorant-only). Room pets always have Valorant at normal pool weight;
 * when today's "Play Valorant and check store" is unchecked, an extra 40%
 * force picks Valorant as a soft nag.
 */
export type PetQuoteSource = 'room' | 'wallpaper'

interface WeightedPool {
  /** Lines that already carry their own mood. */
  lines?: readonly QuoteLine[]
  /** Plain care lines that all share `mood`. */
  quotes?: readonly string[]
  weight: number
  /** Shared mood for `quotes` pools (ignored when `lines` is set). */
  mood?: FaceMood
}

function buildPools(
  species: string,
  needs: PetQuoteNeeds,
  source: PetQuoteSource,
  /** When true, merge Valorant into the weighted mix at normal odds. */
  includeValorant: boolean,
): WeightedPool[] {
  if (source === 'wallpaper' && species === SAGE_SPECIES) {
    return [{ lines: VALORANT_QUOTES, weight: 1 }]
  }

  const personality = PET_QUOTES[species] ?? FALLBACK_QUOTES
  const pools: WeightedPool[] = []

  const needy = needs.hungry || needs.dirty || needs.bored
  // Personality stays as light filler when something is wrong; main voice otherwise.
  pools.push({ lines: personality, weight: needy ? 1 : 3 })

  // Same weight as personality — the "normal odds" Valorant blend.
  if (includeValorant) {
    pools.push({ lines: VALORANT_QUOTES, weight: needy ? 1 : 3 })
  }

  if (needs.hungry && needs.dirty) {
    pools.push({ quotes: NEGLECTED_QUOTES, weight: 6, mood: 'sad' })
    pools.push({ quotes: HUNGRY_QUOTES, weight: 3, mood: 'sad' })
    pools.push({ quotes: DIRTY_QUOTES, weight: 3, mood: 'sad' })
  } else {
    if (needs.hungry) {
      pools.push({ quotes: HUNGRY_QUOTES, weight: 5, mood: 'sad' })
    }
    if (needs.dirty) {
      pools.push({ quotes: DIRTY_QUOTES, weight: 5, mood: 'sad' })
    }
  }
  if (needs.bored) pools.push({ quotes: PLAY_QUOTES, weight: 5, mood: 'playful' })
  if (!needy) pools.push({ quotes: HAPPY_QUOTES, weight: 2, mood: 'happy' })

  return pools
}

/** Moods whose mouth should stay put while the bubble is up. */
const HOLD_SPEECH_MOODS: ReadonlySet<FaceMood> = new Set([
  'excited',
  'playful',
  'cheeky',
  // Angry mouth is a fixed snarl — flapping would undercut it.
  'angry',
])

function toQuoteResult(text: string, mood: FaceMood): PetQuoteResult {
  const result: PetQuoteResult = { text, mood }
  if (HOLD_SPEECH_MOODS.has(mood)) result.speech = 'hold'
  return result
}

function pickWeightedIndex(
  count: number,
  lineWeight?: Partial<Record<string, number>>,
  texts?: readonly string[],
): number {
  if (!lineWeight || !texts) {
    return Math.floor(Math.random() * count)
  }

  let total = 0
  const weights = texts.map((text) => {
    const weight = lineWeight[text] ?? 1
    total += weight
    return weight
  })

  let roll = Math.random() * total
  for (let i = 0; i < count; i += 1) {
    roll -= weights[i]!
    if (roll < 0) return i
  }
  return count - 1
}

function pickFromPool(pool: WeightedPool): PetQuoteResult {
  if (pool.lines) {
    const texts = pool.lines.map((line) => line.text)
    const weight =
      pool.lines === VALORANT_QUOTES ? VALORANT_LINE_WEIGHT : undefined
    const index = pickWeightedIndex(pool.lines.length, weight, texts)
    const line = pool.lines[index]!
    return toQuoteResult(line.text, line.mood)
  }

  const quotes = pool.quotes!
  const index = pickWeightedIndex(quotes.length)
  return toQuoteResult(quotes[index]!, pool.mood!)
}

function poolHasMultiple(pool: WeightedPool): boolean {
  return (pool.lines?.length ?? pool.quotes?.length ?? 0) > 1
}

/**
 * Pick a quote from weighted pools. Prefer a different line than `avoid` so
 * consecutive cycles don't look stuck when the seed lands on the same text.
 *
 * Room pets:
 * - Store unchecked → 40% forced Valorant (soft nag); otherwise care/personality only
 * - Store checked → Valorant at normal pool weight (same as personality)
 */
export function petQuoteDetailed(
  species: string,
  needs: PetQuoteNeeds,
  avoid?: string,
  source: PetQuoteSource = 'room',
  valorantStoreDone = false,
): PetQuoteResult {
  const pickValorant = (): PetQuoteResult =>
    pickFromPool({ lines: VALORANT_QUOTES, weight: 1 })

  if (source === 'room' && !valorantStoreDone && Math.random() < 0.4) {
    let next = pickValorant()
    if (avoid && VALORANT_QUOTES.length > 1) {
      let guard = 0
      while (next.text === avoid && guard < 8) {
        next = pickValorant()
        guard += 1
      }
    }
    return next
  }

  // Checked → normal Valorant odds in the mix. Unchecked (missed the 40%) → no
  // Valorant so the nag rate stays ~40% instead of stacking with pool odds.
  const includeValorant = source === 'room' && valorantStoreDone
  const pools = buildPools(species, needs, source, includeValorant)
  const totalWeight = pools.reduce((sum, pool) => sum + pool.weight, 0)

  const pick = (): PetQuoteResult => {
    let cursor = Math.floor(Math.random() * totalWeight)
    for (const pool of pools) {
      if (cursor < pool.weight) return pickFromPool(pool)
      cursor -= pool.weight
    }
    return pickFromPool(pools[0]!)
  }

  let next = pick()
  if (avoid && pools.some(poolHasMultiple)) {
    let guard = 0
    while (next.text === avoid && guard < 8) {
      next = pick()
      guard += 1
    }
  }
  return next
}

function pickLine(
  lines: readonly QuoteLine[],
  avoid?: string,
): PetQuoteResult {
  if (lines.length === 0) return toQuoteResult('…', 'sad')
  if (lines.length === 1) return toQuoteResult(lines[0]!.text, lines[0]!.mood)

  let next = lines[Math.floor(Math.random() * lines.length)]!
  if (avoid) {
    let guard = 0
    while (next.text === avoid && guard < 8) {
      next = lines[Math.floor(Math.random() * lines.length)]!
      guard += 1
    }
  }
  return toQuoteResult(next.text, next.mood)
}

/** Wallpaper grab reaction — soft sad protest, expression held. */
export function petDragQuote(avoid?: string): PetQuoteResult {
  return { ...pickLine(DRAG_QUOTES, avoid), speech: 'hold' }
}

/** Wallpaper shake reaction — panicked protest, expression held. */
export function petShakeQuote(avoid?: string): PetQuoteResult {
  return { ...pickLine(SHAKE_QUOTES, avoid), speech: 'hold' }
}

/** Text-only wrapper for callers that don't render faces (wallpaper, etc.). */
export function petQuote(
  species: string,
  needs: PetQuoteNeeds,
  avoid?: string,
  source: PetQuoteSource = 'room',
  valorantStoreDone = false,
): string {
  return petQuoteDetailed(species, needs, avoid, source, valorantStoreDone).text
}

const CATTLESHIP_HIT_QUOTES = [
  'Sink em good!',
  'Direct hit — nice shot!',
  'Claw marks on that hull!',
  'Boom! Right on the whiskers!',
  'They’re feeling that one!',
] as const

const CATTLESHIP_SINK_QUOTES = [
  'Ship down! Sink em good!',
  'One less boat in the sea!',
  'Splash! That’s a sink!',
  'Fleet’s looking thinner…',
  'They’ll need a bigger litter box!',
] as const

const CATTLESHIP_MISS_QUOTES = [
  "Don't worry, there's more fish in the sea...",
  'Splash — just water. Try again!',
  'Missed! The ocean is big.',
  'Empty waves… next one’s yours.',
  'A polite miss. Reload those paws.',
] as const

function pickExcitedLine(
  pool: readonly string[],
  avoid?: string,
): PetQuoteResult {
  const choices = avoid ? pool.filter((t) => t !== avoid) : [...pool]
  const text = (choices.length > 0 ? choices : pool)[
    Math.floor(Math.random() * (choices.length > 0 ? choices.length : pool.length))
  ]!
  return { text, mood: 'excited' }
}

/** Coach lines after you fire in Cattleship. */
export function cattleshipShotQuote(
  kind: 'hit' | 'miss' | 'sink',
  avoid?: string,
): PetQuoteResult {
  if (kind === 'miss') return pickExcitedLine(CATTLESHIP_MISS_QUOTES, avoid)
  if (kind === 'sink') return pickExcitedLine(CATTLESHIP_SINK_QUOTES, avoid)
  return pickExcitedLine(CATTLESHIP_HIT_QUOTES, avoid)
}
