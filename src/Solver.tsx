import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react'
import { ArrowLeft, Check, CheckCircle2, Clock3, Download, Lightbulb, Maximize2, Minimize2, Printer, RotateCcw } from 'lucide-react'
import type { Direction, Placement, Puzzle } from './types'
import { nextCell } from './lib/navigation'
import { loadSession, saveSession } from './lib/storage'

const keyFor = (row: number, col: number) => `${row}-${col}`
const coordinates = (entry: Placement) => Array.from({ length: entry.answer.length }, (_, i) => ({ row: entry.row + (entry.direction === 'down' ? i : 0), col: entry.col + (entry.direction === 'across' ? i : 0) }))
const timeLabel = (seconds: number) => `${Math.floor(seconds / 60).toString().padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`

export default function Solver({ puzzle, onBack }: { puzzle: Puzzle; onBack: () => void }) {
  const [saved] = useState(() => { const value = loadSession(); return value?.puzzle.id === puzzle.id ? value : null })
  const [answers, setAnswers] = useState<Record<string, string>>(saved?.answers ?? {})
  const first = puzzle.placements[0]
  const [active, setActive] = useState({ row: first.row, col: first.col, direction: first.direction })
  const activeRef = useRef(active)
  const pointerToggle = useRef(false)
  const [checked, setChecked] = useState<Set<string>>(new Set())
  const [seconds, setSeconds] = useState(saved?.seconds ?? 0)
  const [hintsUsed, setHintsUsed] = useState(saved?.hintsUsed ?? 0)
  const [hint, setHint] = useState<Record<string, string>>({})
  const hintTimer = useRef<number | null>(null)
  const [status, setStatus] = useState('Your puzzle and progress are saved on this device.')
  const [pdfBusy, setPdfBusy] = useState(false)
  const [withSolution, setWithSolution] = useState(false)
  const [full, setFull] = useState(false)
  const container = useRef<HTMLElement>(null)
  const refs = useRef<Record<string, HTMLInputElement | null>>({})
  const white = useMemo(() => puzzle.cells.flatMap((line, row) => line.flatMap((cell, col) => cell.solution ? [{ ...cell, row, col }] : [])), [puzzle])
  const filled = white.filter((cell) => answers[keyFor(cell.row, cell.col)]).length
  const solved = white.every((cell) => answers[keyFor(cell.row, cell.col)] === cell.solution)
  const cell = puzzle.cells[active.row][active.col]
  const entry = puzzle.placements.find((p) => p.id === (active.direction === 'across' ? cell.acrossId : cell.downId))
    ?? puzzle.placements.find((p) => p.id === cell.acrossId || p.id === cell.downId)!
  const activeKeys = new Set(coordinates(entry).map(({ row, col }) => keyFor(row, col)))

  useEffect(() => {
    if (solved) return
    const timer = window.setInterval(() => { if (document.visibilityState === 'visible') setSeconds((value) => value + 1) }, 1000)
    return () => window.clearInterval(timer)
  }, [solved])
  useEffect(() => {
    if (!saveSession({ puzzle, answers, seconds, hintsUsed })) {
      const notice = window.setTimeout(() => setStatus('Browser storage is unavailable. Save the puzzle file before leaving.'), 0)
      return () => window.clearTimeout(notice)
    }
  }, [puzzle, answers, seconds, hintsUsed])
  useEffect(() => () => { if (hintTimer.current !== null) window.clearTimeout(hintTimer.current) }, [])
  useEffect(() => {
    const change = () => setFull(document.fullscreenElement === container.current)
    document.addEventListener('fullscreenchange', change)
    return () => document.removeEventListener('fullscreenchange', change)
  }, [])

  const activate = (row: number, col: number, preferred: Direction = activeRef.current.direction, focus = true) => {
    const cell = puzzle.cells[row][col]
    const direction = cell[preferred === 'across' ? 'acrossId' : 'downId'] ? preferred : cell.acrossId ? 'across' : 'down'
    const next = { row, col, direction } as typeof active
    activeRef.current = next; setActive(next)
    if (focus) window.requestAnimationFrame(() => { refs.current[keyFor(row, col)]?.focus(); refs.current[keyFor(row, col)]?.select() })
  }
  const selectEntry = (placement: Placement) => {
    const positions = coordinates(placement)
    const next = positions.find(({ row, col }) => !answers[keyFor(row, col)]) ?? positions[0]
    activate(next.row, next.col, placement.direction)
  }
  const moveWithin = (row: number, col: number, delta: number) => {
    const positions = coordinates(entry)
    const next = positions[positions.findIndex((p) => p.row === row && p.col === col) + delta]
    if (next) activate(next.row, next.col, entry.direction)
  }
  const enter = (row: number, col: number, value: string) => {
    if (Object.keys(hint).length) return
    const letter = value.toUpperCase().replace(/[^A-Z]/g, '').slice(-1)
    const key = keyFor(row, col)
    setAnswers((current) => ({ ...current, [key]: letter }))
    setChecked((current) => { const next = new Set(current); next.delete(key); return next })
    if (letter) moveWithin(row, col, 1)
  }
  const handleKey = (event: KeyboardEvent<HTMLInputElement>, row: number, col: number) => {
    if (event.key.startsWith('Arrow')) {
      event.preventDefault(); const next = nextCell(puzzle, row, col, event.key); activate(next.row, next.col, next.direction)
    } else if (event.key === ' ') {
      event.preventDefault(); activate(row, col, activeRef.current.direction === 'across' ? 'down' : 'across')
    } else if (event.key === 'Backspace') {
      event.preventDefault()
      if (answers[keyFor(row, col)]) enter(row, col, '')
      else moveWithin(row, col, -1)
    }
  }
  const check = () => {
    const entered = white.filter((c) => answers[keyFor(c.row, c.col)])
    const wrong = entered.filter((c) => answers[keyFor(c.row, c.col)] !== c.solution).length
    setChecked(new Set(entered.map((c) => keyFor(c.row, c.col))))
    setStatus(entered.length === 0 ? 'Add some letters before checking.' : `${wrong ? `${wrong} incorrect ${wrong === 1 ? 'letter is' : 'letters are'} marked with a slash.` : 'All entered letters are correct.'} ${white.length - entered.length} squares still empty.`)
  }
  const temporaryHint = () => {
    if (hintTimer.current !== null) return
    const values: Record<string, string> = {}
    coordinates(entry).forEach(({ row, col }, i) => { values[keyFor(row, col)] = entry.answer[i] })
    setHint(values); setHintsUsed((n) => n + 1); setStatus('A two-second peek at the selected word. Your own letters stay as they were.')
    hintTimer.current = window.setTimeout(() => { setHint({}); hintTimer.current = null }, 2000)
  }
  const restart = () => {
    if (hintTimer.current !== null) window.clearTimeout(hintTimer.current)
    hintTimer.current = null; setHint({}); setAnswers({}); setChecked(new Set()); setSeconds(0); setHintsUsed(0)
    activate(first.row, first.col, first.direction); setStatus('A fresh grid. Progress is saved on this device.')
  }
  const download = async (kind: 'pdf' | 'json') => {
    setPdfBusy(true)
    try {
      const { createPuzzlePdf, downloadFile, puzzleFilename } = await import('./lib/exportPdf')
      if (kind === 'json') downloadFile(JSON.stringify(puzzle, null, 2), `${puzzleFilename(puzzle)}.crossword.json`, 'application/json')
      else { const bytes = await createPuzzlePdf(puzzle, withSolution); downloadFile(new Uint8Array(bytes).buffer, `${puzzleFilename(puzzle)}.pdf`, 'application/pdf') }
      setStatus(kind === 'pdf' ? 'Your PDF is ready to download.' : 'Puzzle saved. It includes the answers; send it to someone to open in Crossword Studio.')
    } catch { setStatus('The download could not be created. Please try again; Print is also available.') }
    finally { setPdfBusy(false) }
  }
  const toggleFullscreen = async () => {
    try { if (document.fullscreenElement) await document.exitFullscreen(); else await container.current?.requestFullscreen() }
    catch { setStatus('Full screen is unavailable in this browser. You can still solve the puzzle here.') }
  }

  return <main className="solver-page" ref={container}>
    <div className="solver-toolbar"><button className="back-button" onClick={onBack}><ArrowLeft size={17} /> Back to builder</button><div className="solver-actions"><button onClick={() => void download('json')} disabled={pdfBusy}>Save puzzle</button><button onClick={() => window.print()}><Printer size={16} /> Print</button><button onClick={() => void toggleFullscreen()} aria-label={full ? 'Leave full screen' : 'Full screen'}>{full ? <Minimize2 size={17} /> : <Maximize2 size={17} />}</button></div></div>
    <header className="puzzle-heading"><div><span className="step-kicker">THE CROSSWORD / A LITTLE TIME WELL SPENT</span><h1>{puzzle.title}</h1><p>From {puzzle.sourceName}</p></div><div className="puzzle-meta"><span><Clock3 size={17} />{timeLabel(seconds)}</span><span>{puzzle.size} × {puzzle.size}</span><span>{puzzle.placements.length} clues</span></div></header>
    {puzzle.omittedAnswers?.length > 0 && <details className="omitted-note"><summary>{puzzle.placements.length} words fitted together; {puzzle.omittedAnswers.length} did not fit this grid.</summary><p>{puzzle.omittedAnswers.join(', ')}. Return to the builder to choose different words or a larger grid.</p></details>}
    {solved && <div className="completion-banner" role="status"><CheckCircle2 /><div><strong>Every word in its place. Nicely done!</strong><p>Completed in {timeLabel(seconds)} with {hintsUsed} {hintsUsed === 1 ? 'hint' : 'hints'}.</p></div></div>}
    <div className="solver-layout"><section className="grid-column" aria-label="Crossword grid">
      <div className="progress-summary"><span><strong>{Math.round(filled / white.length * 100)}%</strong> filled</span><div><i style={{ width: `${filled / white.length * 100}%` }} /></div><span>{filled}/{white.length}</span></div>
      <div className="crossword-grid" style={{ gridTemplateColumns: `repeat(${puzzle.size}, 1fr)` }}>{puzzle.cells.map((line, row) => line.map((cell, col) => {
        const key = keyFor(row, col)
        if (!cell.solution) return <span className="black-cell" key={key} aria-hidden="true" />
        const wrong = checked.has(key) && !!answers[key] && answers[key] !== cell.solution
        const correct = checked.has(key) && answers[key] === cell.solution
        return <label className={`grid-cell ${activeKeys.has(key) ? 'in-word' : ''} ${active.row === row && active.col === col ? 'active' : ''} ${wrong ? 'wrong' : ''} ${correct ? 'right' : ''} ${hint[key] ? 'hinted' : ''}`} key={key}>
          {!!cell.number && <span className="cell-number">{cell.number}</span>}{wrong && <span className="wrong-mark" aria-hidden="true">/</span>}
          <input ref={(element) => { refs.current[key] = element }} value={hint[key] ?? answers[key] ?? ''} maxLength={1} autoComplete="off" autoCapitalize="characters" spellCheck={false} readOnly={!!Object.keys(hint).length} aria-label={`Row ${row + 1}, column ${col + 1}${cell.number ? `, clue ${cell.number}` : ''}${wrong ? ', incorrect letter' : ''}`} aria-invalid={wrong} aria-describedby="active-clue"
            onPointerDown={() => { pointerToggle.current = document.activeElement === refs.current[key] }}
            onFocus={(event) => { if (activeRef.current.row !== row || activeRef.current.col !== col) activate(row, col, activeRef.current.direction, false); event.target.select() }}
            onClick={() => { if (pointerToggle.current) activate(row, col, activeRef.current.direction === 'across' ? 'down' : 'across'); else activate(row, col); pointerToggle.current = false }}
            onChange={(event) => enter(row, col, event.target.value)} onKeyDown={(event) => handleKey(event, row, col)} />
        </label>
      }))}</div>
      <div className="current-clue" id="active-clue" aria-live="polite"><span>{entry.number} {entry.direction === 'across' ? 'ACROSS' : 'DOWN'}</span><strong>{entry.clue} <small>({entry.answer.length})</small></strong></div>
      <div className="game-controls"><button onClick={check}><CheckCircle2 size={17} /> Check letters</button><button onClick={temporaryHint} disabled={!!Object.keys(hint).length || solved}><Lightbulb size={17} /> Two-second hint</button><button onClick={restart}><RotateCcw size={17} /> Start over</button></div>
      <p className="keyboard-tip">Arrow keys move between squares. Space switches direction at a crossing.</p>
      <p className="solver-status" role="status" aria-live="polite">{status}</p>
      <details className="source-details"><summary>Source for this clue</summary><p>{entry.sourceName}</p>{entry.sourceText && <blockquote>{entry.sourceText}</blockquote>}{entry.sourceUrl && <a href={entry.sourceUrl} target="_blank" rel="noreferrer">Read original article ↗</a>}</details>
      <div className="pdf-card"><div><span className="step-kicker">PENCIL & PAPER</span><h3>Take your crossword with you.</h3><p>A clean, numbered grid with Across and Down clues and source references.</p></div><label><input type="checkbox" checked={withSolution} onChange={(event) => setWithSolution(event.target.checked)} /> Include a separate answer key</label><button className="primary-button" disabled={pdfBusy} onClick={() => void download('pdf')}><Download size={17} />{pdfBusy ? 'Preparing download…' : 'Download PDF'}</button></div>
    </section><aside className="clues-card"><div className="clues-heading"><div><span className="step-kicker">A WORD TO THE WISE</span><h2>Your clues</h2></div><span>{puzzle.placements.length}</span></div>{(['across', 'down'] as const).map((direction) => <section className="clue-group" key={direction}><h3>{direction}</h3>{puzzle.placements.filter((p) => p.direction === direction).sort((a, b) => a.number - b.number).map((placement) => {
      const done = coordinates(placement).every(({ row, col }, i) => answers[keyFor(row, col)] === placement.answer[i])
      return <button className={`${entry.id === placement.id ? 'active' : ''} ${done ? 'done' : ''}`} key={placement.id} onClick={() => selectEntry(placement)} aria-label={`${placement.number} ${direction}: ${placement.clue}, ${placement.answer.length} letters${done ? ', solved' : ''}`}><span>{placement.number}</span><p>{placement.clue}<small>{placement.answer.length} letters {done && <Check size={12} aria-label="Solved" />}</small></p></button>
    })}</section>)}</aside></div>
  </main>
}
