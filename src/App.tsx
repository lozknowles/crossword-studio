import { useRef, useState } from 'react'
import { ArrowUpRight, BookOpen, Check, ChevronRight, FileText, Grid2X2, Link, LoaderCircle, Plus, Trash2, UploadCloud, WandSparkles, X } from 'lucide-react'
import { sampleEntries, sampleText } from './data/sample'
import featuredData from './data/featured.json'
import { buildPuzzle } from './lib/crossword'
import { cleanAnswer, extractEntries } from './lib/extract'
import { readArticle, readDocument, validateText } from './lib/documents'
import { clearSession, loadSession, saveSession } from './lib/storage'
import { validatePuzzle } from './lib/validate'
import Solver from './Solver'
import type { Puzzle, SourceDocument, SourceEntry } from './types'

const sample: SourceDocument = { name: 'Collingham pub history — included example', text: sampleText, kind: 'sample' }
validatePuzzle(featuredData)
const featured: Puzzle = featuredData

function App() {
  const [restored] = useState(loadSession)
  const [puzzle, setPuzzle] = useState<Puzzle | null>(restored?.puzzle ?? null)
  const [screen, setScreen] = useState<'builder' | 'solver'>(restored ? 'solver' : 'builder')
  const [size, setSize] = useState<5 | 10>(10)
  const [title, setTitle] = useState('Collingham: A Pub History')
  const [source, setSource] = useState<SourceDocument>(sample)
  const [entries, setEntries] = useState<SourceEntry[]>(sampleEntries)
  const [inputKind, setInputKind] = useState<'document' | 'url' | 'text'>('document')
  const [url, setUrl] = useState('')
  const [pastedText, setPastedText] = useState('')
  const [busy, setBusy] = useState('')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [dragging, setDragging] = useState(false)
  const requestId = useRef(0)
  const controller = useRef<AbortController | null>(null)
  const upload = useRef<HTMLInputElement>(null)
  const importFile = useRef<HTMLInputElement>(null)
  const selected = entries.filter((entry) => entry.selected && cleanAnswer(entry.answer).length >= 2 && cleanAnswer(entry.answer).length <= size)

  const applySource = (next: SourceDocument) => {
    setSource(next)
    setTitle(next.name.replace(/\.(pdf|docx|txt|md)$/i, '').replace(/[_]/g, ' ').slice(0, 120))
    const found = extractEntries(next.text, size, next.name, next.url)
    setEntries(found); setMessage(`${found.length} suggested answers are ready to review.`)
    if (found.length < 2) setError('We could not find enough suitable English words. Try a longer extract, or add your own answers below.')
  }
  const readSource = async (read: (signal: AbortSignal) => Promise<SourceDocument>) => {
    const id = ++requestId.current
    controller.current?.abort()
    const active = new AbortController(); controller.current = active
    setBusy('Reading your source…'); setError(''); setMessage('')
    const timeout = window.setTimeout(() => active.abort(), 30000)
    try { const result = await read(active.signal); if (requestId.current === id) applySource(result) }
    catch (caught) { if (requestId.current === id) setError(active.signal.aborted ? 'Reading took too long. Try a shorter document or paste the text.' : caught instanceof Error ? caught.message : 'This source could not be read.') }
    finally { window.clearTimeout(timeout); if (requestId.current === id) setBusy('') }
  }
  const onFile = (file?: File) => { if (file) void readSource(() => readDocument(file)) }
  const cancel = () => { requestId.current++; controller.current?.abort(); setBusy(''); setMessage('Import cancelled.') }
  const useSample = () => {
    setSource(sample); setTitle('Collingham: A Pub History')
    setEntries(sampleEntries.map((entry) => ({ ...entry, selected: entry.answer.length <= size })))
    setError(''); setMessage('Collingham example loaded.')
  }
  const updateEntry = (id: string, patch: Partial<SourceEntry>) => setEntries((current) => current.map((entry) => entry.id === id ? { ...entry, ...patch } : entry))
  const playFeatured = () => {
    if (loadSession()?.puzzle.id !== featured.id) saveSession({ puzzle: featured, answers: {}, seconds: 0, hintsUsed: 0 })
    setPuzzle(featured); setScreen('solver'); window.scrollTo({ top: 0, behavior: 'instant' })
  }
  const generate = async () => {
    setBusy('Fitting your words together…'); setError('')
    await new Promise((resolve) => window.setTimeout(resolve, 30))
    try {
      const next = buildPuzzle(entries, size, title, source.name)
      saveSession({ puzzle: next, answers: {}, seconds: 0, hintsUsed: 0 })
      setPuzzle(next); setScreen('solver'); window.scrollTo({ top: 0, behavior: 'instant' })
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'The crossword could not be built.') }
    finally { setBusy('') }
  }
  const importPuzzle = async (file?: File) => {
    if (!file) return
    try {
      if (file.size > 250000) throw new Error('This puzzle file is too large.')
      const next: unknown = JSON.parse(await file.text()); validatePuzzle(next)
      saveSession({ puzzle: next, answers: {}, seconds: 0, hintsUsed: 0 })
      setPuzzle(next); setScreen('solver'); setError('')
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'This puzzle file could not be opened.') }
  }

  return <div className="app-shell">
    <header className="topbar">
      <a className="site-mark" href="https://www.lozknowles.com/" aria-label="Lawrence Knowles home">LK<span>•</span></a>
      <button className="brand" onClick={() => setScreen('builder')}><span className="brand-mark"><Grid2X2 size={20} /></span><span>Crossword <strong>Studio</strong></span></button>
      <nav className="topnav" aria-label="Crossword navigation"><button className={screen === 'builder' ? 'active' : ''} onClick={() => setScreen('builder')}>Build</button><button className={screen === 'solver' ? 'active' : ''} disabled={!puzzle} onClick={() => setScreen('solver')}>Solve</button></nav>
      <a className="project-link" href="https://github.com/lozknowles/generic-crossword-builder">GitHub <ArrowUpRight size={14} /></a>
    </header>
    {screen === 'solver' && puzzle ? <Solver key={puzzle.id} puzzle={puzzle} onBack={() => setScreen('builder')} /> : <main>
      <section className="hero workshop-hero">
        <div className="hero-copy"><div className="eyebrow">A LITTLE WORDPLAY / BY LOZ KNOWLES</div><h1>Good stories.<br /><em>New connections.</em></h1><p>Turn a document or a web article into a crossword. Shape the clues, fit the words together, then solve it online or take it to paper.</p><div className="hero-points"><span>01 / Bring a story</span><span>02 / Build a puzzle</span><span>03 / Enjoy the aha!</span></div></div>
        <div className="workshop-art"><img src={`${import.meta.env.BASE_URL}crossword-workshop.svg`} alt="Scaffolding and a crane assembling numbered crossword squares, with words being fitted into the grid." /><span className="art-caption"><i /> WORDS UNDER CONSTRUCTION</span></div>
      </section>
      <section className="featured-puzzle" aria-labelledby="featured-title">
        <div className="featured-grid" aria-hidden="true">{featured.cells.flat().map((cell, i) => <span key={i} className={cell.solution ? '' : 'blocked'}>{cell.number ?? ''}</span>)}</div>
        <div><span className="step-kicker">READY TO PLAY / 10 × 10 / {featured.placements.length} CLUES</span><h2 id="featured-title">A little of Loz’s world.</h2><p>Arcade games, curious minds and things with wings. A hand-crafted crossword about nature, technology and the things that keep me looking up.</p><button className="small-primary" onClick={playFeatured}>{puzzle?.id === featured.id ? 'Continue Loz’s world' : 'Play Loz’s world'} <ChevronRight size={17} /></button></div>
        <span className="featured-note">No building required.<br />Just bring your curiosity.</span>
      </section>
      <section className="studio" aria-label="Crossword builder">
        <div className="studio-progress"><span>THE WORKSHOP</span><p>Inspired by the crosswords at <a href="https://www.collingham.org/?footnotes=1">Collingham.org ↗</a></p></div>
        <div className="builder-layout"><div className="builder-main">
          <article className="panel source-panel" aria-busy={!!busy}>
            <div className="panel-heading"><div><span className="step-kicker">01 / The raw material</span><h2>Bring your story</h2></div><BookOpen size={23} /></div>
            <div className="source-tabs" role="group" aria-label="Source type">{(['document', 'url', 'text'] as const).map((kind) => <button key={kind} aria-pressed={inputKind === kind} disabled={!!busy} onClick={() => setInputKind(kind)}>{kind === 'document' ? 'Document' : kind === 'url' ? 'Web page' : 'Paste text'}</button>)}</div>
            {inputKind === 'document' && <><input ref={upload} className="visually-hidden" type="file" aria-label="Upload source document" accept=".pdf,.docx,.txt,.md" disabled={!!busy} onChange={(event) => { onFile(event.target.files?.[0]); event.target.value = '' }} /><button className={`dropzone ${dragging ? 'dragging' : ''}`} disabled={!!busy} onClick={() => upload.current?.click()} onDragOver={(event) => { event.preventDefault(); setDragging(true) }} onDragLeave={() => setDragging(false)} onDrop={(event) => { event.preventDefault(); setDragging(false); if (!busy) onFile(event.dataTransfer.files?.[0]) }}><span className="upload-icon"><UploadCloud /></span><span><strong>Drop a document here, or browse</strong><small>PDF, Word (.docx), TXT or Markdown · up to 20 MB</small></span></button><p className="source-note">Documents are read on your device. PDFs need selectable text; image-only scans need OCR first.</p></>}
            {inputKind === 'url' && <form onSubmit={(event) => { event.preventDefault(); void readSource((signal) => readArticle(url, signal)) }}><label className="field-label" htmlFor="article-url">Public article URL</label><div className="url-row"><input id="article-url" className="title-input" type="url" placeholder="https://en.wikipedia.org/wiki/Starling" value={url} maxLength={2000} required disabled={!!busy} onChange={(event) => setUrl(event.target.value)} /><button className="small-primary" disabled={!!busy}><Link size={16} /> Read article</button></div><p className="source-note">Try Wikipedia or another public article. The page is fetched through this site; sign-in pages and paywalls cannot be read.</p></form>}
            {inputKind === 'text' && <form onSubmit={(event) => { event.preventDefault(); void readSource(async () => ({ name: 'Pasted text', text: validateText(pastedText), kind: 'text' })) }}><label className="field-label" htmlFor="source-text">A few paragraphs of English text</label><textarea id="source-text" value={pastedText} maxLength={180000} disabled={!!busy} onChange={(event) => setPastedText(event.target.value)} placeholder="A story, a lesson, something you have been reading…" rows={6} required /><button className="small-primary" disabled={!!busy}>Find words & clues <ChevronRight size={16} /></button></form>}
            <div className="source-feedback" aria-live="polite">{busy ? <><LoaderCircle className="spin" size={16} /> {busy}{busy.startsWith('Reading') && <button onClick={cancel}>Cancel</button>}</> : message}</div>
            {error && <div className="error-message" role="alert"><X size={16} />{error}</div>}
            <button className="sample-card" onClick={useSample} disabled={!!busy}><span className="sample-icon"><BookOpen size={20} /></span><span className="sample-copy"><strong>Take a stroll through Collingham’s pub history</strong><small>Try the included example</small></span><ChevronRight size={17} /></button>
            <div className="file-summary"><FileText size={18} /><div><strong>{source.name}</strong><small>{source.pages ? `${source.pages} pages · ` : ''}{source.kind === 'url' ? 'Public web article' : source.kind === 'sample' ? 'Included example' : 'Processed on your device'}</small></div></div>
          </article>
          <article className="panel clue-panel"><div className="panel-heading"><div><span className="step-kicker">02 / Shape the pieces</span><h2>Make the clues your own</h2></div><span className="entry-count">{selected.length} selected</span></div><p className="panel-intro">Suggested clues use sentences from your source with the answer blanked out. Edit them for a more traditional crossword, or add your own. Review before building.</p>
            <div className="entry-list"><div className="entry-list-head"><span>Use</span><span>Answer</span><span>Clue</span><span /></div>{entries.map((entry) => {
              const length = cleanAnswer(entry.answer).length, tooLong = length > size
              return <div className={`entry-row ${tooLong ? 'too-long' : ''}`} key={entry.id}>
                <label className="check-control"><input type="checkbox" checked={entry.selected && !tooLong} disabled={tooLong || !!busy} onChange={(event) => updateEntry(entry.id, { selected: event.target.checked })} aria-label={`Use ${entry.answer || 'new answer'}`} /><span><Check size={12} /></span></label>
                <div className="answer-field"><input value={entry.answer} maxLength={30} disabled={!!busy} onChange={(event) => updateEntry(entry.id, { answer: event.target.value.toUpperCase() })} placeholder="ANSWER" aria-label={`Answer ${entry.id}`} /><small className={tooLong ? 'warning' : ''}>{length}/{size}</small></div>
                <textarea className="clue-input" value={entry.clue} maxLength={300} disabled={!!busy} rows={2} onChange={(event) => updateEntry(entry.id, { clue: event.target.value })} placeholder="Write a clue…" aria-label={`Clue for ${entry.answer || 'new answer'}`} />
                <button className="icon-button" disabled={!!busy} onClick={() => setEntries((current) => current.filter((item) => item.id !== entry.id))} aria-label={`Delete ${entry.answer}`}><Trash2 size={16} /></button>
                <details className="entry-source"><summary>Source: {entry.sourceName}</summary>{entry.sourceText && <p>{entry.sourceText}</p>}{entry.sourceUrl && <a href={entry.sourceUrl} target="_blank" rel="noreferrer">Read original article ↗</a>}</details>
              </div>
            })}</div><button className="text-button" disabled={!!busy || entries.length >= 80} onClick={() => setEntries((current) => [...current, { id: crypto.randomUUID(), answer: '', clue: '', selected: true, sourceName: 'Your own clue' }])}><Plus size={16} /> Add your own answer</button>
          </article>
        </div><aside className="builder-sidebar">
          <article className="panel settings-panel"><span className="step-kicker">03 / Fit it together</span><h2>Your next crossword</h2><label className="field-label" htmlFor="puzzle-title">Puzzle title</label><input id="puzzle-title" className="title-input" value={title} maxLength={120} disabled={!!busy} onChange={(event) => setTitle(event.target.value)} /><span className="field-label">Grid size</span><div className="size-picker">{([5, 10] as const).map((value) => <button key={value} aria-pressed={size === value} className={size === value ? 'active' : ''} disabled={!!busy} onClick={() => { setSize(value); setError('') }}><Grid2X2 /><span><strong>{value} × {value}</strong><small>{value === 5 ? 'A quick puzzle' : 'Room to explore'}</small></span></button>)}</div><p className="setup-note">{selected.length} answers fit this size. We’ll use the best connected set and tell you which words didn’t fit.</p><button className="primary-button" disabled={!!busy || selected.length < 2} onClick={() => void generate()}>{busy.startsWith('Fitting') ? <LoaderCircle className="spin" size={18} /> : <WandSparkles size={18} />} Build my crossword <ChevronRight size={18} /></button><p className="button-note">Play online · Download PDF · No account needed</p></article>
          <article className="tip-card"><div><strong>A little editorial licence</strong><p>Specific clues and a mix of short and long answers make a better puzzle. The original sentences are there to help you check the facts.</p></div></article>
          <div className="saved-options"><input ref={importFile} type="file" className="visually-hidden" accept=".json" aria-label="Open saved crossword" onChange={(event) => { void importPuzzle(event.target.files?.[0]); event.target.value = '' }} /><button onClick={() => importFile.current?.click()}>Open a saved puzzle</button>{puzzle && <button onClick={() => { clearSession(); setPuzzle(null); setMessage('Saved crossword and progress cleared from this device.') }}>Clear saved puzzle</button>}</div>
        </aside></div>
      </section>
      <section className="how-it-works" id="how-it-works"><span className="step-kicker">From a story to a satisfying Sunday</span><h2>Some things are better in squares.</h2><div className="how-grid"><div><strong>Bring something interesting</strong><p>A local story, a lesson, a favourite Wikipedia rabbit hole. Documents stay on your device; web pages are read on request.</p></div><div><strong>Give it your voice</strong><p>Review the suggested answers, shape the clues and choose a quick 5 × 5 or a roomier 10 × 10.</p></div><div><strong>Make a little time for play</strong><p>Solve with hints and saved progress, download a clean PDF, or save the puzzle file to send to a friend.</p></div></div></section>
    </main>}
    <footer className="site-footer"><a href="https://www.lozknowles.com/">Lawrence Knowles</a><span>Curiosity, with a few words crossed.</span><a href="https://github.com/lozknowles/generic-crossword-builder">Explore the code ↗</a></footer>
  </div>
}
export default App
