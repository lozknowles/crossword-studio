# Crossword Studio

Crossword Studio turns a text-based or OCRed PDF into an editable, playable crossword. It runs entirely in the browser, so source PDFs are never uploaded to a server.

The included example is based on **A History of the Public Houses of Collingham, Nottinghamshire** and demonstrates the source-to-puzzle workflow for both supported grid sizes.

## Current status

The first complete browser application is available on the `codex/build-crossword-studio` branch and in draft PR #1. It currently provides:

- Local PDF text extraction with PDF.js
- Automatic answer and source-sentence clue suggestions
- Editable answers, clues, selection state, and puzzle title
- Deterministic 5x5 and 10x10 crossword generation
- Layout checks that prevent conflicts and invalid adjacent words
- Conventional black unused squares and playable answer cells
- Responsive online solving with Across/Down highlighting
- Mouse, touch, and four-direction arrow-key navigation
- Check, reveal, restart, timer, and local progress autosave
- Print layout and JSON puzzle export
- GitHub Pages deployment with no backend or API key

## Progress proven in the Collingham Footnotes integration

The builder work has also been exercised in the LocalWalks Footnotes crossword. That integration established the following requirements for generated and published puzzles:

- Every visible multi-letter run must map to a real Across or Down entry.
- Every entry must have a non-empty clue and a named source.
- Across and Down clues must be independently sorted by clue number.
- Unused cells are black; playable cells are white with black borders.
- The selected clue should appear directly beneath the grid.
- Left/Right and Up/Down navigation must work without a mouse and skip black squares.
- Grid, clue, source, print, desktop, and mobile behaviour need regression coverage.

The standalone app already implements the core generation, black-square grid, solver, and spatial keyboard navigation. Per-entry source metadata, strict publish-time validation, white-cell styling, and the under-grid active-clue treatment are the next items to consolidate from the Footnotes implementation.

## Run locally

Requires Node.js and pnpm 11.

```bash
pnpm install --frozen-lockfile
pnpm dev
```

Open the URL printed by Vite. Before publishing changes, run:

```bash
pnpm lint
pnpm build
pnpm preview
```

## How generation works

1. PDF.js extracts selectable text inside the browser.
2. The extractor ranks proper names and repeated terms, then creates editable fill-in-the-blank clues from their source sentences.
3. A deterministic multi-attempt layout engine places selected answers, favouring intersections and central positions.
4. Placement checks reject conflicts, same-direction overlaps, end-to-end touching, and accidental adjacent words.
5. Starts are numbered in reading order and the puzzle is handed to the interactive solver.

For reliable extraction, use PDFs with selectable text or run OCR before importing. Image-only scans do not contain text for the browser to extract.

## Data and privacy

PDF contents, answers, clues, and solver progress stay in the browser. Solver progress is stored in local storage. Exported puzzle JSON is only downloaded when the user requests it.

## Deployment

The included GitHub Actions workflow builds and deploys the site whenever `main` is pushed. In repository settings, choose **GitHub Actions** as the Pages source.

## Repository workflow

- Active implementation branch: `codex/build-crossword-studio`
- Draft pull request: `#1 Build privacy-first PDF crossword studio`
- Package manager: pnpm 11
- Required checks: `pnpm lint` and `pnpm build`

## License

MIT
