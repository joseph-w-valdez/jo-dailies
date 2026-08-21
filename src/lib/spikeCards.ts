import {
  VALORANT_AGENTS,
  agentById,
  type ValorantAgent,
} from './valorantAgents'
import { SPIKE_EXTRA_UNIQUES } from './spikeAgentExtraUniques'

/** Full Guess Who roster — every agent is playable in Spike. */
export const SPIKE_AGENT_IDS = VALORANT_AGENTS.map((a) => a.id)

export function spikeAgents(): ValorantAgent[] {
  return SPIKE_AGENT_IDS.map((id) => agentById(id)).filter(
    (a): a is ValorantAgent => a != null,
  )
}

/** Loadout guns — bought each round; scale action damage / DC. */
export type SpikeGunId =
  | 'classic'
  | 'shorty'
  | 'ghost'
  | 'sheriff'
  | 'spectre'
  | 'phantom'
  | 'odin'
  | 'operator'

export type SpikeGunDef = {
  id: SpikeGunId
  name: string
  cost: number
  /** Multiplies action hit/graze damage. */
  damageMult: number
  /** Added to action DC (higher = harder). */
  dcMod: number
  blurb: string
}

export const SPIKE_GUNS: readonly SpikeGunDef[] = [
  {
    id: 'classic',
    name: 'Classic',
    cost: 0,
    damageMult: 0.7,
    dcMod: 1,
    blurb: 'Free starter. Soft shots.',
  },
  {
    id: 'shorty',
    name: 'Shorty',
    cost: 350,
    damageMult: 1.4,
    dcMod: 3,
    blurb: 'This is my Shorty trick.',
  },
  {
    id: 'ghost',
    name: 'Ghost',
    cost: 500,
    damageMult: 0.85,
    dcMod: 0,
    blurb: 'Quiet eco rifle.',
  },
  {
    id: 'sheriff',
    name: 'Sheriff',
    cost: 800,
    damageMult: 1.2,
    dcMod: 2,
    blurb: 'Harder to hit, chunky when you do.',
  },
  {
    id: 'spectre',
    name: 'Spectre',
    cost: 1600,
    damageMult: 0.9,
    dcMod: -1,
    blurb: 'Spray-friendly. Easier DC.',
  },
  {
    id: 'phantom',
    name: 'Phantom',
    cost: 2900,
    damageMult: 1,
    dcMod: 0,
    blurb: 'Can I have my lucky Phantom?',
  },
  {
    id: 'odin',
    name: 'Odin',
    cost: 3200,
    damageMult: 1.3,
    dcMod: -2,
    blurb: 'Wall of lead. Easy need, loud damage.',
  },
  {
    id: 'operator',
    name: 'Operator',
    cost: 4700,
    damageMult: 1.45,
    dcMod: 2,
    blurb: 'Huge damage, picky aim.',
  },
]

const GUN_BY_ID = new Map(SPIKE_GUNS.map((g) => [g.id, g]))

export function spikeGun(id: SpikeGunId): SpikeGunDef {
  return GUN_BY_ID.get(id) ?? SPIKE_GUNS[0]!
}

export const SPIKE_START_CREDITS = 800
export const SPIKE_WIN_INCOME = 3000
export const SPIKE_LOSS_INCOME = 1900
/** Universal points needed to unlock the agent ult. */
export const SPIKE_ULT_COST = 6

export type SpikePersist = 'angle' | 'smoke' | 'trap' | 'molly'

export type SpikeCardKind =
  | 'action'
  | 'util'
  | 'info'
  | 'plant'
  | 'defuse'
  | 'persist'
  | 'heal'
  | 'ult'

export type SpikeCardDef = {
  id: string
  name: string
  blurb: string
  kind: SpikeCardKind
  agentId?: string
  dc: number
  dcGraze?: number
  /** Base damage before gun multiplier. */
  damageHit?: readonly [number, number]
  damageGraze?: readonly [number, number]
  heal?: readonly [number, number]
  persist?: SpikePersist
  clearEnemyPersist?: boolean
  plant?: boolean
  defuse?: boolean
  agentDcBonus?: number
  agentDamageBonus?: number
  /** Scales with equipped gun when resolving damage / reactions. */
  usesGun?: boolean
  /** On hit (and graze, if set), add this much ult charge. No passive +1 on other hits. */
  ultGain?: number
  /** Self-damage range when the card misses. */
  missSelfDamage?: readonly [number, number]
}

export const SPIKE_CARDS: readonly SpikeCardDef[] = [
  // Shared + base agent kits + ults below; extras appended at end.
  {
    id: 'ferrari_peek',
    name: 'Ferrari Peek',
    blurb: 'Wide swing. High risk, high reward.',
    kind: 'action',
    usesGun: true,
    dc: 12,
    dcGraze: 8,
    damageHit: [40, 70],
    damageGraze: [12, 24],
  },
  {
    id: 'jump_spot',
    name: 'Jump Spot',
    blurb: 'Hop the common angle.',
    kind: 'action',
    usesGun: true,
    dc: 11,
    dcGraze: 7,
    damageHit: [32, 55],
    damageGraze: [10, 20],
  },
  {
    id: 'bait_swing',
    name: 'Bait Swing',
    blurb: 'Show a pixel, take the trade.',
    kind: 'action',
    usesGun: true,
    dc: 10,
    dcGraze: 6,
    damageHit: [28, 48],
    damageGraze: [8, 16],
  },
  {
    id: 'close_commit',
    name: 'Close Commit',
    blurb: 'Run it down if you made contact.',
    kind: 'action',
    usesGun: true,
    dc: 8,
    damageHit: [42, 72],
  },
  {
    id: 'spray_transfer',
    name: 'Spray Transfer',
    blurb: 'Safer spray. Softer hits.',
    kind: 'action',
    usesGun: true,
    dc: 9,
    dcGraze: 6,
    damageHit: [22, 38],
    damageGraze: [8, 16],
  },
  {
    id: 'lurk_swing',
    name: 'Lurk Swing',
    blurb: 'Late rotate peek.',
    kind: 'action',
    usesGun: true,
    dc: 11,
    dcGraze: 7,
    damageHit: [30, 55],
    damageGraze: [10, 20],
  },
  {
    id: 'camp_angle',
    name: 'Camp Angle',
    blurb: 'Hold. React first when they peek (uses your gun).',
    kind: 'persist',
    dc: 6,
    persist: 'angle',
  },
  {
    id: 'flash_pop',
    name: 'Pop Flash',
    blurb: 'Clears a holding angle on hit.',
    kind: 'util',
    dc: 10,
    clearEnemyPersist: true,
  },
  {
    id: 'smoke_execute',
    name: 'Execute Smoke',
    blurb: 'Cut vision.',
    kind: 'persist',
    dc: 8,
    persist: 'smoke',
  },
  {
    id: 'molly_choke',
    name: 'Molly the Choke',
    blurb: 'Deny a push.',
    kind: 'persist',
    dc: 9,
    persist: 'molly',
    damageHit: [8, 18],
  },
  {
    id: 'recon_dart',
    name: 'Recon Dart',
    blurb: 'Soft chip + info.',
    kind: 'info',
    dc: 9,
    damageHit: [5, 12],
  },
  {
    id: 'heal_kit',
    name: 'Light Shield + Kit',
    blurb: 'Patch up.',
    kind: 'heal',
    dc: 7,
    heal: [18, 30],
  },
  {
    id: 'trap_wire',
    name: 'Trap the Exit',
    blurb: 'Punishes the next gun play.',
    kind: 'persist',
    dc: 8,
    persist: 'trap',
  },
  {
    id: 'plant_spike',
    name: 'Plant Spike',
    blurb: 'ATK only. Starts the timer.',
    kind: 'plant',
    dc: 11,
    plant: true,
  },
  {
    id: 'defuse_spike',
    name: 'Defuse Spike',
    blurb: 'DEF only. Needs live spike.',
    kind: 'defuse',
    dc: 12,
    defuse: true,
  },
  {
    id: 'fake_plant',
    name: 'Fake Plant',
    blurb: 'Bait rotate.',
    kind: 'info',
    dc: 10,
    damageHit: [4, 10],
  },
  {
    id: 'jiggle_info',
    name: 'Jiggle for Info',
    blurb: 'Safe peek.',
    kind: 'info',
    usesGun: true,
    dc: 7,
    damageHit: [3, 8],
  },
  {
    id: 'shoulder_peek',
    name: 'Shoulder Peek',
    blurb: 'Show a bit, take the duel.',
    kind: 'action',
    usesGun: true,
    dc: 10,
    dcGraze: 7,
    damageHit: [26, 44],
    damageGraze: [8, 14],
  },
  {
    id: 'dry_peek',
    name: 'Dry Peek',
    blurb: 'No util. Just aim.',
    kind: 'action',
    usesGun: true,
    dc: 13,
    dcGraze: 9,
    damageHit: [45, 75],
    damageGraze: [14, 26],
  },
  {
    id: 'double_peek',
    name: 'Double Peek',
    blurb: 'Trade setup swing.',
    kind: 'action',
    usesGun: true,
    dc: 9,
    dcGraze: 6,
    damageHit: [24, 42],
    damageGraze: [8, 15],
  },
  {
    id: 'wallbang_line',
    name: 'Wallbang Line',
    blurb: 'Shoot the common hide.',
    kind: 'action',
    usesGun: true,
    dc: 14,
    dcGraze: 10,
    damageHit: [35, 58],
    damageGraze: [12, 22],
  },
  {
    id: 'crouch_spray',
    name: 'Crouch Spray',
    blurb: 'Plant feet. Hold M1.',
    kind: 'action',
    usesGun: true,
    dc: 8,
    dcGraze: 5,
    damageHit: [20, 36],
    damageGraze: [6, 14],
  },
  {
    id: 'retake_swing',
    name: 'Retake Swing',
    blurb: 'Clear site together energy.',
    kind: 'action',
    usesGun: true,
    dc: 11,
    dcGraze: 7,
    damageHit: [34, 58],
    damageGraze: [10, 20],
  },
  {
    id: 'contact_play',
    name: 'Contact Play',
    blurb: 'Push until you hear a gun.',
    kind: 'action',
    usesGun: true,
    dc: 10,
    damageHit: [30, 52],
  },
  {
    id: 'shift_walk',
    name: 'Shift Walk Info',
    blurb: 'Quiet corner check.',
    kind: 'info',
    usesGun: true,
    dc: 6,
    damageHit: [2, 6],
  },
  {
    id: 'bounce_nade',
    name: 'Bounce Nade',
    blurb: 'Clear a default angle.',
    kind: 'util',
    dc: 10,
    damageHit: [14, 28],
    clearEnemyPersist: true,
  },
  {
    id: 'post_plant_cross',
    name: 'Post-Plant Cross',
    blurb: 'Hold the planter cross.',
    kind: 'persist',
    dc: 7,
    persist: 'angle',
  },
  {
    id: 'default_smoke',
    name: 'Default Smoke',
    blurb: 'Cut the common lane.',
    kind: 'persist',
    dc: 7,
    persist: 'smoke',
  },
  {
    id: 'deny_plant_molly',
    name: 'Deny Plant Molly',
    blurb: 'Force them off the bomb.',
    kind: 'persist',
    dc: 9,
    persist: 'molly',
    damageHit: [10, 20],
  },
  {
    id: 'exit_trap',
    name: 'Exit Frag Trap',
    blurb: 'Punish the rotate.',
    kind: 'persist',
    dc: 8,
    persist: 'trap',
  },
  {
    id: 'flash_support',
    name: 'Support Flash',
    blurb: 'Blind the holder for your swing.',
    kind: 'util',
    dc: 9,
    clearEnemyPersist: true,
  },
  {
    id: 'trade_frag',
    name: 'Trade Frag',
    blurb: 'You die? Teammate energy. Solo: chip.',
    kind: 'action',
    usesGun: true,
    dc: 9,
    damageHit: [18, 32],
  },
  {
    id: 'eco_force',
    name: 'Force Buy Diff',
    blurb: 'Believe in the pistol aim.',
    kind: 'action',
    usesGun: true,
    dc: 12,
    dcGraze: 8,
    damageHit: [38, 65],
    damageGraze: [12, 22],
  },
  {
    id: 'save_chip',
    name: 'Save Round Chip',
    blurb: 'Tag and hide. Play for next.',
    kind: 'info',
    usesGun: true,
    dc: 8,
    damageHit: [8, 16],
  },
  {
    id: 'mid_control',
    name: 'Mid Control',
    blurb: 'Take space, then swing.',
    kind: 'action',
    usesGun: true,
    dc: 10,
    dcGraze: 7,
    damageHit: [28, 46],
    damageGraze: [8, 16],
  },
  {
    id: 'fast_rotate',
    name: 'Fast Rotate',
    blurb: 'Beat the lurk timing.',
    kind: 'info',
    dc: 8,
    damageHit: [4, 10],
  },
  {
    id: 'ultimate_orb',
    name: 'Orb Steal Fight',
    blurb: 'Fight over the ult orb.',
    kind: 'action',
    usesGun: true,
    dc: 11,
    damageHit: [26, 44],
  },
  {
    id: 'full_buy_duel',
    name: 'Full Buy Duel',
    blurb: 'Fair fight. No excuses.',
    kind: 'action',
    usesGun: true,
    dc: 10,
    dcGraze: 7,
    damageHit: [32, 54],
    damageGraze: [10, 18],
  },
  {
    id: 'grab_ult_orb',
    name: 'Grab Ult Orb',
    blurb: 'Common drop. Graze = safe +1 ult. Hit = +1 ult + chip. Miss = you eat chip.',
    kind: 'info',
    dc: 7,
    dcGraze: 4,
    damageHit: [6, 14],
    ultGain: 1,
    missSelfDamage: [8, 16],
  },
  {
    id: 'reload_settle',
    name: 'Reload & Settle',
    blurb: 'Reset. Soft heal while you top up.',
    kind: 'heal',
    dc: 6,
    heal: [10, 18],
  },
  {
    id: 'ability_deny',
    name: 'Ability Deny',
    blurb: 'Break their util hold on hit.',
    kind: 'util',
    dc: 8,
    clearEnemyPersist: true,
  },
  {
    id: 'clutch_swing',
    name: 'Clutch Swing',
    blurb: 'Low-HP energy. Need −3 when you are under 40 HP.',
    kind: 'action',
    usesGun: true,
    dc: 11,
    dcGraze: 7,
    damageHit: [36, 60],
    damageGraze: [12, 22],
  },
  {
    id: 'waste_clock',
    name: 'Waste the Clock',
    blurb: 'Stall. If spike is live, shave a turn off the timer on hit.',
    kind: 'info',
    dc: 9,
  },
  // Meta / meme shared cards — still real effects, mostly comedy.
  {
    id: 'report_cheating',
    name: 'Report for Cheating',
    blurb: 'Open the report menu mid-fight. Soft emotional damage.',
    kind: 'info',
    dc: 8,
    damageHit: [10, 18],
  },
  {
    id: 'vote_surrender',
    name: 'Call Vote to Surrender',
    blurb: 'F6 energy. On hit: cope-heal (the vote still fails).',
    kind: 'heal',
    dc: 6,
    heal: [14, 24],
  },
  {
    id: 'complain_jett',
    name: 'Complain About Their Jett',
    blurb: 'Type in chat. Somehow it chips them.',
    kind: 'info',
    dc: 7,
    damageHit: [8, 16],
  },
  {
    id: 'get_water',
    name: 'Walk Away for Water',
    blurb: 'Hydrate. Soft heal if you make it back in time.',
    kind: 'heal',
    dc: 5,
    heal: [16, 28],
  },
  {
    id: 'cringe_teens_all_chat',
    name: 'Cringe Teens In All-Chat',
    blurb: 'Read it. Regret it. Clears their hold out of secondhand embarrassment.',
    kind: 'util',
    dc: 9,
    damageHit: [6, 12],
    clearEnemyPersist: true,
  },
  {
    id: 'gun_buddy',
    name: 'Looked at Their Gun Buddy',
    blurb: 'Confirm the drip. Soft chip anyway.',
    kind: 'info',
    dc: 8,
    damageHit: [8, 14],
  },
  {
    id: 'crouch_spam',
    name: 'Crouch Spam Teammate',
    blurb: 'Suspicious movement. Soft chip + info energy.',
    kind: 'info',
    dc: 7,
    damageHit: [6, 12],
  },
  {
    id: 'jett_dash_peek',
    name: 'Tailwind Peek',
    blurb: 'Dash wide.',
    kind: 'action',
    usesGun: true,
    agentId: 'add6443a-41bd-e414-f6ad-e58d267f4e95',
    dc: 10,
    dcGraze: 7,
    damageHit: [35, 60],
    damageGraze: [10, 20],
    agentDcBonus: 2,
  },
  {
    id: 'jett_updraft',
    name: 'Updraft Peek',
    blurb: 'Airborne angle.',
    kind: 'action',
    usesGun: true,
    agentId: 'add6443a-41bd-e414-f6ad-e58d267f4e95',
    dc: 12,
    damageHit: [50, 80],
    agentDamageBonus: 8,
  },
  {
    id: 'phoenix_curve',
    name: 'Curve Flash into Swing',
    blurb: 'Clears holds.',
    kind: 'action',
    usesGun: true,
    agentId: 'eb93336a-449b-9c1b-0a54-a891f7921d69',
    dc: 11,
    damageHit: [30, 50],
    clearEnemyPersist: true,
    agentDcBonus: 1,
  },
  {
    id: 'phoenix_hot_hands',
    name: 'Hot Hands Heal',
    blurb: 'Stand in your fire.',
    kind: 'heal',
    agentId: 'eb93336a-449b-9c1b-0a54-a891f7921d69',
    dc: 6,
    heal: [25, 40],
  },
  {
    id: 'sage_heal',
    name: 'Sage Heal',
    blurb: 'Big heal.',
    kind: 'heal',
    agentId: '569fdd95-4d10-43ab-ca70-79becc718b46',
    dc: 5,
    heal: [30, 45],
  },
  {
    id: 'sage_wall',
    name: 'Sage Wall',
    blurb: 'Smoke-style persist.',
    kind: 'persist',
    agentId: '569fdd95-4d10-43ab-ca70-79becc718b46',
    dc: 7,
    persist: 'smoke',
  },
  {
    id: 'sova_shock',
    name: 'Shock Dart Lineup',
    blurb: 'Clear a corner.',
    kind: 'util',
    agentId: '320b2a48-4d9b-a075-30f1-1f93a9b638fa',
    dc: 10,
    damageHit: [20, 35],
    clearEnemyPersist: true,
  },
  {
    id: 'sova_recon',
    name: 'Recon Bolt',
    blurb: 'Reveal + chip.',
    kind: 'info',
    agentId: '320b2a48-4d9b-a075-30f1-1f93a9b638fa',
    dc: 8,
    damageHit: [10, 18],
  },
  {
    id: 'cypher_cage',
    name: 'Cyber Cage',
    blurb: 'Smoke persist.',
    kind: 'persist',
    agentId: '117ed9e3-49f3-6512-3ccf-0cada7e3823b',
    dc: 7,
    persist: 'smoke',
  },
  {
    id: 'cypher_trip',
    name: 'Trapwire Cross',
    blurb: 'Trap persist.',
    kind: 'persist',
    agentId: '117ed9e3-49f3-6512-3ccf-0cada7e3823b',
    dc: 6,
    persist: 'trap',
  },
  {
    id: 'brim_stim',
    name: 'Stim Beacon Swing',
    blurb: 'Faster peek.',
    kind: 'action',
    usesGun: true,
    agentId: '9f0d8ba9-4140-b941-57d3-a7ad57c6b417',
    dc: 10,
    damageHit: [28, 48],
    agentDcBonus: 2,
  },
  {
    id: 'brim_incendiary',
    name: 'Incendiary Line',
    blurb: 'Clear a hold with fire.',
    kind: 'util',
    agentId: '9f0d8ba9-4140-b941-57d3-a7ad57c6b417',
    dc: 10,
    damageHit: [18, 30],
    clearEnemyPersist: true,
  },
  // Agent ults — sticky slot only; never shuffled into the deck.
  // Need ~10–11 so casting is a real swing (charge is spent on play).
  {
    id: 'ult_jett',
    name: 'Blade Storm',
    blurb: 'Ult. Knives out — huge damage if it lands.',
    kind: 'ult',
    usesGun: true,
    agentId: 'add6443a-41bd-e414-f6ad-e58d267f4e95',
    dc: 11,
    damageHit: [55, 85],
    agentDamageBonus: 10,
  },
  {
    id: 'ult_phoenix',
    name: 'Run it Back',
    blurb: 'Ult. Big self-heal if it lands.',
    kind: 'ult',
    agentId: 'eb93336a-449b-9c1b-0a54-a891f7921d69',
    dc: 10,
    heal: [40, 55],
  },
  {
    id: 'ult_sage',
    name: 'Resurrection',
    blurb: 'Ult. Patch yourself hard if it lands.',
    kind: 'ult',
    agentId: '569fdd95-4d10-43ab-ca70-79becc718b46',
    dc: 10,
    heal: [45, 65],
  },
  {
    id: 'ult_sova',
    name: 'I AM THE HUNTER',
    blurb: 'Ult. Clear holds + chunk damage.',
    kind: 'ult',
    agentId: '320b2a48-4d9b-a075-30f1-1f93a9b638fa',
    dc: 11,
    damageHit: [40, 65],
    clearEnemyPersist: true,
  },
  {
    id: 'ult_cypher',
    name: 'Neural Theft',
    blurb: 'Ult. Reveal + clear + chip.',
    kind: 'ult',
    agentId: '117ed9e3-49f3-6512-3ccf-0cada7e3823b',
    dc: 11,
    damageHit: [22, 38],
    clearEnemyPersist: true,
  },
  {
    id: 'ult_brim',
    name: 'Orbital Strike',
    blurb: 'Ult. Soften site and clear holds.',
    kind: 'ult',
    agentId: '9f0d8ba9-4140-b941-57d3-a7ad57c6b417',
    dc: 11,
    damageHit: [45, 70],
    clearEnemyPersist: true,
  },
  // —— Astra
  {
    id: 'astra_gravity',
    name: 'Gravity Well Pull',
    blurb: 'Suck them off the angle.',
    kind: 'util',
    agentId: '41fb69c1-4189-7b37-f117-bcaf1e96f1bf',
    dc: 10,
    damageHit: [16, 28],
    clearEnemyPersist: true,
  },
  {
    id: 'astra_nova',
    name: 'Nova Pulse Stun',
    blurb: 'Stars say sit.',
    kind: 'info',
    agentId: '41fb69c1-4189-7b37-f117-bcaf1e96f1bf',
    dc: 8,
    damageHit: [8, 16],
  },
  {
    id: 'ult_astra',
    name: 'Cosmic Divide',
    blurb: 'Ult. Split the map — clear + chunk.',
    kind: 'ult',
    agentId: '41fb69c1-4189-7b37-f117-bcaf1e96f1bf',
    dc: 11,
    damageHit: [42, 68],
    clearEnemyPersist: true,
  },
  // —— Breach
  {
    id: 'breach_flash',
    name: 'Flashpoint Through Wall',
    blurb: 'Blind the hold.',
    kind: 'action',
    usesGun: true,
    agentId: '5f8d3a7f-467b-97f3-062c-13acf203c006',
    dc: 10,
    damageHit: [30, 52],
    agentDcBonus: 2,
  },
  {
    id: 'breach_aftershock',
    name: 'Aftershock Cleared',
    blurb: 'Quake the corner.',
    kind: 'util',
    agentId: '5f8d3a7f-467b-97f3-062c-13acf203c006',
    dc: 10,
    damageHit: [22, 36],
    clearEnemyPersist: true,
  },
  {
    id: 'ult_breach',
    name: 'Rolling Thunder',
    blurb: 'Ult. Earthquake the whole site.',
    kind: 'ult',
    agentId: '5f8d3a7f-467b-97f3-062c-13acf203c006',
    dc: 11,
    damageHit: [48, 72],
    clearEnemyPersist: true,
  },
  // —— Chamber
  {
    id: 'chamber_trademark',
    name: 'Trademark Trip',
    blurb: 'Fancy trap.',
    kind: 'persist',
    agentId: '22697a3d-45bf-8dd7-4fec-84a9e28c69d7',
    dc: 6,
    persist: 'trap',
  },
  {
    id: 'chamber_headhunter',
    name: 'Headhunter Peek',
    blurb: 'Premium pistol energy.',
    kind: 'action',
    usesGun: true,
    agentId: '22697a3d-45bf-8dd7-4fec-84a9e28c69d7',
    dc: 11,
    damageHit: [40, 70],
    agentDamageBonus: 10,
  },
  {
    id: 'ult_chamber',
    name: 'Tour De Force',
    blurb: 'Ult. Operator with manners.',
    kind: 'ult',
    usesGun: true,
    agentId: '22697a3d-45bf-8dd7-4fec-84a9e28c69d7',
    dc: 11,
    damageHit: [60, 90],
    agentDamageBonus: 12,
  },
  // —— Clove
  {
    id: 'clove_ruse',
    name: 'Ruse Smoke',
    blurb: 'Dead? Still smoking.',
    kind: 'persist',
    agentId: '1dbf2edd-4729-0984-3115-daa5eed44993',
    dc: 7,
    persist: 'smoke',
  },
  {
    id: 'clove_meddle',
    name: 'Meddle Decay',
    blurb: 'Chip their ego.',
    kind: 'util',
    agentId: '1dbf2edd-4729-0984-3115-daa5eed44993',
    dc: 9,
    damageHit: [18, 30],
    clearEnemyPersist: true,
  },
  {
    id: 'ult_clove',
    name: 'Not Dead Yet',
    blurb: 'Ult. Refusing the afterlife — big heal.',
    kind: 'ult',
    agentId: '1dbf2edd-4729-0984-3115-daa5eed44993',
    dc: 10,
    heal: [42, 60],
  },
  // —— Deadlock
  {
    id: 'deadlock_gravnet',
    name: 'GravNet Catch',
    blurb: 'Net the swing.',
    kind: 'util',
    agentId: 'cc8b64c8-4b25-4ff9-6e7f-37b4da43d235',
    dc: 9,
    damageHit: [14, 24],
    clearEnemyPersist: true,
  },
  {
    id: 'deadlock_sonic',
    name: 'Sonic Sensor Watch',
    blurb: 'Listen hard.',
    kind: 'persist',
    agentId: 'cc8b64c8-4b25-4ff9-6e7f-37b4da43d235',
    dc: 6,
    persist: 'trap',
  },
  {
    id: 'ult_deadlock',
    name: 'Annihilation',
    blurb: 'Ult. Wall them into regret.',
    kind: 'ult',
    agentId: 'cc8b64c8-4b25-4ff9-6e7f-37b4da43d235',
    dc: 11,
    damageHit: [50, 75],
    clearEnemyPersist: true,
  },
  // —— Fade
  {
    id: 'fade_seize',
    name: 'Seize Pounce',
    blurb: 'Nightmare hug.',
    kind: 'util',
    agentId: 'dade69b4-4f5a-8528-247b-219e5a1facd6',
    dc: 10,
    damageHit: [20, 34],
    clearEnemyPersist: true,
  },
  {
    id: 'fade_haunt',
    name: 'Haunt Reveal',
    blurb: 'Eye in the dark.',
    kind: 'info',
    agentId: 'dade69b4-4f5a-8528-247b-219e5a1facd6',
    dc: 8,
    damageHit: [10, 18],
  },
  {
    id: 'ult_fade',
    name: 'Nightfall',
    blurb: 'Ult. Deafening dread + chunk.',
    kind: 'ult',
    agentId: 'dade69b4-4f5a-8528-247b-219e5a1facd6',
    dc: 11,
    damageHit: [40, 66],
    clearEnemyPersist: true,
  },
  // —— Gekko
  {
    id: 'gekko_dizzy',
    name: 'Dizzy Pop',
    blurb: 'Creature flash.',
    kind: 'action',
    usesGun: true,
    agentId: 'e370fa57-4757-3604-3648-499e1f642d3f',
    dc: 10,
    damageHit: [28, 48],
    agentDcBonus: 2,
  },
  {
    id: 'gekko_wingman',
    name: 'Wingman Assist',
    blurb: 'Little guy, big plant energy.',
    kind: 'info',
    agentId: 'e370fa57-4757-3604-3648-499e1f642d3f',
    dc: 7,
    damageHit: [8, 14],
  },
  {
    id: 'ult_gekko',
    name: 'Thrash',
    blurb: 'Ult. Detain the whole vibe.',
    kind: 'ult',
    agentId: 'e370fa57-4757-3604-3648-499e1f642d3f',
    dc: 11,
    damageHit: [44, 70],
    clearEnemyPersist: true,
  },
  // —— Harbor
  {
    id: 'harbor_cove',
    name: 'Cove Bubble',
    blurb: 'Smoke sphere.',
    kind: 'persist',
    agentId: '95b78ed7-4637-86d9-7e41-71ba8c293152',
    dc: 7,
    persist: 'smoke',
  },
  {
    id: 'harbor_cascade',
    name: 'Cascade Wall',
    blurb: 'Water curtain.',
    kind: 'util',
    agentId: '95b78ed7-4637-86d9-7e41-71ba8c293152',
    dc: 9,
    damageHit: [12, 22],
    clearEnemyPersist: true,
  },
  {
    id: 'ult_harbor',
    name: 'Reckoning',
    blurb: 'Ult. Geysers say leave.',
    kind: 'ult',
    agentId: '95b78ed7-4637-86d9-7e41-71ba8c293152',
    dc: 11,
    damageHit: [46, 70],
    clearEnemyPersist: true,
  },
  // —— Iso
  {
    id: 'iso_undercut',
    name: 'Undercut Swing',
    blurb: 'Vulnerable peek.',
    kind: 'action',
    usesGun: true,
    agentId: '0e38b510-41a8-5780-5e8f-568b2a4f2d6c',
    dc: 10,
    damageHit: [32, 55],
    agentDcBonus: 1,
  },
  {
    id: 'iso_contingency',
    name: 'Contingency Shield',
    blurb: 'Wall of focus.',
    kind: 'heal',
    agentId: '0e38b510-41a8-5780-5e8f-568b2a4f2d6c',
    dc: 7,
    heal: [20, 32],
  },
  {
    id: 'ult_iso',
    name: 'Kill Contract',
    blurb: 'Ult. 1v1 arena — huge swing.',
    kind: 'ult',
    usesGun: true,
    agentId: '0e38b510-41a8-5780-5e8f-568b2a4f2d6c',
    dc: 11,
    damageHit: [55, 85],
    agentDamageBonus: 10,
  },
  // —— KAY/O
  {
    id: 'kayo_flash',
    name: 'FLASH/drive',
    blurb: 'Pop flash, commit.',
    kind: 'action',
    usesGun: true,
    agentId: '601dbbe7-43ce-be57-2a40-4abd24953621',
    dc: 10,
    damageHit: [30, 50],
    agentDcBonus: 2,
  },
  {
    id: 'kayo_knife',
    name: 'ZERO/point',
    blurb: 'Suppress their toys.',
    kind: 'util',
    agentId: '601dbbe7-43ce-be57-2a40-4abd24953621',
    dc: 9,
    damageHit: [16, 28],
    clearEnemyPersist: true,
  },
  {
    id: 'ult_kayo',
    name: 'NULL/cmd',
    blurb: 'Ult. Overload — clear + punish.',
    kind: 'ult',
    agentId: '601dbbe7-43ce-be57-2a40-4abd24953621',
    dc: 11,
    damageHit: [48, 74],
    clearEnemyPersist: true,
  },
  // —— Killjoy
  {
    id: 'kj_alarmbot',
    name: 'Alarmbot Deploy',
    blurb: 'Beep of destiny.',
    kind: 'persist',
    agentId: '1e58de9c-4950-5125-93e9-a0aee9f98746',
    dc: 6,
    persist: 'trap',
  },
  {
    id: 'kj_nanoswarm',
    name: 'Nanoswarm Line',
    blurb: 'Grenade on a string.',
    kind: 'util',
    agentId: '1e58de9c-4950-5125-93e9-a0aee9f98746',
    dc: 10,
    damageHit: [22, 36],
    clearEnemyPersist: true,
  },
  {
    id: 'ult_kj',
    name: 'Lockdown',
    blurb: 'Ult. Site is hers now.',
    kind: 'ult',
    agentId: '1e58de9c-4950-5125-93e9-a0aee9f98746',
    dc: 11,
    damageHit: [45, 70],
    clearEnemyPersist: true,
  },
  // —— Miks
  {
    id: 'miks_echo',
    name: 'Echo Veil',
    blurb: 'Remix the sightline.',
    kind: 'persist',
    agentId: '7c8a4701-4de6-9355-b254-e09bc2a34b72',
    dc: 7,
    persist: 'smoke',
  },
  {
    id: 'miks_pulse',
    name: 'Pulse Field',
    blurb: 'Bass drop chip.',
    kind: 'util',
    agentId: '7c8a4701-4de6-9355-b254-e09bc2a34b72',
    dc: 9,
    damageHit: [18, 30],
    clearEnemyPersist: true,
  },
  {
    id: 'ult_miks',
    name: 'Drop the Mix',
    blurb: 'Ult. Full-site remix — clear + crush.',
    kind: 'ult',
    agentId: '7c8a4701-4de6-9355-b254-e09bc2a34b72',
    dc: 11,
    damageHit: [46, 72],
    clearEnemyPersist: true,
  },
  // —— Neon
  {
    id: 'neon_relay',
    name: 'Relay Bolt',
    blurb: 'Zip zap stun.',
    kind: 'util',
    agentId: 'bb2a4828-46eb-8cd1-e765-15848195d751',
    dc: 9,
    damageHit: [16, 28],
    clearEnemyPersist: true,
  },
  {
    id: 'neon_fastlane',
    name: 'Fast Lane Slide',
    blurb: 'Wallride peek.',
    kind: 'action',
    usesGun: true,
    agentId: 'bb2a4828-46eb-8cd1-e765-15848195d751',
    dc: 10,
    dcGraze: 7,
    damageHit: [34, 58],
    damageGraze: [12, 22],
    agentDcBonus: 2,
  },
  {
    id: 'ult_neon',
    name: 'Overdrive',
    blurb: 'Ult. Full sprint laser spray.',
    kind: 'ult',
    usesGun: true,
    agentId: 'bb2a4828-46eb-8cd1-e765-15848195d751',
    dc: 11,
    damageHit: [52, 82],
    agentDamageBonus: 8,
  },
  // —— Omen
  {
    id: 'omen_paranoia',
    name: 'Paranoia Blind',
    blurb: 'Darkness ahead.',
    kind: 'action',
    usesGun: true,
    agentId: '8e253930-4c05-31dd-1b6c-968525494517',
    dc: 10,
    damageHit: [28, 48],
    agentDcBonus: 2,
  },
  {
    id: 'omen_shroud',
    name: 'Shrouded Step',
    blurb: 'TP smoke.',
    kind: 'persist',
    agentId: '8e253930-4c05-31dd-1b6c-968525494517',
    dc: 7,
    persist: 'smoke',
  },
  {
    id: 'ult_omen',
    name: 'From the Shadows',
    blurb: 'Ult. Global TP energy — clear + chip.',
    kind: 'ult',
    agentId: '8e253930-4c05-31dd-1b6c-968525494517',
    dc: 11,
    damageHit: [38, 62],
    clearEnemyPersist: true,
  },
  // —— Raze
  {
    id: 'raze_blast',
    name: 'Blast Pack Boost',
    blurb: 'Satchel into site.',
    kind: 'action',
    usesGun: true,
    agentId: 'f94c3b30-42be-e959-889c-5aa313dba261',
    dc: 11,
    damageHit: [38, 65],
    agentDamageBonus: 8,
  },
  {
    id: 'raze_paint',
    name: 'Paint Shells',
    blurb: 'Grenade party.',
    kind: 'util',
    agentId: 'f94c3b30-42be-e959-889c-5aa313dba261',
    dc: 10,
    damageHit: [24, 40],
    clearEnemyPersist: true,
  },
  {
    id: 'ult_raze',
    name: 'Showstopper',
    blurb: 'Ult. Rocket. Room. Gone.',
    kind: 'ult',
    agentId: 'f94c3b30-42be-e959-889c-5aa313dba261',
    dc: 11,
    damageHit: [55, 85],
    clearEnemyPersist: true,
  },
  // —— Reyna
  {
    id: 'reyna_leer',
    name: 'Leer Blind',
    blurb: 'Eye contact combat.',
    kind: 'action',
    usesGun: true,
    agentId: 'a3bfb853-43b2-7238-a4f1-ad90e9e46bcc',
    dc: 10,
    damageHit: [32, 55],
    agentDcBonus: 2,
  },
  {
    id: 'reyna_devour',
    name: 'Devour',
    blurb: 'Soul snack heal.',
    kind: 'heal',
    agentId: 'a3bfb853-43b2-7238-a4f1-ad90e9e46bcc',
    dc: 6,
    heal: [25, 40],
  },
  {
    id: 'ult_reyna',
    name: 'Empress',
    blurb: 'Ult. Full send — huge gun swing.',
    kind: 'ult',
    usesGun: true,
    agentId: 'a3bfb853-43b2-7238-a4f1-ad90e9e46bcc',
    dc: 11,
    damageHit: [55, 88],
    agentDamageBonus: 12,
  },
  // —— Skye
  {
    id: 'skye_flash',
    name: 'Guiding Light',
    blurb: 'Bird flash.',
    kind: 'action',
    usesGun: true,
    agentId: '6f2a04ca-43e0-be17-7f36-b3908627744d',
    dc: 10,
    damageHit: [28, 48],
    agentDcBonus: 2,
  },
  {
    id: 'skye_trail',
    name: 'Trailblazer',
    blurb: 'Dog clears corners.',
    kind: 'info',
    agentId: '6f2a04ca-43e0-be17-7f36-b3908627744d',
    dc: 8,
    damageHit: [12, 20],
    clearEnemyPersist: true,
  },
  {
    id: 'ult_skye',
    name: 'Seekers',
    blurb: 'Ult. Three birds. No chill.',
    kind: 'ult',
    agentId: '6f2a04ca-43e0-be17-7f36-b3908627744d',
    dc: 11,
    damageHit: [40, 65],
    clearEnemyPersist: true,
  },
  // —— Tejo
  {
    id: 'tejo_salvo',
    name: 'Guided Salvo',
    blurb: 'Missiles on a schedule.',
    kind: 'util',
    agentId: 'b444168c-4e35-8076-db47-ef9bf368f384',
    dc: 10,
    damageHit: [22, 36],
    clearEnemyPersist: true,
  },
  {
    id: 'tejo_drone',
    name: 'Stealth Drone Peek',
    blurb: 'Info with attitude.',
    kind: 'info',
    agentId: 'b444168c-4e35-8076-db47-ef9bf368f384',
    dc: 8,
    damageHit: [10, 18],
  },
  {
    id: 'ult_tejo',
    name: 'Armageddon',
    blurb: 'Ult. Barrage the site flat.',
    kind: 'ult',
    agentId: 'b444168c-4e35-8076-db47-ef9bf368f384',
    dc: 11,
    damageHit: [50, 78],
    clearEnemyPersist: true,
  },
  // —— Veto
  {
    id: 'veto_ward',
    name: 'Ward Line',
    blurb: 'Sentinel deny.',
    kind: 'persist',
    agentId: '92eeef5d-43b5-1d4a-8d03-b3927a09034b',
    dc: 6,
    persist: 'trap',
  },
  {
    id: 'veto_intercept',
    name: 'Intercept',
    blurb: 'Cancel their plan.',
    kind: 'util',
    agentId: '92eeef5d-43b5-1d4a-8d03-b3927a09034b',
    dc: 9,
    damageHit: [16, 28],
    clearEnemyPersist: true,
  },
  {
    id: 'ult_veto',
    name: 'Veto Protocol',
    blurb: 'Ult. Absolute no — clear + punish.',
    kind: 'ult',
    agentId: '92eeef5d-43b5-1d4a-8d03-b3927a09034b',
    dc: 11,
    damageHit: [44, 70],
    clearEnemyPersist: true,
  },
  // —— Viper
  {
    id: 'viper_cloud',
    name: 'Poison Cloud',
    blurb: 'Toxic smoke.',
    kind: 'persist',
    agentId: '707eab51-4836-f488-046a-cda6bf494859',
    dc: 7,
    persist: 'smoke',
  },
  {
    id: 'viper_snakebite',
    name: 'Snake Bite',
    blurb: 'Acid puddle.',
    kind: 'util',
    agentId: '707eab51-4836-f488-046a-cda6bf494859',
    dc: 10,
    damageHit: [20, 34],
    clearEnemyPersist: true,
  },
  {
    id: 'ult_viper',
    name: "Viper's Pit",
    blurb: 'Ult. Own the fog — clear + melt.',
    kind: 'ult',
    agentId: '707eab51-4836-f488-046a-cda6bf494859',
    dc: 11,
    damageHit: [48, 74],
    clearEnemyPersist: true,
  },
  // —— Vyse
  {
    id: 'vyse_shear',
    name: 'Shear Wall',
    blurb: 'Metal denial.',
    kind: 'persist',
    agentId: 'efba5359-4016-a1e5-7626-b1ae76895940',
    dc: 7,
    persist: 'smoke',
  },
  {
    id: 'vyse_arc',
    name: 'Arc Rose',
    blurb: 'Flashy thorns.',
    kind: 'util',
    agentId: 'efba5359-4016-a1e5-7626-b1ae76895940',
    dc: 9,
    damageHit: [18, 30],
    clearEnemyPersist: true,
  },
  {
    id: 'ult_vyse',
    name: 'Steel Garden',
    blurb: 'Ult. Bloom of blades — clear + cut.',
    kind: 'ult',
    agentId: 'efba5359-4016-a1e5-7626-b1ae76895940',
    dc: 11,
    damageHit: [46, 72],
    clearEnemyPersist: true,
  },
  // —— Waylay
  {
    id: 'waylay_refract',
    name: 'Refract Peek',
    blurb: 'Light-bend swing.',
    kind: 'action',
    usesGun: true,
    agentId: 'df1cb487-4902-002e-5c17-d28e83e78588',
    dc: 10,
    dcGraze: 7,
    damageHit: [34, 58],
    damageGraze: [12, 22],
    agentDcBonus: 2,
  },
  {
    id: 'waylay_afterimage',
    name: 'Afterimage Fake',
    blurb: 'Ghost step info.',
    kind: 'info',
    agentId: 'df1cb487-4902-002e-5c17-d28e83e78588',
    dc: 8,
    damageHit: [10, 16],
  },
  {
    id: 'ult_waylay',
    name: 'Prism Rush',
    blurb: 'Ult. Shatter peek — huge damage.',
    kind: 'ult',
    usesGun: true,
    agentId: 'df1cb487-4902-002e-5c17-d28e83e78588',
    dc: 11,
    damageHit: [54, 84],
    agentDamageBonus: 10,
  },
  // —— Yoru
  {
    id: 'yoru_fakeout',
    name: 'Fakeout Clone',
    blurb: 'Footsteps lie.',
    kind: 'info',
    agentId: '7f94d92c-4234-0a36-9646-3a87eb8b5c89',
    dc: 7,
    damageHit: [8, 14],
  },
  {
    id: 'yoru_blind',
    name: 'Blindside Flash',
    blurb: 'Dim flash into swing.',
    kind: 'action',
    usesGun: true,
    agentId: '7f94d92c-4234-0a36-9646-3a87eb8b5c89',
    dc: 10,
    damageHit: [30, 52],
    agentDcBonus: 2,
  },
  {
    id: 'ult_yoru',
    name: 'Dimensional Drift',
    blurb: 'Ult. Untouchable swing from nowhere.',
    kind: 'ult',
    usesGun: true,
    agentId: '7f94d92c-4234-0a36-9646-3a87eb8b5c89',
    dc: 11,
    damageHit: [52, 80],
    agentDamageBonus: 10,
    clearEnemyPersist: true,
  },
  ...SPIKE_EXTRA_UNIQUES as SpikeCardDef[],
]

const BY_ID = new Map(SPIKE_CARDS.map((c) => [c.id, c]))

export function spikeCard(id: string): SpikeCardDef | null {
  return BY_ID.get(id) ?? null
}

/** Agent ult card (sticky slot) — not drawn from the deck. */
export function spikeUltCard(agentId: string): SpikeCardDef | null {
  return (
    SPIKE_CARDS.find((c) => c.kind === 'ult' && c.agentId === agentId) ?? null
  )
}

/** Non-ult unique cards for an agent (playstyle kit). */
export function spikeAgentUniques(agentId: string): SpikeCardDef[] {
  return SPIKE_CARDS.filter(
    (c) => c.agentId === agentId && c.kind !== 'ult',
  )
}

/**
 * Plain-English effect line from card stats (damage, heal, plant, clears…).
 * Prefer this under flavor when the player needs to know what happens.
 */
export function spikeCardEffectSummary(card: SpikeCardDef): string {
  const parts: string[] = []

  if (card.heal) {
    parts.push(`On hit: heal yourself ${card.heal[0]}–${card.heal[1]} HP`)
  }

  if (card.damageHit) {
    const bonus =
      card.agentDamageBonus != null ? ` (+${card.agentDamageBonus})` : ''
    const gun =
      card.usesGun || card.kind === 'action' ? ', scales with your gun' : ''
    let dmg = `On hit: deal ${card.damageHit[0]}–${card.damageHit[1]}${bonus} damage${gun}`
    if (card.clearEnemyPersist) dmg += '; clears their hold/smoke/trap'
    parts.push(dmg)
  } else if (card.clearEnemyPersist) {
    parts.push('On hit: clears their hold/smoke/trap')
  }

  if (card.damageGraze) {
    parts.push(
      `Graze: ${card.damageGraze[0]}–${card.damageGraze[1]} damage`,
    )
  }

  if (card.persist) {
    parts.push(`On hit: set ${persistLabel(card.persist)}`)
  }

  if (card.plant) {
    parts.push('On hit: plant the spike (+1 ult)')
  }

  if (card.defuse) {
    parts.push('On hit: defuse the spike and win the round (+1 ult)')
  }

  if (card.ultGain && !card.plant && !card.defuse) {
    parts.push(
      `Hit or graze: +${card.ultGain} ult charge${
        card.damageGraze ? '' : ' (graze is safe — no damage)'
      }`,
    )
  }

  if (card.id === 'waste_clock') {
    parts.push('On hit: if spike is live, −1 turn on the timer')
  }

  if (card.id === 'clutch_swing') {
    parts.push('Need −3 while you are under 40 HP')
  }

  if (card.missSelfDamage) {
    parts.push(
      `On miss: take ${card.missSelfDamage[0]}–${card.missSelfDamage[1]} yourself`,
    )
  }

  if (parts.length === 0) return card.blurb
  return parts.join('. ') + '.'
}

export function persistLabel(p: SpikePersist): string {
  switch (p) {
    case 'angle':
      return 'Holding angle'
    case 'smoke':
      return 'Smoke up'
    case 'trap':
      return 'Trap set'
    case 'molly':
      return 'Molly burning'
  }
}

export function scaleGunDamage(
  base: number,
  gunId: SpikeGunId,
  usesGun: boolean | undefined,
): number {
  if (!usesGun || base <= 0) return base
  return Math.max(1, Math.round(base * spikeGun(gunId).damageMult))
}
