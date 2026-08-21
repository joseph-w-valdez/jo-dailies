import fs from 'fs'
const cat = fs.readFileSync('src/components/CatSpike.tsx', 'utf8')
const checks = [
  'canPlaySpikeCard,',
  'SPIKE_DRAW_PER_TURN,',
  'type SpikeMatch,',
  '<NewGameConfirm',
  'Spike plant / defuse',
  'Plant only deals',
  "kind: 'plant'",
  'function FighterPanel',
  'UltOrbs',
  'pendingCardId, setPendingCardId',
  'onDiceSettled',
  'setPendingCardId(cardId)',
  'hand ·',
  'allowSolo',
  'resetGame',
  'commitGame',
  'playSpikeCard',
  'canPlay',
  'actorUid',
]
for (const c of checks) {
  console.log(cat.includes(c) ? 'OK' : 'MISS', c)
}
const ng = cat.indexOf('<NewGameConfirm')
console.log(JSON.stringify(cat.slice(ng, ng + 350)))
const d = cat.indexOf('onDiceSettled')
console.log('---dice---')
console.log(cat.slice(d, d + 450))
const p = cat.indexOf('setPendingCardId(cardId)')
console.log('---queue---')
console.log(cat.slice(p - 200, p + 200))
