import type { Direction, Puzzle } from '../types'

// Port of FootnotesCrossword.moveAcrossGrid: arrows skip black cells, and
// horizontal movement wraps in reading order so every cell is reachable.
export function nextCell(puzzle: Puzzle, row: number, col: number, key: string) {
  const cells = puzzle.cells.flatMap((line, r) => line.flatMap((cell, c) => cell.solution ? [{ row: r, col: c }] : []))
  const index = cells.findIndex((cell) => cell.row === row && cell.col === col)
  const backwards = key === 'ArrowLeft' || key === 'ArrowUp'
  const vertical = key === 'ArrowUp' || key === 'ArrowDown'
  const candidates = vertical ? cells.filter((cell) => cell.col === col && (backwards ? cell.row < row : cell.row > row)) : []
  const target = (backwards ? candidates.at(-1) : candidates[0])
    ?? cells[(Math.max(0, index) + (backwards ? -1 : 1) + cells.length) % cells.length]
  return { ...target, direction: (vertical ? 'down' : 'across') as Direction }
}
