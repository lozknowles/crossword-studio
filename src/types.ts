export type Direction = 'across' | 'down'

export interface SourceEntry {
  id: string
  answer: string
  clue: string
  selected: boolean
}

export interface Placement extends SourceEntry {
  row: number
  col: number
  direction: Direction
  number: number
}

export interface PuzzleCell {
  solution: string | null
  number?: number
  acrossId?: string
  downId?: string
}

export interface Puzzle {
  id: string
  title: string
  subtitle: string
  sourceName: string
  size: 5 | 10
  cells: PuzzleCell[][]
  placements: Placement[]
  createdAt: string
}
