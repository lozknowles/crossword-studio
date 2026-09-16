export type Direction = 'across' | 'down'

export interface SourceEntry {
  id: string
  answer: string
  clue: string
  selected: boolean
  sourceName: string
  sourceText?: string
  sourceUrl?: string
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
  omittedAnswers: string[]
}

// The portable record consumed by Collingham's unchanged grid builder.
export interface CrosswordEntryRecord {
  id: string
  answer: string
  clue: string
  number: number
  row: number
  col: number
  direction: Direction
}

export interface CrosswordPuzzleRecord {
  entries: CrosswordEntryRecord[]
}

export interface SourceDocument {
  name: string
  text: string
  kind: 'sample' | 'document' | 'url' | 'text'
  pages?: number
  url?: string
}
