import test from 'node:test'
import assert from 'node:assert/strict'
import { PDFDocument } from 'pdf-lib'
import { buildPuzzle } from '../src/lib/crossword'
import { validatePuzzle } from '../src/lib/validate'
import featured from '../src/data/featured.json'

test('the ready-to-play crossword covers all four themes in a valid grid', () => {
  validatePuzzle(featured)
  const answers = new Set(featured.placements.map((entry) => entry.answer))
  for (const answer of ['PACMAN', 'TETRIS', 'STARLING', 'THERMAL', 'AI']) assert.ok(answers.has(answer))
  assert.equal(featured.placements.length, 14)
})
import { nextCell } from '../src/lib/navigation'
import { extractEntries } from '../src/lib/extract'
import { sampleEntries, sampleText } from '../src/data/sample'
import { createPuzzlePdf } from '../src/lib/exportPdf'
import { validateText } from '../src/lib/documents'
import { loadSession, saveSession } from '../src/lib/storage'

for (const size of [5, 10] as const) {
  test(`${size}×${size}: sample and extracted words form a valid, connected, fully clued grid`, () => {
    for (const entries of [sampleEntries, extractEntries(sampleText, size, 'Test source')]) {
      const puzzle = buildPuzzle(entries, size, 'Test crossword', 'Test source')
      validatePuzzle(puzzle)
      assert.equal(puzzle.cells.length, size)
      assert.ok(puzzle.placements.length >= (size === 5 ? 3 : 6))
      assert.ok(puzzle.placements.every((entry) => entry.sourceName && entry.clue))
      const again = buildPuzzle(entries, size, 'Test crossword', 'Test source')
      assert.deepEqual(puzzle.cells, again.cells)
      const positions = new Set<string>()
      let current = { row: puzzle.placements[0].row, col: puzzle.placements[0].col, direction: 'across' as const }
      const cells = puzzle.cells.flat().filter((cell) => cell.solution).length
      for (let i = 0; i < cells; i++) {
        positions.add(`${current.row}:${current.col}`)
        current = nextCell(puzzle, current.row, current.col, 'ArrowRight') as typeof current
      }
      assert.equal(positions.size, cells, 'every playable cell reachable with right arrow')
    }
  })
  test(`${size}×${size}: edited pools do not introduce hidden runs`, () => {
    for (let i = 0; i < 12; i++) {
      const pool = sampleEntries.map((entry, j) => ({ ...entry, selected: (j + i) % 4 !== 0 }))
      validatePuzzle(buildPuzzle(pool, size, 'Subset', 'Test source'))
    }
  })
}

test('clue extraction retains evidence and blanks whole words without damaging substrings', () => {
  const entries = extractEntries('An oak stands beside the soaked riverbank. Birds gather around the ancient oak tree and make nests in its branches.', 10, 'Trees', 'https://example.com/trees')
  const oak = entries.find((entry) => entry.answer === 'OAK')!
  assert.ok(oak.clue.includes('soaked'))
  assert.ok(oak.clue.includes('_____'))
  assert.equal(oak.sourceName, 'Trees')
  assert.equal(oak.sourceUrl, 'https://example.com/trees')
  assert.ok(oak.sourceText?.includes('oak'))
})

test('invalid clues, unsourced answers, damaged grids and bad numbering are rejected', () => {
  assert.throws(() => buildPuzzle(sampleEntries.map((entry) => ({ ...entry, clue: '' })), 10, 'Test', 'Test'), /clue/)
  assert.throws(() => buildPuzzle(sampleEntries.map((entry) => ({ ...entry, sourceName: '' })), 10, 'Test', 'Test'), /source/)
  const good = buildPuzzle(sampleEntries, 10, 'Test', 'Test')
  assert.throws(() => validatePuzzle({ ...good, omittedAnswers: 'not-an-array' }), /format/)
  assert.throws(() => validatePuzzle({ ...good, placements: [null] }), /format/)
  const wrong = structuredClone(good)
  wrong.placements[0].number = 90
  assert.throws(() => validatePuzzle(wrong), /number/)
  const damaged = structuredClone(good)
  const black = damaged.cells.flat().find((cell) => !cell.solution)!
  black.solution = 'A'
  assert.throws(() => validatePuzzle(damaged), /grid/)
  const overlap = structuredClone(good)
  overlap.placements.push({ ...overlap.placements[0], id: 'duplicate-direction' })
  assert.throws(() => validatePuzzle(overlap), /overlap/)
})

test('source size checks and storage recovery fail safely', () => {
  assert.throws(() => validateText('too short'))
  assert.throws(() => validateText('a'.repeat(180001)))
  const values = new Map<string, string>()
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: { getItem: (key: string) => values.get(key), setItem: (key: string, value: string) => values.set(key, value) } })
  const puzzle = buildPuzzle(sampleEntries, 5, 'Saved', 'Test')
  const first = puzzle.placements[0]
  const key = `${first.row}-${first.col}`
  assert.equal(saveSession({ puzzle, answers: { [key]: 'Z', '99-99': 'A' }, seconds: 9, hintsUsed: 1 }), true)
  const restored = loadSession()!
  assert.equal(restored.puzzle.id, puzzle.id)
  assert.deepEqual(restored.answers, { [key]: 'Z' })
  assert.equal(restored.hintsUsed, 1)
  values.set('crossword-studio-session-v2', '{not json')
  assert.equal(loadSession(), null)
})

test('PDFs include a separate answer page only when requested, with long clues safely paginated', async () => {
  const puzzle = buildPuzzle(sampleEntries, 10, 'A long crossword title with punctuation — and a star ★', 'Test source')
  puzzle.placements.forEach((entry) => { entry.clue = 'A fairly long clue with enough words to test wrapping and pagination. '.repeat(4) })
  const plain = await PDFDocument.load(await createPuzzlePdf(puzzle))
  const answers = await PDFDocument.load(await createPuzzlePdf(puzzle, true))
  assert.equal(answers.getPageCount(), plain.getPageCount() + 1)
  assert.ok(plain.getPageCount() >= 2)
  assert.ok(plain.getPages().every((p) => p.getWidth() > 590 && p.getHeight() > 840))
})
