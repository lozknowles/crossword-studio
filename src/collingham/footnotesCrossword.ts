import { CrosswordEntryRecord, CrosswordPuzzleRecord } from '../types.js';

export type CrosswordDirection = 'across' | 'down';

export type CrosswordCell = {
  row: number;
  col: number;
  solution: string;
  locked: boolean;
  startsEntryIds: string[];
  entryIds: string[];
};

export type BuiltCrosswordPuzzle = CrosswordPuzzleRecord & {
  rows: number;
  cols: number;
  cells: Record<string, CrosswordCell>;
};

const cellKey = (row: number, col: number) => `${row}:${col}`;
const isLockedSolution = (value: string) => /[^A-Z0-9]/.test(value);

const validateEntry = (entry: CrosswordEntryRecord): CrosswordEntryRecord => {
  const answer = entry.answer.trim().toUpperCase();

  if (!answer || !/^[A-Z0-9-]+$/.test(answer)) {
    throw new Error(`Crossword entry ${entry.id} must use letters, digits, or hyphens only.`);
  }

  if (!Number.isInteger(entry.row) || entry.row < 0 || !Number.isInteger(entry.col) || entry.col < 0) {
    throw new Error(`Crossword entry ${entry.id} has invalid coordinates.`);
  }

  if (entry.direction !== 'across' && entry.direction !== 'down') {
    throw new Error(`Crossword entry ${entry.id} has an invalid direction.`);
  }

  return {
    ...entry,
    answer
  };
};

export const buildCrosswordPuzzle = (puzzle: CrosswordPuzzleRecord): BuiltCrosswordPuzzle => {
  const validatedEntries = puzzle.entries.map(validateEntry);
  const cells: Record<string, CrosswordCell> = {};
  let rows = 0;
  let cols = 0;

  for (const entry of validatedEntries) {
    const stepRow = entry.direction === 'down' ? 1 : 0;
    const stepCol = entry.direction === 'across' ? 1 : 0;

    rows = Math.max(rows, entry.row + (stepRow * entry.answer.length) + 1);
    cols = Math.max(cols, entry.col + (stepCol * entry.answer.length) + 1);

    entry.answer.split('').forEach((letter, index) => {
      const row = entry.row + (stepRow * index);
      const col = entry.col + (stepCol * index);
      const key = cellKey(row, col);
      const existing = cells[key];

      if (existing && existing.solution !== letter) {
        throw new Error(`Crossword conflict at ${key}: ${existing.solution} vs ${letter}`);
      }

      if (!existing) {
        cells[key] = {
          row,
          col,
          solution: letter,
          locked: isLockedSolution(letter),
          startsEntryIds: index === 0 ? [entry.id] : [],
          entryIds: [entry.id]
        };
        return;
      }

      existing.entryIds.push(entry.id);
      if (index === 0) {
        existing.startsEntryIds.push(entry.id);
      }
    });
  }

  return {
    ...puzzle,
    entries: validatedEntries,
    rows,
    cols,
    cells
  };
};
