/** Per-asset personality lines — used when the pet is content, or as light filler. */
const PET_QUOTES: Record<string, readonly string[]> = {
  '/cats/cat-1.png': [
    'I was promised snacks.',
    'This room needs more sunbeams.',
    'I fit. Therefore I sit.',
    'Did you hear that tiny noise?',
    'My paws are extremely busy.',
    'I have inspected everything.',
    'A nap would solve this.',
    'You may admire me now.',
    'I left you a little mystery.',
    'The floor is suspicious today.',
    'I require one gentle pat.',
    'No thoughts. Only whiskers.',
  ],
  '/cats/cat-2.png': [
    'Adventure is over there!',
    'Race you to the other wall!',
    'I found a very good corner.',
    'Zoomies loading…',
    'What if we climbed that?',
    'I am faster than the wind.',
    'There could be treats nearby.',
    'I must investigate!',
    'Follow me, I have no plan.',
    'Today feels extra bouncy.',
    'My tail says hello!',
    'Bet you can’t catch me.',
  ],
  '/cats/cat-3.png': [
    'Please hold all my calls.',
    'I am conducting important rest.',
    'Five more minutes…',
    'This is my softest pose.',
    'Wake me when snacks happen.',
    'I dreamed of a giant tuna.',
    'My schedule is mostly naps.',
    'Quiet, I’m being adorable.',
    'The blanket understands me.',
    'I can yawn bigger than you.',
    'Resting is serious business.',
    'Zzz… still listening…',
  ],
  '/cats/cat-4.png': [
    'I have several opinions.',
    'That furniture moved. I saw it.',
    'Everything is under control.',
    'I am watching the situation.',
    'Perhaps one more cushion?',
    'This arrangement pleases me.',
    'I approve… for now.',
    'The room passes inspection.',
    'Please respect my tiny authority.',
    'I know where the treats are.',
    'A dignified little stroll.',
    'Naturally, this is my kingdom.',
  ],
  '/cats/cat-5.png': [
    'Hi! Hi! Hi!',
    'You came back!',
    'Can we play now?',
    'I saved this spot for you.',
    'Best room ever!',
    'Look at my happy paws!',
    'I missed you for seven minutes.',
    'Everything is more fun together.',
    'Tell me I’m doing great!',
    'I brought maximum enthusiasm.',
    'One cuddle, please!',
    'Today is a good day to purr.',
  ],
  '/cats/cat-6.png': [
    'A shadow moved over there.',
    'I am practically invisible.',
    'The night understands me.',
    'Tiny paws, enormous secrets.',
    'I have become the darkness.',
    'No one saw that. Excellent.',
    'Meet me by the moonbeam.',
    'I know a shortcut.',
    'Stealth mode: mostly working.',
    'The shadows are very cozy.',
    'I was never here.',
    'My eyes are little lanterns.',
  ],
  '/cats/cat-7.png': [
    'Is that for me?',
    'I brought you a purr.',
    'May I sit nearby?',
    'You smell like home.',
    'My heart did a tiny bounce.',
    'I saved my best blink for you.',
    'Let’s be cozy together.',
    'I trust this particular cushion.',
    'Your company is acceptable.',
    'I made biscuits in spirit.',
    'Here, have one slow blink.',
    'We are a very good team.',
  ],
  '/cats/cat-8.png': [
    'I demand a grand entrance!',
    'Behold my magnificent fluff.',
    'The drama is necessary.',
    'This room needs a throne.',
    'I have arrived fashionably early.',
    'My tail deserves applause.',
    'Please announce my next nap.',
    'Elegance takes practice.',
    'I only eat imaginary delicacies.',
    'That corner lacks grandeur.',
    'A portrait would be appropriate.',
    'Yes, the spotlight is mine.',
  ],
  '/cats/cat-9.png': [
    'Hmm… curious.',
    'I am solving a tiny puzzle.',
    'The evidence points to snacks.',
    'Something happened here.',
    'Let me think with my whiskers.',
    'I have formed a hypothesis.',
    'That box knows too much.',
    'No clue escapes these paws.',
    'I’m following a very small lead.',
    'Mystery level: intriguing.',
    'The culprit was probably gravity.',
    'Case closed. Time for a nap.',
  ],
  '/cats/extra-sage.png': [
    'Patience grows the best catnip.',
    'The softest path is still a path.',
    'A quiet room holds many answers.',
    'Breathe in. Purr out.',
    'Today’s wisdom: take the nap.',
    'Even tiny paws leave a journey.',
    'The moon rewards the curious.',
    'Listen closely to the rain.',
    'A full bowl brings clear thoughts.',
    'Peace begins with a warm spot.',
    'You already know what matters.',
    'The whiskers point the way.',
  ],
  '/cats/extra-bulba.png': [
    'Sunlight makes my leaves happy!',
    'I found a seed of courage.',
    'Water, naps, and friendship!',
    'Let’s grow something lovely.',
    'My bulb is feeling extra bright.',
    'Fresh air tastes green.',
    'Small sprouts become big dreams.',
    'I’m photosynthesizing… probably.',
    'Every day needs a little sunshine.',
    'The garden says hello!',
    'I brought a pocket-sized spring.',
    'Leaf me one tiny snack?',
  ],
}

const FALLBACK_QUOTES = [
  'Hello from down here!',
  'This is a very good room.',
  'I have something important to say.',
  'Could today include a snack?',
  'Tiny pet, enormous feelings.',
  'Let’s have a cozy day.',
] as const

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
const VALORANT_QUOTES = [
  'Stop peeking mid every round',
  'Can we get ONE smoke please',
  'Just plant the spike',
  'This Jett is throwing',
  "I AM NOT just your bottom frag!",
  "I AM NOT just your healer!",
  "meowmeowmeowmeownowmeowmeowmeow",
  "Pick up the OP!",
  "Ooooh! A Sheriff!",
  "Can you get me my lucky Phantom?",
  "I'M SO GOOD SOMETIMES!",
  "I'm reporting them",
  'Are they cheating?',
  'Are they dumb?',
  'Are they stupid or are they dumb?',
  "I'm doing my shorty trick",
  "I'm checking my store",
  'This Jett is cracked',
  'Heal me, Sova',
  'This is my pocket Sova',
  'My Breach just ulted me',
  '*shoots floor repeatedly*',
  'Get me out of this game',
  'If only we had a sentinel',
  'Turn around~',
  'Do you want an OP?',
  'I forgot to buy any util',
  "Don't forget to buy armor",
] as const

/** Relative weight inside the Valorant pool (default 1 each). */
const VALORANT_LINE_WEIGHT: Partial<
  Record<(typeof VALORANT_QUOTES)[number], number>
> = {
  "I'M SO GOOD SOMETIMES!": 4,
}

const SAGE_SPECIES = '/cats/extra-sage.png'

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
  quotes: readonly string[]
  weight: number
}

function buildPools(
  species: string,
  needs: PetQuoteNeeds,
  source: PetQuoteSource,
  /** When true, merge Valorant into the weighted mix at normal odds. */
  includeValorant: boolean,
): WeightedPool[] {
  if (source === 'wallpaper' && species === SAGE_SPECIES) {
    return [{ quotes: VALORANT_QUOTES, weight: 1 }]
  }

  const personality = PET_QUOTES[species] ?? FALLBACK_QUOTES
  const pools: WeightedPool[] = []

  const needy = needs.hungry || needs.dirty || needs.bored
  // Personality stays as light filler when something is wrong; main voice otherwise.
  pools.push({ quotes: personality, weight: needy ? 1 : 3 })

  // Same weight as personality — the "normal odds" Valorant blend.
  if (includeValorant) {
    pools.push({ quotes: VALORANT_QUOTES, weight: needy ? 1 : 3 })
  }

  if (needs.hungry && needs.dirty) {
    pools.push({ quotes: NEGLECTED_QUOTES, weight: 6 })
    pools.push({ quotes: HUNGRY_QUOTES, weight: 3 })
    pools.push({ quotes: DIRTY_QUOTES, weight: 3 })
  } else {
    if (needs.hungry) pools.push({ quotes: HUNGRY_QUOTES, weight: 5 })
    if (needs.dirty) pools.push({ quotes: DIRTY_QUOTES, weight: 5 })
  }
  if (needs.bored) pools.push({ quotes: PLAY_QUOTES, weight: 5 })
  if (!needy) pools.push({ quotes: HAPPY_QUOTES, weight: 2 })

  return pools
}

function pickQuoteFromList(
  quotes: readonly string[],
  lineWeight?: Partial<Record<string, number>>,
): string {
  if (!lineWeight) {
    return quotes[Math.floor(Math.random() * quotes.length)]!
  }

  let total = 0
  const weights = quotes.map((quote) => {
    const weight = lineWeight[quote] ?? 1
    total += weight
    return weight
  })

  let roll = Math.random() * total
  for (let i = 0; i < quotes.length; i += 1) {
    roll -= weights[i]!
    if (roll < 0) return quotes[i]!
  }
  return quotes[quotes.length - 1]!
}

/**
 * Pick a quote from weighted pools. Prefer a different line than `avoid` so
 * consecutive cycles don't look stuck when the seed lands on the same text.
 *
 * Room pets:
 * - Store unchecked → 40% forced Valorant (soft nag); otherwise care/personality only
 * - Store checked → Valorant at normal pool weight (same as personality)
 */
export function petQuote(
  species: string,
  needs: PetQuoteNeeds,
  avoid?: string,
  source: PetQuoteSource = 'room',
  valorantStoreDone = false,
): string {
  const pickValorant = (): string =>
    pickQuoteFromList(VALORANT_QUOTES, VALORANT_LINE_WEIGHT)

  if (source === 'room' && !valorantStoreDone && Math.random() < 0.4) {
    let next = pickValorant()
    if (avoid && VALORANT_QUOTES.length > 1) {
      let guard = 0
      while (next === avoid && guard < 8) {
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

  const pick = (): string => {
    let cursor = Math.floor(Math.random() * totalWeight)
    for (const pool of pools) {
      if (cursor < pool.weight) {
        return pickQuoteFromList(
          pool.quotes,
          pool.quotes === VALORANT_QUOTES ? VALORANT_LINE_WEIGHT : undefined,
        )
      }
      cursor -= pool.weight
    }
    return pools[0]!.quotes[0]!
  }

  let next = pick()
  if (avoid && pools.some((p) => p.quotes.length > 1)) {
    let guard = 0
    while (next === avoid && guard < 8) {
      next = pick()
      guard += 1
    }
  }
  return next
}
