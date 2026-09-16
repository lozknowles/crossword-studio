import type { Puzzle } from '../types'
import { validatePuzzle } from './validate'

const key = 'crossword-studio-session-v2'
export interface SavedSession {
  puzzle: Puzzle
  answers: Record<string, string>
  seconds: number
  hintsUsed: number
}

export function loadSession(): SavedSession | null {
  try {
    const raw = localStorage.getItem(key)
    if (!raw || raw.length > 250000) return null
    const data = JSON.parse(raw)
    validatePuzzle(data.puzzle)
    const answers: Record<string, string> = {}
    for (const [key, value] of Object.entries(data.answers || {})) {
      const [row, col] = key.split('-').map(Number)
      if (data.puzzle.cells[row]?.[col]?.solution && typeof value === 'string' && /^[A-Z]$/.test(value)) answers[key] = value
    }
    return {
      puzzle: data.puzzle, answers,
      seconds: Number.isFinite(data.seconds) ? Math.max(0, Math.min(359999, data.seconds)) : 0,
      hintsUsed: Number.isInteger(data.hintsUsed) ? Math.max(0, data.hintsUsed) : 0,
    }
  } catch { return null }
}

export function saveSession(session: SavedSession): boolean {
  try { localStorage.setItem(key, JSON.stringify(session)); return true } catch { return false }
}

export function clearSession() {
  try { localStorage.removeItem(key) } catch { /* Storage can be disabled. */ }
}
