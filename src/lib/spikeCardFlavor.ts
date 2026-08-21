/**
 * Spike card flavor — short Valorant-coded one-liners for the hand UI.
 * Tone matches chessQuotes: dry, self-aware, a little unhinged.
 */

const GENERIC = [
  'I have a plan. It is mostly vibes.',
  'Trust. Or do not. I am doing it anyway.',
  'Main character energy. Side quest aim.',
  'This is fine. The spike is fine.',
  'I read the site. It read me harder.',
  'Skill issue. Currently downloading skill.',
  'Do not perceive my crosshair.',
  'Watch me cook. Or flash myself.',
  'I contain multitudes. Mostly utility.',
  'Send help. Or a smoke.',
] as const

const BY_KIND: Record<string, readonly string[]> = {
  action: [
    'Wide swing. Therapy later.',
    'I saw a pixel. I am the pixel now.',
    'Contact play. Emotionally.',
    'Dry peek. Wet palms.',
    'Trade ready. Dignity optional.',
    'Ferrari peek. No license.',
    'I cleared the angle. Mentally.',
    'Jiggle for info. Commit for glory.',
  ],
  util: [
    'Utility gap? That is a them problem.',
    'Flashbang diplomacy.',
    'I brought util. I will use none of it correctly.',
    'Clear the hold. Clear my search history.',
    'Ability deny. Also deny accountability.',
  ],
  info: [
    'Info is free. Dying for it is not.',
    'I jiggled. The server judged me.',
    'Sound cue: my own footsteps.',
    'Orb grab. Career highlight.',
    'Fake plant. Real anxiety.',
  ],
  persist: [
    'I am holding. Do not ask what.',
    'Angle is set. So is my jaw.',
    'Trap armed. Expectations lowered.',
    'Smoke up. Confidence down.',
    'Molly the choke. Molly my nerves.',
  ],
  plant: [
    'Planting with my whole chest.',
    'Spike down. Destiny queued.',
    'Default plant. Default scream.',
    'I am the planter. Fear me softly.',
  ],
  defuse: [
    'Defusing. Do not look at me.',
    'Ten seconds of pure character development.',
    'Knife out. Heart out.',
    'I believe in us. Barely.',
  ],
  heal: [
    'Patch me. Emotionally too.',
    'Kit used. Trauma remains.',
    'Light shield. Heavy feelings.',
    'Healing so I can die again properly.',
  ],
  ult: [
    'Ult ready. Room not ready.',
    'I have been saving this for drama.',
    'Ultimate. Also ultimely late.',
    'Watch this. Or do not. I will anyway.',
  ],
}

const BY_ID: Record<string, readonly string[]> = {
  ferrari_peek: [
    'Wide. Wrong. Wonderful.',
    'I paid for the whole angle. I am using the whole angle.',
    'This is my Roman Empire and also my mistake.',
  ],
  jump_spot: [
    'Hop. Hope. Cope.',
    'Airborne and unemployed of thoughts.',
  ],
  bait_swing: [
    'I am the bait. I am also the fish.',
    'Show a pixel. Take a personality test.',
  ],
  close_commit: [
    'Run it. Apologize never.',
    'Knife range. Therapy range.',
  ],
  spray_transfer: [
    'Spray and pray is a valid religion.',
    'Recoil control is a myth I tell myself.',
  ],
  lurk_swing: [
    'Late rotate. Early regret.',
    'They forgot mid. I remembered trauma.',
  ],
  camp_angle: [
    'I live here now.',
    'Holding W is for cowards. Holding angle is for poets.',
  ],
  grab_ult_orb: [
    'Mine. Spiritually.',
    'Orb. Orbs. Orbius Maximus.',
    'I came for the orb. I stayed for the damage.',
  ],
  plant_spike: [
    'Beep. Beep. Character arc.',
    'Spike says 45. I say cope.',
  ],
  defuse_spike: [
    'Shhhhh. I am cooking.',
    'If I die here, tell them I was brave and wrong.',
  ],
  clutch_swing: [
    'Low HP. High delusion.',
    'Clutch gene activated. Accuracy not included.',
  ],
  waste_clock: [
    'Time is a construct. So is this post-plant.',
    'Stalling like it is a committee meeting.',
  ],
  report_cheating: ["I'm reporting them. I already reported them."],
  vote_surrender: ['Vote failed. 4/6 voted to surrender.'],
  complain_jett: ["Their Jett is cracked. It's always a cracked Jett"],
  get_water: ["The game always loads quickly when you don't want it to"],
  cringe_teens_all_chat: [
    "Really wish I didn't read that. I'll mute their text",
  ],
  gun_buddy: [
    'Oh god. They have an immortal buddy. Jo, stop doing so well!',
  ],
  crouch_spam: ["Jo, don't look at what I'm doing right now."],
  ability_deny: [
    'No util for you. Also no fun.',
    'I cancelled their plans. And mine.',
  ],
  reload_settle: [
    'Reloading my magazine and my will to live.',
    'Topping up. Mentally buffering.',
  ],
  jett_dash_peek: [
    'Dash. Crash. Maybe cash.',
    'Tailwind said yes. Crosshair said maybe.',
  ],
  jett_updraft: [
    'I am the drone now.',
    'Updraft into god complex.',
  ],
  phoenix_curve: [
    'Curve flash. Straight chaos.',
    'I flashed myself for the bit.',
  ],
  phoenix_hot_hands: [
    'Standing in fire for enrichment.',
    'Heal me, flame. Heal me soft.',
  ],
  sage_heal: [
    'Sage main. Soft heart. Hard walls.',
    'I heal so the duelists can cook poorly.',
  ],
  sage_wall: [
    'Wall. Emotional support structure.',
    'Blocked the site. Blocked my feelings.',
  ],
  sova_shock: [
    'Lineup from a YouTube I half watched.',
    'Shock dart. Shocking aim.',
  ],
  sova_recon: [
    'Recon bolt. Recon my life choices.',
    'I see them. They see my soul.',
  ],
  cypher_cage: [
    'Cage. Not a personality. Wait.',
    'Cyber cage. Cyber cope.',
  ],
  cypher_trip: [
    'Tripwire. Trip over my own plan.',
    'I know where you live. On site. Briefly.',
  ],
  brim_stim: [
    'Stimmed. Still scared.',
    'Beacon says go. Brain says inventory.',
  ],
  brim_incendiary: [
    'Fire lane. Fire takes.',
    'Incendiary and incidental damage to dignity.',
  ],
  ult_jett: [
    'Knives. So many opinions.',
    'Blade storm. Brain storm. Both mid.',
  ],
  ult_phoenix: [
    'Run it back. Literally my brand.',
    'Second chance. Same aim.',
  ],
  ult_sage: [
    'Res. Res. Respectfully.',
    'I brought you back. Do not make me regret it.',
  ],
  ult_sova: [
    "Hunter's Fury. Hunter's anxiety.",
    'Three lasers. Zero chill.',
  ],
  ult_cypher: [
    'Neural theft. Emotional theft.',
    'I know your secrets. Mostly your footsteps.',
  ],
  ult_brim: [
    'Orbital. Personal.',
    'Sky laser says get off my site.',
  ],
  astra_gravity: [
    'Stars say come here. Rudely.',
    'Gravity well. Gravity of the situation.',
  ],
  astra_nova: [
    'Nova pulse. Nova patience.',
    'Stun from orbit. Attitude included.',
  ],
  ult_astra: [
    'Cosmic Divide. Social divide.',
    'I split the map. And the vibes.',
  ],
  breach_flash: [
    'Through wall. Through dignity.',
    'Flashpoint. Personality point.',
  ],
  breach_aftershock: [
    'Aftershock. Afterthought aim.',
    'Quake the corner. Quake my knees.',
  ],
  ult_breach: [
    'Rolling Thunder. Rolling anxiety.',
    'Earthquake diplomacy.',
  ],
  chamber_trademark: [
    'Trademark. Trademarked trauma.',
    'Fancy trap. Fancy funeral.',
  ],
  chamber_headhunter: [
    'Headhunter. Heart hunter optional.',
    'Premium peek. Economy tears.',
  ],
  ult_chamber: [
    'Tour De Force. Tour de force-feed.',
    'Operator with a French accent and no mercy.',
  ],
  clove_ruse: [
    'Ruse. Still dead inside. Smoke outside.',
    'Dead? Smokes still go up. Priorities.',
  ],
  clove_meddle: [
    'Meddle. Middle of their plans.',
    'Decay their HP and their schedule.',
  ],
  ult_clove: [
    'Not Dead Yet. Branding.',
    'I refuse the round end. Softly.',
  ],
  deadlock_gravnet: [
    'Net catch. Net worth of my aim: low.',
    'GravNet. Gravitas optional.',
  ],
  deadlock_sonic: [
    'Sonic sensor. Sonic screaming.',
    'I heard a footstep. It was mine.',
  ],
  ult_deadlock: [
    'Annihilation. Affectionate.',
    'Wall them into a TED Talk.',
  ],
  fade_seize: [
    'Seize. Also seize the means of aim.',
    'Nightmare hug. Consent unclear.',
  ],
  fade_haunt: [
    'Haunt. Haunted by my crosshair.',
    'I see fear. Fear sees me.',
  ],
  ult_fade: [
    'Nightfall. Night fails them.',
    'Deafening dread. Hearing their regret.',
  ],
  gekko_dizzy: [
    'Dizzy. Dizzying confidence.',
    'Creature flash. Creature feature.',
  ],
  gekko_wingman: [
    'Wingman plant. Emotional support blob.',
    'Little guy. Big destiny.',
  ],
  ult_gekko: [
    'Thrash. Thrashing the site.',
    'Detain the vibe. Release the chaos.',
  ],
  harbor_cove: [
    'Cove. Coastal cope.',
    'Bubble smoke. Bubble wrap my ego.',
  ],
  harbor_cascade: [
    'Cascade. Cascading failures.',
    'Water wall. Water works.',
  ],
  ult_harbor: [
    'Reckoning. Recking.',
    'Geysers say get off my lawn.',
  ],
  iso_undercut: [
    'Undercut. Underpaid aim.',
    'Vulnerable. So am I.',
  ],
  iso_contingency: [
    'Contingency. Continuously coping.',
    'Shield up. Feelings down.',
  ],
  ult_iso: [
    'Kill Contract. Kill the chat.',
    '1v1 arena. 0 chill.',
  ],
  kayo_flash: [
    'FLASH/drive. CRASH/drive.',
    'Pop flash. Pop off. Pop culture.',
  ],
  kayo_knife: [
    'ZERO/point. ZERO/aim optional.',
    'Suppress their util. Suppress my doubts.',
  ],
  ult_kayo: [
    'NULL/cmd. FULL/send.',
    'Overload. Overlord energy.',
  ],
  kj_alarmbot: [
    'Alarmbot. Alarming personality.',
    'Beep of destiny. Boop of doom.',
  ],
  kj_nanoswarm: [
    'Nanoswarm. Nano patience.',
    'Grenade on a string. Plan on a prayer.',
  ],
  ult_kj: [
    'Lockdown. Lock in.',
    'Site is mine. Emotionally leased.',
  ],
  miks_echo: [
    'Echo veil. Echo chamber.',
    'Remix the sightline. Remix my life.',
  ],
  miks_pulse: [
    'Pulse field. Pulse check.',
    'Bass drop. Class drop.',
  ],
  ult_miks: [
    'Drop the Mix. Drop the site.',
    'Full remix. Full send.',
  ],
  neon_relay: [
    'Relay bolt. Delay thoughts.',
    'Zip zap. Zip code of chaos.',
  ],
  neon_fastlane: [
    'Fast lane. Fast regret.',
    'Wallride into main character.',
  ],
  ult_neon: [
    'Overdrive. Overfeel.',
    'Full sprint. Full spray. Full scream.',
  ],
  omen_paranoia: [
    'Paranoia. Accurate diagnosis.',
    'Blind them. Blind myself to odds.',
  ],
  omen_shroud: [
    'Shrouded step. Shrouded plan.',
    'TP smoke. TP tears.',
  ],
  ult_omen: [
    'From the Shadows. From the group chat.',
    'Global TP. Local trauma.',
  ],
  raze_blast: [
    'Blast pack. Blast past therapy.',
    'Satchel into site. Satchel into destiny.',
  ],
  raze_paint: [
    'Paint shells. Paint the town red.',
    'Grenade party. Plus one: chaos.',
  ],
  ult_raze: [
    'Showstopper. Showstopper.',
    'Rocket. Room. Remains.',
  ],
  reyna_leer: [
    'Leer. Leer and clear.',
    'Eye contact. Eye for an eye.',
  ],
  reyna_devour: [
    'Devour. Devoured my dignity first.',
    'Soul snack. Side of hubris.',
  ],
  ult_reyna: [
    'Empress. Empress of midfrag.',
    'Full send. Full soul. Full delusion.',
  ],
  skye_flash: [
    'Guiding Light. Misguiding aim.',
    'Bird flash. Bird brain optional.',
  ],
  skye_trail: [
    'Trailblazer. Dog clears. I cheer.',
    'Good dog. Bad decisions.',
  ],
  ult_skye: [
    'Seekers. Seeking validation.',
    'Three birds. Zero chill.',
  ],
  tejo_salvo: [
    'Guided salvo. Unguided life.',
    'Missiles on schedule. Aim on vibes.',
  ],
  tejo_drone: [
    'Stealth drone. Loud personality.',
    'Info with Colombian heat.',
  ],
  ult_tejo: [
    'Armageddon. Softly.',
    'Barrage the site. Barrage my doubts.',
  ],
  veto_ward: [
    'Ward line. Wardrobe of util.',
    'Sentinel deny. Softly yes.',
  ],
  veto_intercept: [
    'Intercept. Intercept their dreams.',
    'Cancelled plans. Cancelled fun.',
  ],
  ult_veto: [
    'Veto Protocol. Absolute no.',
    'I deny the round. Respectfully.',
  ],
  viper_cloud: [
    'Poison cloud. Poison personality.',
    'Toxic smoke. Toxic positivity.',
  ],
  viper_snakebite: [
    'Snake Bite. Snake vibes.',
    'Acid puddle. Acid takes.',
  ],
  ult_viper: [
    "Viper's Pit. Viper's mood.",
    'Own the fog. Own the narrative.',
  ],
  vyse_shear: [
    'Shear wall. Sheer panic.',
    'Metal denial. Mental denial.',
  ],
  vyse_arc: [
    'Arc Rose. Arc of my career.',
    'Flashy thorns. Soft heart.',
  ],
  ult_vyse: [
    'Steel Garden. Steel nerves.',
    'Bloom of blades. Bloom of regret.',
  ],
  waylay_refract: [
    'Refract peek. Refract responsibility.',
    'Light-bend swing. Dark thoughts.',
  ],
  waylay_afterimage: [
    'Afterimage. Afterthought plan.',
    'Ghost step. Ghost aim.',
  ],
  ult_waylay: [
    'Prism Rush. Prism of hope.',
    'Shatter peek. Shatter ego.',
  ],
  yoru_fakeout: [
    'Fakeout. Fake confidence.',
    'Footsteps lie. So do I.',
  ],
  yoru_blind: [
    'Blindside. Blind optimism.',
    'Dim flash. Bright ideas. Maybe.',
  ],
  ult_yoru: [
    'Dimensional Drift. Dimensional skill issue.',
    'Untouchable. Unhinged.',
  ],
}

function hashSalt(cardId: string, salt: number): number {
  let h = salt * 2654435761
  for (let i = 0; i < cardId.length; i += 1) {
    h = (h ^ cardId.charCodeAt(i)) * 16777619
  }
  return Math.abs(h)
}

/** Stable flavor line for a dealt card instance. */
export function spikeCardFlavor(
  cardId: string,
  kind: string,
  salt: number,
): string {
  const pool =
    BY_ID[cardId]?.length
      ? BY_ID[cardId]!
      : (BY_KIND[kind] ?? GENERIC)
  const all = pool.length ? pool : GENERIC
  return all[hashSalt(cardId, salt) % all.length]!
}
