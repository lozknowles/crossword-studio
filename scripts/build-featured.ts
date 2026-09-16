import { writeFileSync } from 'node:fs'
import { buildPuzzle } from '../src/lib/crossword'

// Original, hand-written clues. The checked-in result is the published puzzle;
// visitors all get the same numbered grid, independent of future engine changes.
const clues = [
  ['PACMAN', 'Dot-munching arcade hero pursued by four ghosts'],
  ['TETRIS', 'Falling-block game where complete lines disappear'],
  ['ARCADE', 'Home of coin-operated cabinets and high scores'],
  ['PIXEL', 'One tiny square in a digital picture'],
  ['SPRITE', 'A moving game character drawn on the screen'],
  ['CODE', 'What a programmer writes, and a compiler reads'],
  ['BYTE', 'Eight bits of computer data'],
  ['CHIP', 'Silicon component at the heart of a computer'],
  ['AI', 'Artificial intelligence, for short'],
  ['ROM', 'Read-only memory, in three letters'],
  ['AGENT', 'Software assistant that can take actions towards a goal'],
  ['FLOCK', 'A group of birds moving together'],
  ['STARLING', 'Iridescent bird famous for joining a murmuration'],
  ['WING', 'Feathered surface that helps a bird fly'],
  ['LIFT', 'Upward aerodynamic force that keeps a bird airborne'],
  ['SOAR', 'Fly high on rising air without constant flapping'],
  ['THERMAL', 'A rising column of warm air used by soaring birds'],
  ['SWIFT', 'A fast aerial bird, or a programming language'],
  ['ROBIN', 'Garden bird with a red breast'],
  ['NEST', 'A bird builds this to hold its eggs'],
  ['HERON', 'Long-legged bird often seen fishing in shallow water'],
  ['OWL', 'A bird associated with hooting and night-time hunting'],
  ['WREN', 'Small brown bird with a cocked tail and a mighty song'],
  ['OAK', 'Tree whose seeds are acorns'],
  ['FERN', 'A plant with fronds that reproduces using spores'],
  ['SEED', 'A small beginning that can grow into a plant'],
  ['MOTH', 'Winged insect often drawn to a light at night'],
] as const
const entries = clues.map(([answer, clue], index) => ({ id: `loz-${index}`, answer, clue, selected: true, sourceName: "Loz’s world — original general-knowledge clues" }))
let best = buildPuzzle(entries, 10, 'Loz’s world', 'Original clues for lozknowles.com')
let bestScore = -1
for (let i = 0; i < entries.length; i++) {
  const pool = [...entries.slice(i), ...entries.slice(0, i)]
  const puzzle = buildPuzzle(pool, 10, 'Loz’s world', 'Original clues for lozknowles.com')
  const words = new Set(puzzle.placements.map((p) => p.answer))
  const score = puzzle.placements.length + (words.has('PACMAN') ? 10 : 0) + (words.has('TETRIS') ? 8 : 0) + (words.has('STARLING') ? 10 : 0) + (words.has('LIFT') || words.has('SOAR') || words.has('WING') ? 5 : 0) + (words.has('CODE') || words.has('BYTE') || words.has('AI') ? 5 : 0)
  if (score > bestScore) { best = puzzle; bestScore = score }
}
best.id = 'lozs-world-2026-09-v1'
best.createdAt = '2026-09-16T00:00:00.000Z'
best.subtitle = 'Arcade games, curious minds and things with wings.'
best.omittedAnswers = []
writeFileSync('src/data/featured.json', JSON.stringify(best, null, 2) + '\n')
console.log(best.placements.map((p) => `${p.number} ${p.direction}: ${p.answer}`).join('\n'))
