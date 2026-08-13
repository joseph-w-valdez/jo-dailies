import type { ChessColor, ChessKind } from './chess'

const SHARED = [
  // funny
  'I have a plan. It is bad.',
  'Touch me and we both regret it.',
  'Is this the part where I become useful?',
  'I was born for this square.',
  'My therapist is a chess clock.',
  'Plotting… poorly.',
  'I blinked and the meta changed.',
  'Send help. Or snacks.',
  'This is fine. Everything is fine.',
  'I contain multitudes. Mostly anxiety.',
  'Do not perceive me.',
  'Skill issue detected. Not mine.',
  'I am so normal about this.',
  'Watch me cook. Or burn.',
  'Main character energy. Side quest stats.',
  'I read the room. It was pink.',
  // motivational
  'Believe in me harder.',
  'One brave move at a time.',
  'We can still turn this around.',
  'Destiny called. I hit decline once. Then yes.',
  'Courage is just panic with good posture.',
  'Today I choose chaos with intention.',
  'Growth mindset. Also vibes.',
  'I am the comeback arc.',
  'Trust the process. Fear the process.',
  'Shine. Or at least glisten.',
  // dark
  'Nobody leaves this board unchanged.',
  'Every capture is a little funeral.',
  'I have seen things. Mostly pawns.',
  'The endgame is coming for all of us.',
  'Hope is a blunder.',
  'I smile so you do not ask questions.',
  'They call it development. I call it doom.',
  'There is no escape. Only tempo.',
  'I keep the secrets under the board.',
  'Checkmate is just a polite apocalypse.',
  // sad
  'I miss my starting square.',
  'Nobody ever picks me first.',
  'I practiced this in the mirror.',
  'Please do not trade me.',
  'I just wanted to be useful.',
  'Sometimes I pretend I matter.',
  'Left on read by destiny.',
  'I was someone’s favorite once.',
  'If I hang, tell them I tried.',
  'The board is cold today.',
] as const

const BY_KIND: Record<ChessKind, readonly string[]> = {
  k: [
    'Protect me or perish trying.',
    'I am the plot armor.',
    'If I fall, credits roll.',
    'Everyone orbits my anxiety.',
    'Royal and terrified.',
    'Do not leave me hanging. Literally.',
    'I castled emotionally years ago.',
    'Uneasy lies the head that wears the crown sticker.',
  ],
  q: [
    'I go wherever I want. Deal with it.',
    'Main DPS reporting in.',
    'I am the problem and the solution.',
    'Touch one of my friends and find out.',
    'Range? Unlimited. Patience? No.',
    'Queen down. Civilization ends.',
    'I make the rules. Then break them.',
    'Soft face. Nuclear options.',
  ],
  r: [
    'Straight lines only. Like my life.',
    'I am a tower of unresolved issues.',
    'File open. Heart closed.',
    'Castling buddy. Emotional support brick.',
    'I do not do diagonals. Grow up.',
    'Horizontal menace.',
    'Built different. Built rectangular.',
  ],
  b: [
    'I live on one color and die on principles.',
    'Diagonal thinker. Chaotic results.',
    'Bless this mess. Then snipe it.',
    'Holy laser, activate.',
    'I see you through the cracks.',
    'Faith, hope, and long diagonals.',
  ],
  n: [
    'L-shaped for the plot twist.',
    'I jump feelings for a living.',
    'Unexpected angle incoming.',
    'Neigh means no. Also yes.',
    'Fork you later.',
    'Horse girl era. Horse boy era. Horse.',
    'I arrive sideways and leave legends.',
  ],
  p: [
    'One step at a time. Literally.',
    'Promotion arc loading…',
    'I am small but narratively important.',
    'Do not underestimate the front line.',
    'En passant is my villain origin.',
    'If I make it, I become somebody.',
    'Cannon fodder with dreams.',
    'Push me. I dare you.',
  ],
}

const JOHA_LINE = 'Joha is always right'
const JOHA_CHANCE = 0.07
const VALORANT_CHANCE = 0.2

const VALORANT = [
  'Quick buy me my lucky Phantom!',
  'Which site did we plant the bomb?',
  "Hold on. I'm flanking",
  'Can you buy me an OP?',
  'meow meow meow meow meow now meow meow meow',
  'I started the vote to surrender',
  "They're cheating",
  "I'm reporting them just in case",
  'I muted them',
  'Let me drone in',
  "Why don't we have any smokes??",
  'I just need one more orb for my ult',
  'OMG. I forgot to buy!',
  'Are you baiting me??',
] as const

const BY_COLOR: Record<ChessColor, readonly string[]> = {
  white: [
    'We move first. We panic first.',
    'Light side. Dark thoughts.',
    'Opening theory said this was fine.',
  ],
  black: [
    'We wait. We scheme. We snack.',
    'Second move, first bloodlust.',
    'Revenge arc unlocked.',
  ],
}

function poolFor(color: ChessColor, kind: ChessKind): string[] {
  return [...SHARED, ...BY_KIND[kind], ...BY_COLOR[color]]
}

function pickFrom(pool: readonly string[], previous?: string | null): string {
  if (pool.length === 0) return '…'
  if (pool.length === 1) return pool[0]!
  let next = pool[Math.floor(Math.random() * pool.length)]!
  if (previous) {
    let guard = 0
    while (next === previous && guard < 8) {
      next = pool[Math.floor(Math.random() * pool.length)]!
      guard += 1
    }
  }
  return next
}

/**
 * Pick a line for the active piece.
 * Global odds: 7% "Joha is always right", else 20% Valorant pool, else normal.
 */
export function pickChessQuote(
  color: ChessColor,
  kind: ChessKind,
  previous?: string | null,
): string {
  const roll = Math.random()
  if (roll < JOHA_CHANCE) return JOHA_LINE
  if (roll < JOHA_CHANCE + VALORANT_CHANCE) {
    return pickFrom(VALORANT, previous)
  }
  return pickFrom(poolFor(color, kind), previous)
}
