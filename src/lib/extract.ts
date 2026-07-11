import type { SourceEntry } from '../types'

const stopwords = new Set([
  'about', 'after', 'again', 'against', 'also', 'among', 'another', 'available', 'because',
  'been', 'before', 'being', 'between', 'both', 'building', 'community', 'could', 'during',
  'each', 'early', 'england', 'first', 'following', 'from', 'have', 'history', 'house', 'into',
  'later', 'local', 'more', 'most', 'nottinghamshire', 'other', 'over', 'period', 'public',
  'records', 'remained', 'served', 'since', 'some', 'than', 'that', 'their', 'there', 'these',
  'they', 'this', 'through', 'under', 'village', 'were', 'where', 'which', 'while', 'with',
  'would', 'years', 'your',
])

export function cleanAnswer(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z]/g, '')
    .toUpperCase()
}

function sentenceClue(sentence: string, term: string): string {
  const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const blanked = sentence.replace(new RegExp(escaped, 'gi'), '_____')
  const trimmed = blanked.replace(/\s+/g, ' ').trim()
  if (trimmed.length <= 150) return trimmed
  const index = trimmed.indexOf('_____')
  const start = Math.max(0, index - 58)
  const end = Math.min(trimmed.length, index + 88)
  return `${start > 0 ? '…' : ''}${trimmed.slice(start, end).trim()}${end < trimmed.length ? '…' : ''}`
}

export function extractEntries(text: string, size: 5 | 10): SourceEntry[] {
  const sentences = text
    .replace(/\s+/g, ' ')
    .split(/(?<=[.!?])\s+(?=[A-Z0-9])/)
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence.length > 20)

  const candidates = new Map<string, { term: string; sentence: string; score: number }>()

  sentences.forEach((sentence) => {
    const properPhrases = sentence.match(/\b(?:[A-Z][a-z]{2,})(?:\s+(?:and|of|the|[A-Z][a-z]{2,})){0,2}\b/g) ?? []
    const words = sentence.match(/\b[A-Za-z]{3,}\b/g) ?? []

    properPhrases.forEach((term) => {
      const answer = cleanAnswer(term)
      if (answer.length < 3 || answer.length > size || stopwords.has(term.toLowerCase())) return
      const score = 18 + answer.length + (term.includes(' ') ? 4 : 0)
      const current = candidates.get(answer)
      if (!current || score > current.score) candidates.set(answer, { term, sentence, score })
    })

    words.forEach((term) => {
      const answer = cleanAnswer(term)
      const lower = term.toLowerCase()
      if (answer.length < 3 || answer.length > size || stopwords.has(lower)) return
      const current = candidates.get(answer)
      const score = (current?.score ?? 0) + 1 + Math.min(answer.length, 7) / 10
      candidates.set(answer, { term: current?.term ?? term, sentence: current?.sentence ?? sentence, score })
    })
  })

  return [...candidates.entries()]
    .sort(([, a], [, b]) => b.score - a.score)
    .slice(0, size === 5 ? 18 : 30)
    .map(([answer, candidate], index) => ({
      id: `extracted-${index}-${answer}`,
      answer,
      clue: sentenceClue(candidate.sentence, candidate.term),
      selected: true,
    }))
}
