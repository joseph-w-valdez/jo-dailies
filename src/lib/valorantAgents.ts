/** Valorant agents for Guess Who — icons from media.valorant-api.com. */
export type ValorantRole =
  | 'Duelist'
  | 'Initiator'
  | 'Controller'
  | 'Sentinel'
  | 'Unknown'

/** Lore species / nature for Guess Who questions. */
export type ValorantKind = 'Human' | 'Radiant' | 'Robot' | 'Unknown'

/** Official role icons + Guess Who card theme colors. */
export const VALORANT_ROLE_META: Record<
  Exclude<ValorantRole, 'Unknown'>,
  {
    icon: string
    /** Info-strip / active chip fill. */
    bar: string
    /** Inactive filter chip — same hue, much darker. */
    barDark: string
    border: string
    chip: string
    accent: string
  }
> = {
  Duelist: {
    icon: 'https://media.valorant-api.com/agents/roles/dbe8757e-9e92-4ed4-b39f-9dfc589691d4/displayicon.png',
    bar: '#7a1f2a',
    barDark: '#5c1020',
    border: '#e85a6a',
    chip: 'border-rose-400/50 bg-rose-500/15 text-rose-50',
    accent: '#ff6b7a',
  },
  Initiator: {
    icon: 'https://media.valorant-api.com/agents/roles/1b47567f-8f7b-444b-aae3-b0c634622d10/displayicon.png',
    bar: '#6b4e12',
    barDark: '#5a3f0a',
    border: '#e0b84a',
    chip: 'border-amber-400/50 bg-amber-500/15 text-amber-50',
    accent: '#f0c75e',
  },
  Controller: {
    icon: 'https://media.valorant-api.com/agents/roles/4ee40330-ecdd-4f2f-98a8-eb1243428373/displayicon.png',
    bar: '#3d2a6b',
    barDark: '#3a1f6e',
    border: '#a78bfa',
    chip: 'border-violet-400/50 bg-violet-500/15 text-violet-50',
    accent: '#b794f6',
  },
  Sentinel: {
    icon: 'https://media.valorant-api.com/agents/roles/5fc02f99-4091-4486-a531-98459a3e95e9/displayicon.png',
    bar: '#1a3d6d',
    barDark: '#0f3d72',
    border: '#5ba3e0',
    chip: 'border-sky-400/50 bg-sky-500/15 text-sky-50',
    accent: '#6eb6ef',
  },
}

export function roleMeta(role: ValorantRole) {
  if (role === 'Unknown') {
    return {
      icon: VALORANT_ROLE_META.Sentinel.icon,
      bar: '#1a3d6d',
      barDark: '#0f3d72',
      border: '#94a3b8',
      chip: 'border-white/20 bg-white/10 text-white',
      accent: '#94a3b8',
    }
  }
  return VALORANT_ROLE_META[role]
}

export interface ValorantAgent {
  id: string
  name: string
  role: ValorantRole
  icon: string
  /** Country / region of origin. */
  origin: string
  /** Human, Radiant, Robot, etc. */
  kind: ValorantKind
  /** Primary panel fill from official agent gradient. */
  bg: string
  /** Secondary gradient stop. */
  bg2: string
}

export const VALORANT_AGENTS: readonly ValorantAgent[] = [
  {
    id: '41fb69c1-4189-7b37-f117-bcaf1e96f1bf',
    name: "Astra",
    role: 'Controller',
    origin: 'Ghana',
    kind: 'Radiant',
    icon: 'https://media.valorant-api.com/agents/41fb69c1-4189-7b37-f117-bcaf1e96f1bf/displayicon.png',
    bg: '#26146c',
    bg2: '#0f1923',
  },
  {
    id: '5f8d3a7f-467b-97f3-062c-13acf203c006',
    name: "Breach",
    role: 'Initiator',
    origin: 'Sweden',
    kind: 'Human',
    icon: 'https://media.valorant-api.com/agents/5f8d3a7f-467b-97f3-062c-13acf203c006/displayicon.png',
    bg: '#81331a',
    bg2: '#0f1923',
  },
  {
    id: '9f0d8ba9-4140-b941-57d3-a7ad57c6b417',
    name: "Brimstone",
    role: 'Controller',
    origin: 'USA',
    kind: 'Human',
    icon: 'https://media.valorant-api.com/agents/9f0d8ba9-4140-b941-57d3-a7ad57c6b417/displayicon.png',
    bg: '#363c4f',
    bg2: '#0f1923',
  },
  {
    id: '22697a3d-45bf-8dd7-4fec-84a9e28c69d7',
    name: "Chamber",
    role: 'Sentinel',
    origin: 'France',
    kind: 'Human',
    icon: 'https://media.valorant-api.com/agents/22697a3d-45bf-8dd7-4fec-84a9e28c69d7/displayicon.png',
    bg: '#20435b',
    bg2: '#0f1923',
  },
  {
    id: '1dbf2edd-4729-0984-3115-daa5eed44993',
    name: "Clove",
    role: 'Controller',
    origin: 'Scotland',
    kind: 'Radiant',
    icon: 'https://media.valorant-api.com/agents/1dbf2edd-4729-0984-3115-daa5eed44993/displayicon.png',
    bg: '#4b1d80',
    bg2: '#0f1923',
  },
  {
    id: '117ed9e3-49f3-6512-3ccf-0cada7e3823b',
    name: "Cypher",
    role: 'Sentinel',
    origin: 'Morocco',
    kind: 'Human',
    icon: 'https://media.valorant-api.com/agents/117ed9e3-49f3-6512-3ccf-0cada7e3823b/displayicon.png',
    bg: '#2f5078',
    bg2: '#0f1923',
  },
  {
    id: 'cc8b64c8-4b25-4ff9-6e7f-37b4da43d235',
    name: "Deadlock",
    role: 'Sentinel',
    origin: 'Norway',
    kind: 'Human',
    icon: 'https://media.valorant-api.com/agents/cc8b64c8-4b25-4ff9-6e7f-37b4da43d235/displayicon.png',
    bg: '#425495',
    bg2: '#0f1923',
  },
  {
    id: 'dade69b4-4f5a-8528-247b-219e5a1facd6',
    name: "Fade",
    role: 'Initiator',
    origin: 'Turkey',
    kind: 'Radiant',
    icon: 'https://media.valorant-api.com/agents/dade69b4-4f5a-8528-247b-219e5a1facd6/displayicon.png',
    bg: '#1d2846',
    bg2: '#0f1923',
  },
  {
    id: 'e370fa57-4757-3604-3648-499e1f642d3f',
    name: "Gekko",
    role: 'Initiator',
    origin: 'USA',
    kind: 'Human',
    icon: 'https://media.valorant-api.com/agents/e370fa57-4757-3604-3648-499e1f642d3f/displayicon.png',
    bg: '#371c5c',
    bg2: '#0f1923',
  },
  {
    id: '95b78ed7-4637-86d9-7e41-71ba8c293152',
    name: "Harbor",
    role: 'Controller',
    origin: 'India',
    kind: 'Radiant',
    icon: 'https://media.valorant-api.com/agents/95b78ed7-4637-86d9-7e41-71ba8c293152/displayicon.png',
    bg: '#275146',
    bg2: '#0f1923',
  },
  {
    id: '0e38b510-41a8-5780-5e8f-568b2a4f2d6c',
    name: "Iso",
    role: 'Duelist',
    origin: 'China',
    kind: 'Radiant',
    icon: 'https://media.valorant-api.com/agents/0e38b510-41a8-5780-5e8f-568b2a4f2d6c/displayicon.png',
    bg: '#30336e',
    bg2: '#0f1923',
  },
  {
    id: 'add6443a-41bd-e414-f6ad-e58d267f4e95',
    name: "Jett",
    role: 'Duelist',
    origin: 'South Korea',
    kind: 'Radiant',
    icon: 'https://media.valorant-api.com/agents/add6443a-41bd-e414-f6ad-e58d267f4e95/displayicon.png',
    bg: '#25607a',
    bg2: '#0f1923',
  },
  {
    id: '601dbbe7-43ce-be57-2a40-4abd24953621',
    name: "KAY/O",
    role: 'Initiator',
    origin: 'Unknown',
    kind: 'Robot',
    icon: 'https://media.valorant-api.com/agents/601dbbe7-43ce-be57-2a40-4abd24953621/displayicon.png',
    bg: '#1c2a69',
    bg2: '#0f1923',
  },
  {
    id: '1e58de9c-4950-5125-93e9-a0aee9f98746',
    name: "Killjoy",
    role: 'Sentinel',
    origin: 'Germany',
    kind: 'Human',
    icon: 'https://media.valorant-api.com/agents/1e58de9c-4950-5125-93e9-a0aee9f98746/displayicon.png',
    bg: '#522162',
    bg2: '#0f1923',
  },
  {
    id: '7c8a4701-4de6-9355-b254-e09bc2a34b72',
    name: "Miks",
    role: 'Controller',
    origin: 'Croatia',
    kind: 'Radiant',
    icon: 'https://media.valorant-api.com/agents/7c8a4701-4de6-9355-b254-e09bc2a34b72/displayicon.png',
    bg: '#462b75',
    bg2: '#0f1923',
  },
  {
    id: 'bb2a4828-46eb-8cd1-e765-15848195d751',
    name: "Neon",
    role: 'Duelist',
    origin: 'Philippines',
    kind: 'Radiant',
    icon: 'https://media.valorant-api.com/agents/bb2a4828-46eb-8cd1-e765-15848195d751/displayicon.png',
    bg: '#413476',
    bg2: '#0f1923',
  },
  {
    id: '8e253930-4c05-31dd-1b6c-968525494517',
    name: "Omen",
    role: 'Controller',
    origin: 'Unknown',
    kind: 'Radiant',
    icon: 'https://media.valorant-api.com/agents/8e253930-4c05-31dd-1b6c-968525494517/displayicon.png',
    bg: '#433178',
    bg2: '#0f1923',
  },
  {
    id: 'eb93336a-449b-9c1b-0a54-a891f7921d69',
    name: "Phoenix",
    role: 'Duelist',
    origin: 'UK',
    kind: 'Radiant',
    icon: 'https://media.valorant-api.com/agents/eb93336a-449b-9c1b-0a54-a891f7921d69/displayicon.png',
    bg: '#74321c',
    bg2: '#0f1923',
  },
  {
    id: 'f94c3b30-42be-e959-889c-5aa313dba261',
    name: "Raze",
    role: 'Duelist',
    origin: 'Brazil',
    kind: 'Human',
    icon: 'https://media.valorant-api.com/agents/f94c3b30-42be-e959-889c-5aa313dba261/displayicon.png',
    bg: '#742e1e',
    bg2: '#0f1923',
  },
  {
    id: 'a3bfb853-43b2-7238-a4f1-ad90e9e46bcc',
    name: "Reyna",
    role: 'Duelist',
    origin: 'Mexico',
    kind: 'Radiant',
    icon: 'https://media.valorant-api.com/agents/a3bfb853-43b2-7238-a4f1-ad90e9e46bcc/displayicon.png',
    bg: '#662d62',
    bg2: '#0f1923',
  },
  {
    id: '569fdd95-4d10-43ab-ca70-79becc718b46',
    name: "Sage",
    role: 'Sentinel',
    origin: 'China',
    kind: 'Radiant',
    icon: 'https://media.valorant-api.com/agents/569fdd95-4d10-43ab-ca70-79becc718b46/displayicon.png',
    bg: '#1f5148',
    bg2: '#0f1923',
  },
  {
    id: '6f2a04ca-43e0-be17-7f36-b3908627744d',
    name: "Skye",
    role: 'Initiator',
    origin: 'Australia',
    kind: 'Radiant',
    icon: 'https://media.valorant-api.com/agents/6f2a04ca-43e0-be17-7f36-b3908627744d/displayicon.png',
    bg: '#436a51',
    bg2: '#0f1923',
  },
  {
    id: '320b2a48-4d9b-a075-30f1-1f93a9b638fa',
    name: "Sova",
    role: 'Initiator',
    origin: 'Russia',
    kind: 'Human',
    icon: 'https://media.valorant-api.com/agents/320b2a48-4d9b-a075-30f1-1f93a9b638fa/displayicon.png',
    bg: '#355285',
    bg2: '#0f1923',
  },
  {
    id: 'b444168c-4e35-8076-db47-ef9bf368f384',
    name: "Tejo",
    role: 'Initiator',
    origin: 'Colombia',
    kind: 'Human',
    icon: 'https://media.valorant-api.com/agents/b444168c-4e35-8076-db47-ef9bf368f384/displayicon.png',
    bg: '#80451b',
    bg2: '#0f1923',
  },
  {
    id: '92eeef5d-43b5-1d4a-8d03-b3927a09034b',
    name: "Veto",
    role: 'Sentinel',
    origin: 'Senegal',
    kind: 'Radiant',
    icon: 'https://media.valorant-api.com/agents/92eeef5d-43b5-1d4a-8d03-b3927a09034b/displayicon.png',
    bg: '#1a5d65',
    bg2: '#0f1923',
  },
  {
    id: '707eab51-4836-f488-046a-cda6bf494859',
    name: "Viper",
    role: 'Controller',
    origin: 'USA',
    kind: 'Human',
    icon: 'https://media.valorant-api.com/agents/707eab51-4836-f488-046a-cda6bf494859/displayicon.png',
    bg: '#1a5f46',
    bg2: '#0f1923',
  },
  {
    id: 'efba5359-4016-a1e5-7626-b1ae76895940',
    name: "Vyse",
    role: 'Sentinel',
    origin: 'Unknown',
    kind: 'Radiant',
    icon: 'https://media.valorant-api.com/agents/efba5359-4016-a1e5-7626-b1ae76895940/displayicon.png',
    bg: '#492280',
    bg2: '#0f1923',
  },
  {
    id: 'df1cb487-4902-002e-5c17-d28e83e78588',
    name: "Waylay",
    role: 'Duelist',
    origin: 'Thailand',
    kind: 'Radiant',
    icon: 'https://media.valorant-api.com/agents/df1cb487-4902-002e-5c17-d28e83e78588/displayicon.png',
    bg: '#482e61',
    bg2: '#0f1923',
  },
  {
    id: '7f94d92c-4234-0a36-9646-3a87eb8b5c89',
    name: "Yoru",
    role: 'Duelist',
    origin: 'Japan',
    kind: 'Radiant',
    icon: 'https://media.valorant-api.com/agents/7f94d92c-4234-0a36-9646-3a87eb8b5c89/displayicon.png',
    bg: '#222b67',
    bg2: '#0f1923',
  },
] as const

export const VALORANT_AGENT_BY_ID: ReadonlyMap<string, ValorantAgent> = new Map(
  VALORANT_AGENTS.map((a) => [a.id, a]),
)

export function agentById(id: string | null | undefined): ValorantAgent | null {
  if (!id) return null
  return VALORANT_AGENT_BY_ID.get(id) ?? null
}
