import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from 'pdf-lib'
import type { Puzzle } from '../types'
import { validatePuzzle } from './validate'

function printable(value: string, font: PDFFont) {
  return [...value.replace(/[–—‑]/g, '-').replace(/…/g, '...').replace(/\s+/g, ' ')].map((char) => {
    try { font.encodeText(char); return char } catch { return char.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^ -~]/g, '?') }
  }).join('')
}

function wrap(text: string, font: PDFFont, size: number, width: number): string[] {
  const lines: string[] = []
  let line = ''
  for (const word of printable(text, font).split(' ')) {
    if (line && font.widthOfTextAtSize(`${line} ${word}`, size) > width) { lines.push(line); line = '' }
    for (const char of (line ? ` ${word}` : word)) {
      if (font.widthOfTextAtSize(line + char, size) > width) { lines.push(line); line = '' }
      line += char
    }
  }
  if (line) lines.push(line)
  return lines
}

export async function createPuzzlePdf(puzzle: Puzzle, withSolution = false): Promise<Uint8Array> {
  validatePuzzle(puzzle)
  const doc = await PDFDocument.create()
  const regular = await doc.embedFont(StandardFonts.Helvetica)
  const bold = await doc.embedFont(StandardFonts.HelveticaBold)
  const ink = rgb(0.08, 0.13, 0.12)
  const muted = rgb(0.34, 0.39, 0.37)
  const accent = rgb(0.08, 0.37, 0.33)
  const width = 595.28, height = 841.89, margin = 42
  let page!: PDFPage
  let y = height - margin
  const addPage = (label: string) => {
    page = doc.addPage([width, height])
    y = height - margin
    page.drawText('CROSSWORD STUDIO  /  LAWRENCE KNOWLES', { x: margin, y, font: bold, size: 8, color: accent })
    y -= 29
    for (const line of wrap(puzzle.title, bold, 21, width - margin * 2)) {
      page.drawText(line, { x: margin, y, size: 21, font: bold, color: ink }); y -= 25
    }
    page.drawText(`${label}  /  ${puzzle.size} x ${puzzle.size}  /  ${puzzle.placements.length} clues`, { x: margin, y: y - 3, font: regular, size: 9, color: muted })
    y -= 24
  }
  const drawGrid = (solutions: boolean) => {
    const side = 290
    const cellSize = side / puzzle.size
    const x = (width - side) / 2
    for (let r = 0; r < puzzle.size; r++) {
      for (let c = 0; c < puzzle.size; c++) {
        const cell = puzzle.cells[r][c]
        const left = x + c * cellSize, bottom = y - (r + 1) * cellSize
        page.drawRectangle({ x: left, y: bottom, width: cellSize, height: cellSize, color: cell.solution ? rgb(1, 1, 1) : rgb(0, 0, 0), borderColor: rgb(0, 0, 0), borderWidth: 0.7 })
        if (cell.number) page.drawText(String(cell.number), { x: left + 2, y: bottom + cellSize - 9, font: regular, size: 7, color: ink })
        if (cell.solution && solutions) {
          const fontSize = Math.min(19, cellSize * 0.52)
          page.drawText(cell.solution, { x: left + (cellSize - bold.widthOfTextAtSize(cell.solution, fontSize)) / 2, y: bottom + cellSize * 0.22, font: bold, size: fontSize, color: ink })
        }
      }
    }
    y -= side + 24
  }
  addPage('THE PUZZLE')
  drawGrid(false)
  const columnWidth = (width - 2 * margin - 24) / 2
  let col = 0
  let columnTop = y
  const nextColumn = (heading: string) => {
    if (col === 0) { col = 1; y = columnTop } else { addPage('CLUES CONTINUED'); col = 0; columnTop = y }
    page.drawText(heading, { x: margin + col * (columnWidth + 24), y, font: bold, size: 11, color: accent })
    y -= 20
  }
  for (const direction of ['across', 'down'] as const) {
    const heading = direction.toUpperCase()
    if (direction === 'down' || y < 110) nextColumn(heading)
    else {
      page.drawText(heading, { x: margin + col * (columnWidth + 24), y, font: bold, size: 11, color: accent }); y -= 20
    }
    for (const entry of puzzle.placements.filter((p) => p.direction === direction).sort((a, b) => a.number - b.number)) {
      const lines = wrap(`${entry.number}. ${entry.clue} (${entry.answer.length})`, regular, 10, columnWidth)
      if (y - lines.length * 13 < 60) nextColumn(`${heading} CONTINUED`)
      for (const line of lines) {
        page.drawText(line, { x: margin + col * (columnWidth + 24), y, font: regular, size: 10, color: ink }); y -= 13
      }
      y -= 9
    }
    y -= 10
  }
  // Keep short references with the clues; spill into another column/page only
  // when needed, so a small crossword does not waste a sheet on one source.
  if (y < 120) nextColumn('SOURCES')
  else { page.drawText('SOURCES', { x: margin + col * (columnWidth + 24), y, font: bold, size: 9, color: accent }); y -= 18 }
  const sources = [...new Set(puzzle.placements.map((p) => p.sourceUrl ? `${p.sourceName} - ${p.sourceUrl}` : p.sourceName))]
  for (const source of sources) {
    for (const line of wrap(source, regular, 8, columnWidth)) {
      if (y < 65) nextColumn('SOURCES CONTINUED')
      page!.drawText(line, { x: margin + col * (columnWidth + 24), y, font: regular, size: 8, color: muted }); y -= 11
    }
    y -= 12
  }
  if (withSolution) { addPage('ANSWER KEY'); drawGrid(true) }
  const pages = doc.getPages()
  pages.forEach((p, i) => {
    p.drawLine({ start: { x: margin, y: 40 }, end: { x: width - margin, y: 40 }, thickness: 0.5, color: rgb(0.75, 0.78, 0.76) })
    p.drawText('lozknowles.com/crossword/', { x: margin, y: 25, size: 8, font: regular, color: muted })
    p.drawText(`${i + 1} / ${pages.length}`, { x: width - margin - 25, y: 25, size: 8, font: regular, color: muted })
  })
  doc.setTitle(printable(puzzle.title, regular))
  doc.setAuthor('Crossword Studio')
  doc.setCreator('')
  doc.setProducer('')
  return doc.save()
}

export function downloadFile(data: BlobPart, name: string, type: string) {
  const url = URL.createObjectURL(new Blob([data], { type }))
  const anchor = document.createElement('a')
  anchor.href = url; anchor.download = name
  document.body.append(anchor); anchor.click(); anchor.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 30000)
}

export function puzzleFilename(puzzle: Puzzle) {
  return puzzle.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 80) || 'crossword'
}
