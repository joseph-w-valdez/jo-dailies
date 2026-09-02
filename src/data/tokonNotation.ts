/** Input tokens for Tokon combo builder (maps to `public/tokon/buttons/`). */

export type NotationKind =
  | 'prompt'
  | 'direction'
  | 'motion'
  | 'flow'
  | 'modifier'

export type NotationDef = {
  kind: NotationKind
  label: string
  /** Public URL path for image tokens. */
  src?: string
}

export const TOKON_PROMPTS = [
  'l',
  'm',
  'h',
  'a',
  't',
  'u',
  'qs',
  'qa',
  'qd',
] as const

export type TokonPromptId = (typeof TOKON_PROMPTS)[number]

export const TOKON_DIRECTIONS = [
  '1',
  '2',
  '3',
  '4',
  '5',
  '6',
  '7',
  '8',
  '9',
] as const

export type TokonDirectionId = (typeof TOKON_DIRECTIONS)[number]

export const TOKON_MOTIONS = [
  '214',
  '236',
  '421',
  '623',
  '360',
  '63214',
  '21478',
  '23698',
  '41236',
  '47896',
  '69874',
  '87412',
  '89632',
] as const

export type TokonMotionId = (typeof TOKON_MOTIONS)[number]

/** Combo flow — timing / state transitions between moves. */
export const TOKON_FLOW_TOKENS = [
  '+',
  '~',
  'land',
  'jump',
  'dash',
  'superjump',
  'super1',
  'super2',
  'tokonassemble',
] as const

export type TokonFlowTokenId = (typeof TOKON_FLOW_TOKENS)[number]

/** Still renderable in older saved combos; not shown in the palette. */
const LEGACY_FLOW_TOKENS = ['>', ','] as const

/** Range / air / hold prefixes (j.5H, c.M, [4], …). */
export const TOKON_STATE_TOKENS = [
  'j',
  'sj',
  'hj',
  'c',
  'f',
  'dl',
  '[',
  ']',
] as const

export type TokonStateTokenId = (typeof TOKON_STATE_TOKENS)[number]

/** Cancels, installs, and movement shorthand. */
export const TOKON_CANCEL_TOKENS = [
  'jc',
  'hjc',
  'sjc',
  'dc',
  'adc',
  'dj',
  'iad',
  'ias',
  'tk',
  'ji',
  'ch',
  '66',
  'whiff',
] as const

export type TokonCancelTokenId = (typeof TOKON_CANCEL_TOKENS)[number]

export const TOKON_MODIFIER_TOKENS = [
  ...TOKON_FLOW_TOKENS,
  ...LEGACY_FLOW_TOKENS,
  ...TOKON_STATE_TOKENS,
  ...TOKON_CANCEL_TOKENS,
] as const

export type TokonModifierTokenId = (typeof TOKON_MODIFIER_TOKENS)[number]

export type TokonNotationTokenId =
  | TokonPromptId
  | TokonDirectionId
  | TokonMotionId
  | TokonModifierTokenId

const PROMPT_LABELS: Record<TokonPromptId, string> = {
  l: 'L',
  m: 'M',
  h: 'H',
  a: 'A',
  t: 'T',
  u: 'U',
  qs: 'QS',
  qa: 'QA',
  qd: 'QD',
}

const STATE_LABELS: Record<TokonStateTokenId, string> = {
  j: 'j.',
  sj: 'sj.',
  hj: 'hj.',
  c: 'c.',
  f: 'f.',
  dl: 'dl.',
  '[': '[',
  ']': ']',
}

const CANCEL_LABELS: Record<TokonCancelTokenId, string> = {
  jc: 'jc',
  hjc: 'hjc',
  sjc: 'sjc',
  dc: 'dc',
  adc: 'adc',
  dj: 'dj',
  iad: 'IAD',
  ias: 'IAS',
  tk: 'tk.',
  ji: 'JI',
  ch: 'CH',
  '66': '66',
  whiff: 'whiff',
}

function promptDef(id: TokonPromptId): NotationDef {
  return {
    kind: 'prompt',
    label: PROMPT_LABELS[id],
    src: `/tokon/buttons/prompts/${id}.png`,
  }
}

function directionDef(id: TokonDirectionId): NotationDef {
  return {
    kind: 'direction',
    label: id,
    src: `/tokon/buttons/directions/${id}.png`,
  }
}

function motionDef(id: TokonMotionId): NotationDef {
  return {
    kind: 'motion',
    label: id,
    src: `/tokon/buttons/motions/${id}.png`,
  }
}

function flowDef(
  id: TokonFlowTokenId | (typeof LEGACY_FLOW_TOKENS)[number],
): NotationDef {
  const labels: Partial<Record<string, string>> = {
    super1: 'super 1',
    super2: 'super 2',
    tokonassemble: 'tokon assemble',
  }
  return { kind: 'flow', label: labels[id] ?? id }
}

function stateDef(id: TokonStateTokenId): NotationDef {
  return { kind: 'modifier', label: STATE_LABELS[id] }
}

function cancelDef(id: TokonCancelTokenId): NotationDef {
  return { kind: 'modifier', label: CANCEL_LABELS[id] }
}

export const TOKON_NOTATION: Record<TokonNotationTokenId, NotationDef> = {
  l: promptDef('l'),
  m: promptDef('m'),
  h: promptDef('h'),
  a: promptDef('a'),
  t: promptDef('t'),
  u: promptDef('u'),
  qs: promptDef('qs'),
  qa: promptDef('qa'),
  qd: promptDef('qd'),
  '1': directionDef('1'),
  '2': directionDef('2'),
  '3': directionDef('3'),
  '4': directionDef('4'),
  '5': directionDef('5'),
  '6': directionDef('6'),
  '7': directionDef('7'),
  '8': directionDef('8'),
  '9': directionDef('9'),
  '214': motionDef('214'),
  '236': motionDef('236'),
  '421': motionDef('421'),
  '623': motionDef('623'),
  '360': motionDef('360'),
  '63214': motionDef('63214'),
  '21478': motionDef('21478'),
  '23698': motionDef('23698'),
  '41236': motionDef('41236'),
  '47896': motionDef('47896'),
  '69874': motionDef('69874'),
  '87412': motionDef('87412'),
  '89632': motionDef('89632'),
  '>': flowDef('>'),
  ',': flowDef(','),
  '+': flowDef('+'),
  '~': flowDef('~'),
  land: flowDef('land'),
  jump: flowDef('jump'),
  dash: flowDef('dash'),
  superjump: flowDef('superjump'),
  super1: flowDef('super1'),
  super2: flowDef('super2'),
  tokonassemble: flowDef('tokonassemble'),
  j: stateDef('j'),
  sj: stateDef('sj'),
  hj: stateDef('hj'),
  c: stateDef('c'),
  f: stateDef('f'),
  dl: stateDef('dl'),
  '[': stateDef('['),
  ']': stateDef(']'),
  jc: cancelDef('jc'),
  hjc: cancelDef('hjc'),
  sjc: cancelDef('sjc'),
  dc: cancelDef('dc'),
  adc: cancelDef('adc'),
  dj: cancelDef('dj'),
  iad: cancelDef('iad'),
  ias: cancelDef('ias'),
  tk: cancelDef('tk'),
  ji: cancelDef('ji'),
  ch: cancelDef('ch'),
  '66': cancelDef('66'),
  whiff: cancelDef('whiff'),
}

export function isNotationToken(id: string): id is TokonNotationTokenId {
  return id in TOKON_NOTATION
}

const PARSE_PROMPTS = [...TOKON_PROMPTS].sort((a, b) => b.length - a.length)
const PARSE_MOTIONS = [...TOKON_MOTIONS].sort((a, b) => b.length - a.length)

/** Longest-match strings when importing freeform combo text. */
const PARSE_LITERALS = [
  ...TOKON_CANCEL_TOKENS.filter((t) => t !== '66'),
  ...TOKON_STATE_TOKENS,
  'land',
  'jump',
  'dash',
  'superjump',
  'super1',
  'super2',
  'tokonassemble',
  'tokon assemble',
  'super 1',
  'super 2',
  'whiff',
  'j.',
  'sj.',
  'hj.',
  'c.',
  'f.',
  'dl.',
  'tk.',
  ...PARSE_MOTIONS,
  ...PARSE_PROMPTS,
  '66',
  'IAD',
  'IAS',
  'CH',
  'JI',
  '>',
  ',',
  '+',
  '~',
  '[',
  ']',
].sort((a, b) => b.length - a.length)

/** Best-effort parse of legacy freeform combo text into tokens. */
export function parseLegacyComboText(text: string): {
  sequence: string[]
  notes: string
} {
  const trimmed = text.trim()
  if (!trimmed) return { sequence: [], notes: '' }

  const sequence = tokenizeComboString(trimmed)
  if (sequence.length === 0) return { sequence: [], notes: trimmed }
  return { sequence, notes: '' }
}

export function tokenizeComboString(text: string): string[] {
  const tokens: string[] = []
  let rest = text.trim()

  while (rest.length > 0) {
    rest = rest.replace(/^\s+/, '')
    if (!rest) break

    let matched = false

    for (const literal of PARSE_LITERALS) {
      const probe = literal.toLowerCase()
      if (rest.toLowerCase().startsWith(probe)) {
        tokens.push(normalizeParsedLiteral(literal))
        rest = rest.slice(literal.length)
        matched = true
        break
      }
    }
    if (matched) continue

    const dirRun = rest.match(/^[1-9]+/)
    if (dirRun && !/^[1-9]+[a-z]/i.test(rest)) {
      for (const ch of dirRun[0]) tokens.push(ch)
      rest = rest.slice(dirRun[0].length)
      continue
    }

    // Compact numpad + button: 5L, j5H after j. stripped, 236H
    const compact = rest.match(/^([1-9]*)([lmhatuqs]+)/i)
    if (compact && (compact[1] || compact[2])) {
      for (const ch of compact[1] ?? '') tokens.push(ch)
      const letters = compact[2]!.toLowerCase()
      let pos = 0
      while (pos < letters.length) {
        let found = false
        for (const prompt of PARSE_PROMPTS) {
          if (letters.startsWith(prompt, pos)) {
            tokens.push(prompt)
            pos += prompt.length
            found = true
            break
          }
        }
        if (!found) {
          pos += 1
        }
      }
      rest = rest.slice(compact[0].length)
      continue
    }

    rest = rest.slice(1)
  }

  return tokens
}

function normalizeParsedLiteral(literal: string): string {
  const lower = literal.toLowerCase()
  if (lower === 'iad') return 'iad'
  if (lower === 'ias') return 'ias'
  if (lower === 'ch') return 'ch'
  if (lower === 'ji') return 'ji'
  if (lower === 'j.') return 'j'
  if (lower === 'sj.') return 'sj'
  if (lower === 'hj.') return 'hj'
  if (lower === 'c.') return 'c'
  if (lower === 'f.') return 'f'
  if (lower === 'dl.') return 'dl'
  if (lower === 'tk.') return 'tk'
  if (lower === 'super 1') return 'super1'
  if (lower === 'super 2') return 'super2'
  if (lower === 'tokon assemble') return 'tokonassemble'
  if (isNotationToken(lower)) return lower
  if (isNotationToken(literal)) return literal
  return lower
}

export function sequenceToPlainText(sequence: string[]): string {
  return sequence
    .map((id) => {
      if (!isNotationToken(id)) return id
      return TOKON_NOTATION[id].label
    })
    .join('')
}
