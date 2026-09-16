import { buildCrosswordPuzzle } from '../collingham/footnotesCrossword'
import type { Puzzle } from '../types'

/** Validate records and the entire rendered grid, including undeclared runs. */
export function validatePuzzle(value: unknown): asserts value is Puzzle {
  if (!value || typeof value !== 'object') throw new Error('This is not a crossword file.')
  const puzzle = value as Puzzle
  const size = puzzle.size
  if (![5, 10].includes(size) || typeof puzzle.id !== 'string' || puzzle.id.length > 100
    || typeof puzzle.title !== 'string' || puzzle.title.length > 120
    || typeof puzzle.sourceName !== 'string' || puzzle.sourceName.length > 250
    || typeof puzzle.subtitle !== 'string' || puzzle.subtitle.length > 500
    || typeof puzzle.createdAt !== 'string' || !Number.isFinite(Date.parse(puzzle.createdAt))
    || !Array.isArray(puzzle.omittedAnswers) || puzzle.omittedAnswers.length > 80
    || puzzle.omittedAnswers.some((answer) => typeof answer !== 'string' || !/^[A-Z]{2,10}$/.test(answer))
    || !Array.isArray(puzzle.placements) || puzzle.placements.length < 2 || puzzle.placements.length > 80
    || !Array.isArray(puzzle.cells) || puzzle.cells.length !== size
    || puzzle.cells.some((row) => !Array.isArray(row) || row.length !== size)) {
    throw new Error('The crossword file has an unsupported format or size.')
  }
  const ids = new Set<string>()
  const occupied = new Set<string>()
  for (const entry of puzzle.placements) {
    if (!entry || typeof entry !== 'object' || typeof entry.id !== 'string' || !entry.id || entry.id.length > 100 || ids.has(entry.id)
      || typeof entry.answer !== 'string' || !/^[A-Z]{2,10}$/.test(entry.answer)
      || typeof entry.clue !== 'string' || !entry.clue.trim() || entry.clue.length > 300
      || typeof entry.sourceName !== 'string' || !entry.sourceName.trim() || entry.sourceName.length > 250
      || !Number.isInteger(entry.number) || entry.number < 1
      || !Number.isInteger(entry.row) || !Number.isInteger(entry.col)
      || entry.row < 0 || entry.col < 0 || !['across', 'down'].includes(entry.direction)
      || (entry.sourceText !== undefined && (typeof entry.sourceText !== 'string' || entry.sourceText.length > 2000))
      || (entry.sourceUrl !== undefined && (typeof entry.sourceUrl !== 'string' || entry.sourceUrl.length > 2000 || !/^https?:\/\//i.test(entry.sourceUrl)))) {
      throw new Error('Every answer needs a valid clue, position, number and named source.')
    }
    ids.add(entry.id)
    for (let i = 0; i < entry.answer.length; i++) {
      const row = entry.row + (entry.direction === 'down' ? i : 0)
      const col = entry.col + (entry.direction === 'across' ? i : 0)
      const key = `${row}:${col}:${entry.direction}`
      if (row >= size || col >= size || occupied.has(key)) throw new Error('Answers overlap or extend beyond the grid.')
      occupied.add(key)
    }
  }
  // This is the grid-building code used by the current Collingham Footnotes source.
  const built = buildCrosswordPuzzle({ entries: puzzle.placements })
  const starts = [...new Set(puzzle.placements.map((p) => p.row * size + p.col))].sort((a, b) => a - b)
  const visitedRuns = new Set<string>()
  for (let row = 0; row < size; row++) {
    for (let col = 0; col < size; col++) {
      const actual = puzzle.cells[row][col]
      const expected = built.cells[`${row}:${col}`]
      if (!actual || actual.solution !== (expected?.solution ?? null)) throw new Error('The grid does not match its answers.')
      const starting = puzzle.placements.filter((p) => p.row === row && p.col === col)
      const number = starting.length ? starts.indexOf(row * size + col) + 1 : undefined
      if (actual.number !== number || starting.some((p) => p.number !== number)) throw new Error('Clue numbers must follow reading order.')
      for (const direction of ['across', 'down'] as const) {
        const entry = puzzle.placements.find((p) => p.direction === direction && expected?.entryIds.includes(p.id))
        if (actual[direction === 'across' ? 'acrossId' : 'downId'] !== entry?.id) throw new Error('A grid cell has the wrong clue reference.')
        if (!expected) continue
        const dr = direction === 'down' ? 1 : 0
        const dc = direction === 'across' ? 1 : 0
        if (built.cells[`${row - dr}:${col - dc}`]) continue
        let length = 0
        while (built.cells[`${row + length * dr}:${col + length * dc}`]) length++
        if (length < 2) continue
        const matching = starting.filter((p) => p.direction === direction && p.answer.length === length)
        if (matching.length !== 1) throw new Error('Every run of letters must have exactly one clue.')
        visitedRuns.add(matching[0].id)
      }
    }
  }
  if (visitedRuns.size !== puzzle.placements.length) throw new Error('A clue does not match a complete grid entry.')
  const linked = new Set([puzzle.placements[0].id])
  let previous = -1
  while (previous !== linked.size) {
    previous = linked.size
    for (const cell of Object.values(built.cells)) {
      if (cell.entryIds.some((id) => linked.has(id))) cell.entryIds.forEach((id) => linked.add(id))
    }
  }
  if (linked.size !== puzzle.placements.length) throw new Error('All answers must connect to the crossword.')
}
