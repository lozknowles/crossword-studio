import { useEffect, useMemo, useRef, useState } from 'react'
import {
  ArrowLeft,
  BookOpen,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Download,
  FileText,
  Grid2X2,
  Lightbulb,
  LoaderCircle,
  LockKeyhole,
  PencilLine,
  Plus,
  Printer,
  RefreshCw,
  RotateCcw,
  Sparkles,
  Trash2,
  UploadCloud,
  WandSparkles,
  X,
} from 'lucide-react'
import { sampleEntries, sampleText } from './data/sample'
import { buildPuzzle } from './lib/crossword'
import { cleanAnswer, extractEntries } from './lib/extract'
import { extractPdfText } from './lib/pdf'
import type { Direction, Placement, Puzzle, SourceEntry } from './types'

type Screen = 'builder' | 'solver'

const storageKey = 'crossword-studio-progress-v1'

function formatTime(seconds: number) {
  const minutes = Math.floor(seconds / 60).toString().padStart(2, '0')
  const remainder = (seconds % 60).toString().padStart(2, '0')
  return `${minutes}:${remainder}`
}

function starterPuzzle() {
  return buildPuzzle(sampleEntries, 10, 'Collingham: A Pub History', 'Collingham_Pubs_History.pdf')
}

function App() {
  const [screen, setScreen] = useState<Screen>('builder')
  const [size, setSize] = useState<5 | 10>(10)
  const [title, setTitle] = useState('Collingham: A Pub History')
  const [sourceName, setSourceName] = useState('Collingham_Pubs_History.pdf')
  const [sourceText, setSourceText] = useState(sampleText)
  const [sourcePages, setSourcePages] = useState(8)
  const [sourceKind, setSourceKind] = useState<'sample' | 'upload'>('sample')
  const [entries, setEntries] = useState<SourceEntry[]>(sampleEntries)
  const [puzzle, setPuzzle] = useState<Puzzle>(starterPuzzle)
  const [isReading, setIsReading] = useState(false)
  const [error, setError] = useState('')

  const resetSample = () => {
    setTitle('Collingham: A Pub History')
    setSourceName('Collingham_Pubs_History.pdf')
    setSourceText(sampleText)
    setSourcePages(8)
    setSourceKind('sample')
    setEntries(sampleEntries.map((entry) => ({ ...entry })))
    setError('')
  }

  const changeSize = (nextSize: 5 | 10) => {
    setSize(nextSize)
    if (sourceKind === 'sample') {
      setEntries(sampleEntries.map((entry) => ({ ...entry, selected: cleanAnswer(entry.answer).length <= nextSize })))
    } else {
      setEntries(extractEntries(sourceText, nextSize))
    }
    setError('')
  }

  const handleFile = async (file?: File) => {
    if (!file) return
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      setError('Please choose a PDF document.')
      return
    }
    setIsReading(true)
    setError('')
    try {
      const result = await extractPdfText(file)
      if (result.text.trim().length < 60) throw new Error('This PDF does not appear to contain extractable text. Try a text-based or OCRed PDF.')
      setSourceName(file.name)
      setSourcePages(result.pages)
      setSourceText(result.text)
      setSourceKind('upload')
      setTitle(file.name.replace(/\.pdf$/i, '').replace(/[_-]+/g, ' '))
      setEntries(extractEntries(result.text, size))
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'The PDF could not be read.')
    } finally {
      setIsReading(false)
    }
  }

  const generate = () => {
    try {
      const next = buildPuzzle(entries, size, title, sourceName)
      setPuzzle(next)
      setError('')
      setScreen('solver')
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'A crossword could not be generated from these entries.')
    }
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <button className="brand" onClick={() => setScreen('builder')} aria-label="Crossword Studio home">
          <span className="brand-mark" aria-hidden="true"><Grid2X2 size={20} strokeWidth={2.2} /></span>
          <span>Crossword <strong>Studio</strong></span>
        </button>
        <nav className="topnav" aria-label="Primary navigation">
          <button className={screen === 'builder' ? 'active' : ''} onClick={() => setScreen('builder')}>Build</button>
          <button className={screen === 'solver' ? 'active' : ''} onClick={() => setScreen('solver')}>Solve</button>
          <a href="#how-it-works" onClick={() => setScreen('builder')}>How it works</a>
        </nav>
        <div className="privacy-note"><LockKeyhole size={14} /> Your PDF stays private</div>
      </header>

      {screen === 'builder' ? (
        <Builder
          size={size}
          title={title}
          sourceName={sourceName}
          sourcePages={sourcePages}
          sourceKind={sourceKind}
          entries={entries}
          isReading={isReading}
          error={error}
          onTitle={setTitle}
          onSize={changeSize}
          onEntries={setEntries}
          onFile={handleFile}
          onSample={resetSample}
          onGenerate={generate}
        />
      ) : (
        <Solver puzzle={puzzle} onBack={() => setScreen('builder')} />
      )}
    </div>
  )
}

interface BuilderProps {
  size: 5 | 10
  title: string
  sourceName: string
  sourcePages: number
  sourceKind: 'sample' | 'upload'
  entries: SourceEntry[]
  isReading: boolean
  error: string
  onTitle: (value: string) => void
  onSize: (value: 5 | 10) => void
  onEntries: (value: SourceEntry[]) => void
  onFile: (file?: File) => void
  onSample: () => void
  onGenerate: () => void
}

function Builder(props: BuilderProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const eligible = props.entries.filter((entry) => entry.selected && cleanAnswer(entry.answer).length <= props.size)
  const updateEntry = (id: string, patch: Partial<SourceEntry>) => {
    props.onEntries(props.entries.map((entry) => (entry.id === id ? { ...entry, ...patch } : entry)))
  }
  const deleteEntry = (id: string) => props.onEntries(props.entries.filter((entry) => entry.id !== id))
  const addEntry = () => props.onEntries([
    ...props.entries,
    { id: `manual-${Date.now()}`, answer: '', clue: '', selected: true },
  ])

  return (
    <main>
      <section className="hero">
        <div className="eyebrow"><Sparkles size={15} /> From source to solver</div>
        <h1>Turn a PDF into a<br /><em>crossword worth solving.</em></h1>
        <p>Upload local history, teaching material, or research. We’ll find the good stuff, shape the clues, and build a playable puzzle in your browser.</p>
        <div className="hero-points">
          <span><CheckCircle2 size={16} /> No account</span>
          <span><CheckCircle2 size={16} /> No upload to a server</span>
          <span><CheckCircle2 size={16} /> Fully editable</span>
        </div>
      </section>

      <section className="studio" aria-label="Crossword builder">
        <div className="studio-progress" aria-label="Builder progress">
          <div className="progress-step current"><span>1</span><div><strong>Add source</strong><small>PDF document</small></div></div>
          <ChevronRight className="progress-arrow" />
          <div className="progress-step current"><span>2</span><div><strong>Shape clues</strong><small>Review & edit</small></div></div>
          <ChevronRight className="progress-arrow" />
          <div className="progress-step"><span>3</span><div><strong>Play</strong><small>Share & solve</small></div></div>
        </div>

        <div className="builder-layout">
          <div className="builder-main">
            <article className="panel source-panel">
              <div className="panel-heading">
                <div><span className="step-kicker">Step 1</span><h2>Choose your source</h2></div>
                {props.sourceName && <span className="status-pill"><Check size={13} /> Ready</span>}
              </div>

              <input
                ref={inputRef}
                className="visually-hidden"
                type="file"
                accept="application/pdf,.pdf"
                onChange={(event) => props.onFile(event.target.files?.[0])}
              />
              <button
                type="button"
                className={`dropzone ${isDragging ? 'dragging' : ''}`}
                onClick={() => inputRef.current?.click()}
                onDragOver={(event) => { event.preventDefault(); setIsDragging(true) }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={(event) => {
                  event.preventDefault()
                  setIsDragging(false)
                  props.onFile(event.dataTransfer.files?.[0])
                }}
              >
                <span className="upload-icon">{props.isReading ? <LoaderCircle className="spin" /> : <UploadCloud />}</span>
                <span><strong>{props.isReading ? 'Reading your document…' : 'Drop a PDF here or browse'}</strong><small>Text-based and OCRed PDFs work best · up to 50 MB</small></span>
              </button>

              <div className="or-divider"><span>or start with an example</span></div>
              <button className={`sample-card ${props.sourceKind === 'sample' ? 'selected' : ''}`} onClick={props.onSample}>
                <span className="sample-icon"><BookOpen /></span>
                <span className="sample-copy"><strong>Collingham’s historic pubs</strong><small>8-page local history · dates, people & places</small></span>
                <span className="sample-action">{props.sourceKind === 'sample' ? <><Check size={14} /> Loaded</> : <>Use example <ChevronRight size={14} /></>}</span>
              </button>

              {props.sourceName && (
                <div className="file-summary">
                  <FileText size={18} />
                  <div><strong>{props.sourceName}</strong><small>{props.sourcePages} pages · processed locally</small></div>
                  <CheckCircle2 size={19} className="success-icon" />
                </div>
              )}
            </article>

            <article className="panel clue-panel">
              <div className="panel-heading">
                <div><span className="step-kicker">Step 2</span><h2>Shape your clues</h2></div>
                <span className="entry-count">{eligible.length} selected</span>
              </div>
              <p className="panel-intro">We found these promising terms. Tweak anything—the puzzle gets better with your editorial eye.</p>

              <div className="entry-list">
                <div className="entry-list-head"><span>Use</span><span>Answer</span><span>Clue</span><span></span></div>
                {props.entries.map((entry) => {
                  const answerLength = cleanAnswer(entry.answer).length
                  const tooLong = answerLength > props.size
                  return (
                    <div className={`entry-row ${tooLong ? 'too-long' : ''}`} key={entry.id}>
                      <label className="check-control">
                        <input
                          type="checkbox"
                          checked={entry.selected && !tooLong}
                          disabled={tooLong}
                          onChange={(event) => updateEntry(entry.id, { selected: event.target.checked })}
                          aria-label={`Use ${entry.answer || 'new answer'}`}
                        />
                        <span><Check size={12} /></span>
                      </label>
                      <div className="answer-field">
                        <input
                          value={entry.answer}
                          maxLength={props.size + 5}
                          onChange={(event) => updateEntry(entry.id, { answer: event.target.value.toUpperCase() })}
                          placeholder="ANSWER"
                          aria-label="Answer"
                        />
                        <small className={tooLong ? 'warning' : ''}>{answerLength}/{props.size}</small>
                      </div>
                      <input
                        className="clue-input"
                        value={entry.clue}
                        onChange={(event) => updateEntry(entry.id, { clue: event.target.value })}
                        placeholder="Write a clue…"
                        aria-label={`Clue for ${entry.answer || 'new answer'}`}
                      />
                      <button className="icon-button danger" onClick={() => deleteEntry(entry.id)} aria-label={`Delete ${entry.answer}`}><Trash2 size={16} /></button>
                    </div>
                  )
                })}
              </div>
              <button className="text-button" onClick={addEntry}><Plus size={16} /> Add your own answer</button>
            </article>
          </div>

          <aside className="builder-sidebar">
            <article className="panel settings-panel">
              <div className="panel-heading compact"><div><span className="step-kicker">Puzzle setup</span><h2>Make it yours</h2></div></div>
              <label className="field-label" htmlFor="puzzle-title">Puzzle title</label>
              <input id="puzzle-title" className="title-input" value={props.title} onChange={(event) => props.onTitle(event.target.value)} />

              <span className="field-label">Grid size</span>
              <div className="size-picker">
                <button className={props.size === 5 ? 'active' : ''} onClick={() => props.onSize(5)}><MiniGrid size={5} /><span><strong>5 × 5</strong><small>Quick play</small></span></button>
                <button className={props.size === 10 ? 'active' : ''} onClick={() => props.onSize(10)}><MiniGrid size={10} /><span><strong>10 × 10</strong><small>Full puzzle</small></span></button>
              </div>

              <div className="quality-card">
                <div className="quality-top"><span>Puzzle ingredients</span><strong>{Math.min(100, Math.round((eligible.length / (props.size === 5 ? 7 : 12)) * 100))}%</strong></div>
                <div className="quality-track"><span style={{ width: `${Math.min(100, (eligible.length / (props.size === 5 ? 7 : 12)) * 100)}%` }} /></div>
                <small>{eligible.length >= (props.size === 5 ? 5 : 8) ? 'A healthy mix—ready to generate.' : 'Select a few more answers for a richer grid.'}</small>
              </div>

              {props.error && <div className="error-message" role="alert"><X size={16} />{props.error}</div>}

              <button className="primary-button" onClick={props.onGenerate} disabled={props.isReading || eligible.length < 2}>
                <WandSparkles size={18} /> Build my crossword <ChevronRight size={18} />
              </button>
              <p className="button-note"><LockKeyhole size={12} /> Everything happens in this browser</p>
            </article>

            <article className="tip-card">
              <span><Lightbulb size={18} /></span>
              <div><strong>A small editorial tip</strong><p>Short, specific clues feel more satisfying. Keep a mix of easy wins and deeper cuts.</p></div>
            </article>
          </aside>
        </div>
      </section>

      <section className="how-it-works" id="how-it-works">
        <span className="step-kicker">How it works</span>
        <h2>From document to “aha!” in three moves.</h2>
        <div className="how-grid">
          <div><span><UploadCloud /></span><strong>1. Read locally</strong><p>Your browser extracts the text. The document never needs to leave your device.</p></div>
          <div><span><PencilLine /></span><strong>2. Curate the good bits</strong><p>Review suggested answers and source-aware clues before building.</p></div>
          <div><span><Grid2X2 /></span><strong>3. Solve anywhere</strong><p>Play a responsive, keyboard-friendly crossword and export the puzzle data.</p></div>
        </div>
      </section>
    </main>
  )
}

function MiniGrid({ size }: { size: 5 | 10 }) {
  const count = size === 5 ? 9 : 16
  return <span className={`mini-grid mini-${size}`} aria-hidden="true">{Array.from({ length: count }, (_, index) => <i key={index} />)}</span>
}

interface SolverProps { puzzle: Puzzle; onBack: () => void }

function Solver({ puzzle, onBack }: SolverProps) {
  const saved = useMemo(() => {
    try {
      const data = JSON.parse(localStorage.getItem(storageKey) ?? '{}')
      return data.puzzleId === puzzle.id ? data : null
    } catch { return null }
  }, [puzzle.id])
  const [answers, setAnswers] = useState<Record<string, string>>(saved?.answers ?? {})
  const [active, setActive] = useState<{ row: number; col: number }>(() => {
    const first = puzzle.placements[0]
    return { row: first.row, col: first.col }
  })
  const [direction, setDirection] = useState<Direction>(puzzle.placements[0]?.direction ?? 'across')
  const [checked, setChecked] = useState<Set<string>>(new Set())
  const [seconds, setSeconds] = useState(saved?.seconds ?? 0)
  const [completionDismissed, setCompletionDismissed] = useState(false)
  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({})

  const cellKey = (row: number, col: number) => `${row}-${col}`
  const whiteCells = puzzle.cells.flatMap((row, rowIndex) => row.map((cell, colIndex) => ({ cell, row: rowIndex, col: colIndex }))).filter(({ cell }) => cell.solution)
  const filled = whiteCells.filter(({ row, col }) => answers[cellKey(row, col)]).length
  const progress = whiteCells.length ? Math.round((filled / whiteCells.length) * 100) : 0

  useEffect(() => {
    const interval = window.setInterval(() => setSeconds((value: number) => value + 1), 1000)
    return () => window.clearInterval(interval)
  }, [])

  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify({ puzzleId: puzzle.id, answers, seconds }))
  }, [answers, seconds, puzzle.id])

  const solved = whiteCells.length > 0 && filled === whiteCells.length
    && whiteCells.every(({ cell, row, col }) => answers[cellKey(row, col)] === cell.solution)

  const placementsForCell = (row: number, col: number) => {
    const cell = puzzle.cells[row][col]
    return puzzle.placements.filter((placement) => placement.id === cell.acrossId || placement.id === cell.downId)
  }
  const activePlacement = placementsForCell(active.row, active.col).find((placement) => placement.direction === direction)
    ?? placementsForCell(active.row, active.col)[0]

  const coordinates = (placement: Placement) => Array.from({ length: placement.answer.length }, (_, index) => ({
    row: placement.row + (placement.direction === 'down' ? index : 0),
    col: placement.col + (placement.direction === 'across' ? index : 0),
  }))

  const selectCell = (row: number, col: number, toggle = false) => {
    const available = placementsForCell(row, col)
    if (toggle && active.row === row && active.col === col && available.length > 1) {
      setDirection((current) => current === 'across' ? 'down' : 'across')
    } else if (!available.some((placement) => placement.direction === direction)) {
      setDirection(available[0]?.direction ?? direction)
    }
    setActive({ row, col })
  }

  const moveWithin = (placement: Placement, row: number, col: number, delta: number) => {
    const cells = coordinates(placement)
    const index = cells.findIndex((cell) => cell.row === row && cell.col === col)
    const next = cells[index + delta]
    if (next) {
      setActive(next)
      window.setTimeout(() => inputRefs.current[cellKey(next.row, next.col)]?.focus(), 0)
    }
  }

  const enterLetter = (row: number, col: number, value: string) => {
    const letter = value.toUpperCase().replace(/[^A-Z]/g, '').slice(-1)
    const key = cellKey(row, col)
    setAnswers((current) => ({ ...current, [key]: letter }))
    setChecked((current) => { const next = new Set(current); next.delete(key); return next })
    if (letter && activePlacement) moveWithin(activePlacement, row, col, 1)
  }

  const handleKey = (event: React.KeyboardEvent<HTMLInputElement>, row: number, col: number) => {
    if (event.key === 'Backspace') {
      event.preventDefault()
      const key = cellKey(row, col)
      if (answers[key]) setAnswers((current) => ({ ...current, [key]: '' }))
      else if (activePlacement) moveWithin(activePlacement, row, col, -1)
      return
    }
    const moves: Record<string, [number, number, Direction]> = {
      ArrowLeft: [0, -1, 'across'], ArrowRight: [0, 1, 'across'], ArrowUp: [-1, 0, 'down'], ArrowDown: [1, 0, 'down'],
    }
    if (moves[event.key]) {
      event.preventDefault()
      const [dr, dc, nextDirection] = moves[event.key]
      setDirection(nextDirection)
      let nextRow = row + dr
      let nextCol = col + dc
      while (nextRow >= 0 && nextRow < puzzle.size && nextCol >= 0 && nextCol < puzzle.size) {
        if (puzzle.cells[nextRow][nextCol].solution) {
          selectCell(nextRow, nextCol)
          window.setTimeout(() => inputRefs.current[cellKey(nextRow, nextCol)]?.focus(), 0)
          break
        }
        nextRow += dr
        nextCol += dc
      }
    }
    if (event.key === ' ') {
      event.preventDefault()
      selectCell(row, col, true)
    }
  }

  const selectClue = (placement: Placement) => {
    setDirection(placement.direction)
    setActive({ row: placement.row, col: placement.col })
    window.setTimeout(() => inputRefs.current[cellKey(placement.row, placement.col)]?.focus(), 0)
  }

  const checkPuzzle = () => {
    setChecked(new Set(whiteCells.filter(({ row, col }) => answers[cellKey(row, col)]).map(({ row, col }) => cellKey(row, col))))
  }

  const revealWord = () => {
    if (!activePlacement) return
    setAnswers((current) => {
      const next = { ...current }
      coordinates(activePlacement).forEach(({ row, col }, index) => { next[cellKey(row, col)] = activePlacement.answer[index] })
      return next
    })
  }

  const restart = () => {
    setAnswers({})
    setChecked(new Set())
    setSeconds(0)
    setCompletionDismissed(false)
    localStorage.removeItem(storageKey)
  }

  const download = () => {
    const blob = new Blob([JSON.stringify(puzzle, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `${puzzle.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.crossword.json`
    anchor.click()
    URL.revokeObjectURL(url)
  }

  const across = puzzle.placements.filter((placement) => placement.direction === 'across').sort((a, b) => a.number - b.number)
  const down = puzzle.placements.filter((placement) => placement.direction === 'down').sort((a, b) => a.number - b.number)

  return (
    <main className="solver-page">
      <div className="solver-toolbar">
        <button className="back-button" onClick={onBack}><ArrowLeft size={17} /> Back to builder</button>
        <div className="solver-actions">
          <button onClick={download}><Download size={16} /> Export</button>
          <button onClick={() => window.print()}><Printer size={16} /> Print</button>
        </div>
      </div>

      <header className="puzzle-heading">
        <div><span className="eyebrow"><Sparkles size={14} /> Ready to solve</span><h1>{puzzle.title}</h1><p>Drawn from {puzzle.sourceName}</p></div>
        <div className="puzzle-meta"><span><Clock3 size={17} />{formatTime(seconds)}</span><span>{puzzle.size} × {puzzle.size}</span><span>{puzzle.placements.length} clues</span></div>
      </header>

      <div className="solver-layout">
        <section className="grid-column" aria-label="Crossword grid">
          <div className="progress-summary"><span><strong>{progress}%</strong> complete</span><div><i style={{ width: `${progress}%` }} /></div></div>
          <div className="crossword-grid" style={{ gridTemplateColumns: `repeat(${puzzle.size}, 1fr)` }}>
            {puzzle.cells.map((row, rowIndex) => row.map((cell, colIndex) => {
              const key = cellKey(rowIndex, colIndex)
              if (!cell.solution) return <span className="black-cell" key={key} aria-hidden="true" />
              const isActive = active.row === rowIndex && active.col === colIndex
              const inWord = activePlacement && coordinates(activePlacement).some((coordinate) => coordinate.row === rowIndex && coordinate.col === colIndex)
              const isWrong = checked.has(key) && answers[key] && answers[key] !== cell.solution
              const isRight = checked.has(key) && answers[key] === cell.solution
              return (
                <label className={`grid-cell ${inWord ? 'in-word' : ''} ${isActive ? 'active' : ''} ${isWrong ? 'wrong' : ''} ${isRight ? 'right' : ''}`} key={key}>
                  {cell.number && <span className="cell-number">{cell.number}</span>}
                  <input
                    ref={(element) => { inputRefs.current[key] = element }}
                    value={answers[key] ?? ''}
                    maxLength={1}
                    aria-label={`Row ${rowIndex + 1}, column ${colIndex + 1}${cell.number ? `, clue ${cell.number}` : ''}`}
                    onFocus={() => selectCell(rowIndex, colIndex)}
                    onClick={() => selectCell(rowIndex, colIndex, true)}
                    onChange={(event) => enterLetter(rowIndex, colIndex, event.target.value)}
                    onKeyDown={(event) => handleKey(event, rowIndex, colIndex)}
                  />
                </label>
              )
            }))}
          </div>

          {activePlacement && (
            <button className="current-clue" onClick={() => selectClue(activePlacement)}>
              <span>{activePlacement.number} {activePlacement.direction === 'across' ? 'A' : 'D'}</span>
              <strong>{activePlacement.clue}</strong>
              <ChevronRight size={18} />
            </button>
          )}

          <div className="game-controls">
            <button onClick={checkPuzzle}><CheckCircle2 size={17} /> Check</button>
            <button onClick={revealWord}><Lightbulb size={17} /> Reveal word</button>
            <button onClick={restart}><RotateCcw size={17} /> Start over</button>
          </div>
          <p className="keyboard-tip">Tip: use arrow keys to move. Press space on a crossing square to switch direction.</p>
        </section>

        <aside className="clues-card">
          <div className="clues-heading"><div><span className="step-kicker">Your clues</span><h2>Keep the thread</h2></div><span>{filled}/{whiteCells.length}</span></div>
          <ClueGroup title="Across" clues={across} activeId={activePlacement?.id} answers={answers} puzzle={puzzle} onSelect={selectClue} />
          <ClueGroup title="Down" clues={down} activeId={activePlacement?.id} answers={answers} puzzle={puzzle} onSelect={selectClue} />
        </aside>
      </div>

      {solved && !completionDismissed && (
        <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="complete-title">
          <div className="complete-card">
            <button className="modal-close" onClick={() => setCompletionDismissed(true)} aria-label="Close"><X /></button>
            <div className="complete-burst"><Sparkles /></div>
            <span className="step-kicker">Puzzle complete</span>
            <h2 id="complete-title">That satisfying little click.</h2>
            <p>You solved <strong>{puzzle.title}</strong> in {formatTime(seconds)}.</p>
            <div className="complete-stats"><span><strong>{puzzle.placements.length}</strong> clues</span><span><strong>{puzzle.size}×{puzzle.size}</strong> grid</span><span><strong>{formatTime(seconds)}</strong> time</span></div>
            <button className="primary-button" onClick={restart}><RefreshCw size={17} /> Play it again</button>
          </div>
        </div>
      )}
    </main>
  )
}

interface ClueGroupProps {
  title: string
  clues: Placement[]
  activeId?: string
  answers: Record<string, string>
  puzzle: Puzzle
  onSelect: (placement: Placement) => void
}

function ClueGroup({ title, clues, activeId, answers, puzzle, onSelect }: ClueGroupProps) {
  const completed = (placement: Placement) => Array.from({ length: placement.answer.length }, (_, index) => {
    const row = placement.row + (placement.direction === 'down' ? index : 0)
    const col = placement.col + (placement.direction === 'across' ? index : 0)
    return answers[`${row}-${col}`] === puzzle.cells[row][col].solution
  }).every(Boolean)
  return (
    <section className="clue-group">
      <h3>{title}</h3>
      {clues.map((clue) => (
        <button className={`${activeId === clue.id ? 'active' : ''} ${completed(clue) ? 'done' : ''}`} key={clue.id} onClick={() => onSelect(clue)}>
          <span>{completed(clue) ? <Check size={13} /> : clue.number}</span>
          <p>{clue.clue}<small>{clue.answer.length} letters</small></p>
        </button>
      ))}
    </section>
  )
}

export default App
