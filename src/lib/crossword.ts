import type { Direction, Placement, Puzzle, PuzzleCell, SourceEntry } from '../types'
import { cleanAnswer } from './extract'
import { validatePuzzle } from './validate'

interface WorkingCell {
  char: string
  across: boolean
  down: boolean
}

interface WorkingPlacement extends SourceEntry {
  answer: string
  row: number
  col: number
  direction: Direction
}

interface Candidate {
  row: number
  col: number
  direction: Direction
  crosses: number
  score: number
}

function hashString(value: string): number {
  let hash = 2166136261
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

function mulberry32(seed: number) {
  return () => {
    let value = (seed += 0x6d2b79f5)
    value = Math.imul(value ^ (value >>> 15), value | 1)
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61)
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296
  }
}

function emptyGrid(size: number): Array<Array<WorkingCell | null>> {
  return Array.from({ length: size }, () => Array.from({ length: size }, () => null))
}

function inspectPlacement(
  grid: Array<Array<WorkingCell | null>>,
  answer: string,
  row: number,
  col: number,
  direction: Direction,
  requireCross: boolean,
): Candidate | null {
  const size = grid.length
  const dr = direction === 'down' ? 1 : 0
  const dc = direction === 'across' ? 1 : 0
  const endRow = row + dr * (answer.length - 1)
  const endCol = col + dc * (answer.length - 1)
  if (row < 0 || col < 0 || endRow >= size || endCol >= size) return null

  const beforeRow = row - dr
  const beforeCol = col - dc
  const afterRow = endRow + dr
  const afterCol = endCol + dc
  if (beforeRow >= 0 && beforeCol >= 0 && beforeRow < size && beforeCol < size && grid[beforeRow][beforeCol]) return null
  if (afterRow >= 0 && afterCol >= 0 && afterRow < size && afterCol < size && grid[afterRow][afterCol]) return null

  let crosses = 0
  for (let index = 0; index < answer.length; index += 1) {
    const r = row + dr * index
    const c = col + dc * index
    const existing = grid[r][c]
    if (existing) {
      if (existing.char !== answer[index]) return null
      if ((direction === 'across' && existing.across) || (direction === 'down' && existing.down)) return null
      crosses += 1
    } else if (direction === 'across') {
      if ((r > 0 && grid[r - 1][c]) || (r < size - 1 && grid[r + 1][c])) return null
    } else if ((c > 0 && grid[r][c - 1]) || (c < size - 1 && grid[r][c + 1])) {
      return null
    }
  }

  if (requireCross && crosses === 0) return null
  const center = (size - 1) / 2
  const midRow = row + (dr * (answer.length - 1)) / 2
  const midCol = col + (dc * (answer.length - 1)) / 2
  const distance = Math.abs(midRow - center) + Math.abs(midCol - center)
  return { row, col, direction, crosses, score: crosses * 100 - distance * 2 + answer.length }
}

function candidatesFor(grid: Array<Array<WorkingCell | null>>, answer: string): Candidate[] {
  const candidates: Candidate[] = []
  for (let row = 0; row < grid.length; row += 1) {
    for (let col = 0; col < grid.length; col += 1) {
      const cell = grid[row][col]
      if (!cell) continue
      for (let index = 0; index < answer.length; index += 1) {
        if (answer[index] !== cell.char) continue
        const across = inspectPlacement(grid, answer, row, col - index, 'across', true)
        const down = inspectPlacement(grid, answer, row - index, col, 'down', true)
        if (across) candidates.push(across)
        if (down) candidates.push(down)
      }
    }
  }
  return candidates
}

function writePlacement(
  grid: Array<Array<WorkingCell | null>>,
  entry: SourceEntry,
  answer: string,
  candidate: Candidate,
): WorkingPlacement {
  const dr = candidate.direction === 'down' ? 1 : 0
  const dc = candidate.direction === 'across' ? 1 : 0
  for (let index = 0; index < answer.length; index += 1) {
    const row = candidate.row + dr * index
    const col = candidate.col + dc * index
    const cell = grid[row][col] ?? { char: answer[index], across: false, down: false }
    cell[candidate.direction] = true
    grid[row][col] = cell
  }
  return { ...entry, answer, row: candidate.row, col: candidate.col, direction: candidate.direction }
}

function makeAttempt(entries: SourceEntry[], size: 5 | 10, random: () => number, attempt: number) {
  const grid = emptyGrid(size)
  const ordered = [...entries].sort((a, b) => {
    const lengthDifference = cleanAnswer(b.answer).length - cleanAnswer(a.answer).length
    return lengthDifference * 3 + (random() - 0.5) * (attempt > 20 ? 12 : 2)
  })
  const first = ordered.shift()!
  const firstAnswer = cleanAnswer(first.answer)
  const firstDirection: Direction = attempt % 2 === 0 ? 'across' : 'down'
  const firstRow = firstDirection === 'across' ? Math.floor(size / 2) : Math.floor((size - firstAnswer.length) / 2)
  const firstCol = firstDirection === 'across' ? Math.floor((size - firstAnswer.length) / 2) : Math.floor(size / 2)
  const firstCandidate = inspectPlacement(grid, firstAnswer, firstRow, firstCol, firstDirection, false)!
  const placements = [writePlacement(grid, first, firstAnswer, firstCandidate)]
  let intersections = 0

  const remaining = ordered
  let changed = true
  while (changed && remaining.length) {
    changed = false
    let best: { entryIndex: number; candidate: Candidate; answer: string } | null = null
    remaining.forEach((entry, entryIndex) => {
      const answer = cleanAnswer(entry.answer)
      const options = candidatesFor(grid, answer).sort((a, b) => b.score - a.score)
      if (!options.length) return
      const option = options[Math.min(Math.floor(random() * Math.min(options.length, 3)), options.length - 1)]
      if (!best || option.score > best.candidate.score + random() * 12) best = { entryIndex, candidate: option, answer }
    })
    if (best) {
      const chosen = best as { entryIndex: number; candidate: Candidate; answer: string }
      const entry = remaining.splice(chosen.entryIndex, 1)[0]
      placements.push(writePlacement(grid, entry, chosen.answer, chosen.candidate))
      intersections += chosen.candidate.crosses
      changed = true
    }
  }

  return { grid, placements, intersections }
}

export function buildPuzzle(
  rawEntries: SourceEntry[],
  size: 5 | 10,
  title: string,
  sourceName: string,
): Puzzle {
  const unique = new Map<string, SourceEntry>()
  rawEntries.filter((entry) => entry.selected).forEach((entry) => {
    const answer = cleanAnswer(entry.answer)
    if (answer.length >= 2 && answer.length <= size && !unique.has(answer)) unique.set(answer, { ...entry, answer })
  })
  const entries = [...unique.values()]
  if (size !== 5 && size !== 10) throw new Error('Choose a 5×5 or 10×10 grid.')
  if (entries.length > 80) throw new Error('Select no more than 80 answers.')
  for (const entry of entries) {
    if (!entry.clue.trim()) throw new Error(`Write a clue for ${entry.answer}.`)
    if (!entry.sourceName?.trim()) throw new Error(`Add a source for ${entry.answer}.`)
  }
  if (new Set(entries.map((entry) => entry.id)).size !== entries.length) throw new Error('Each answer must have a unique identifier.')
  if (entries.length < 2) throw new Error(`Choose at least two answers that fit a ${size}×${size} grid.`)

  const random = mulberry32(hashString(entries.map((entry) => entry.answer).join('|') + size))
  let best: ReturnType<typeof makeAttempt> | null = null
  for (let attempt = 0; attempt < 320; attempt += 1) {
    const result = makeAttempt(entries, size, random, attempt)
    if (!best || result.placements.length * 20 + result.intersections > best.placements.length * 20 + best.intersections) best = result
  }
  if (!best || best.placements.length < 2) throw new Error('These answers do not share enough letters. Try selecting a few different terms.')

  const cells: PuzzleCell[][] = Array.from({ length: size }, () =>
    Array.from({ length: size }, () => ({ solution: null })),
  )
  const numberedStarts = new Map<string, number>()
  let nextNumber = 1
  const sorted = [...best.placements].sort((a, b) => a.row - b.row || a.col - b.col || (a.direction === 'across' ? -1 : 1))
  const placements: Placement[] = sorted.map((placement) => {
    const key = `${placement.row}-${placement.col}`
    if (!numberedStarts.has(key)) numberedStarts.set(key, nextNumber++)
    const number = numberedStarts.get(key)!
    const dr = placement.direction === 'down' ? 1 : 0
    const dc = placement.direction === 'across' ? 1 : 0
    for (let index = 0; index < placement.answer.length; index += 1) {
      const row = placement.row + dr * index
      const col = placement.col + dc * index
      cells[row][col].solution = placement.answer[index]
      if (placement.direction === 'across') cells[row][col].acrossId = placement.id
      else cells[row][col].downId = placement.id
    }
    cells[placement.row][placement.col].number = number
    return { ...placement, number }
  })

  const puzzle: Puzzle = {
    id: crypto.randomUUID(),
    title: title.trim() || 'Untitled crossword',
    subtitle: `${placements.length} clues · ${size}×${size}`,
    sourceName,
    size,
    cells,
    placements,
    createdAt: new Date().toISOString(),
    omittedAnswers: entries.filter((entry) => !placements.some((placed) => placed.id === entry.id)).map((entry) => entry.answer),
  }
  validatePuzzle(puzzle)
  return puzzle
}
