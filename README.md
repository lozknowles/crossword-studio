![Crossword Studio: a crossword taking shape inside scaffolding](public/github-hero.svg)

# Crossword Studio

**Good stories. New connections.** Turn a document or a public article into a crossword, shape the clues, and solve it online or take it to paper.

**[Open the studio on lozknowles.com](https://www.lozknowles.com/crossword/)** · [GitHub Pages edition](https://lozknowles.github.io/crossword-studio/) · [Collingham.org](https://www.collingham.org/)

Or start with **Loz’s world**: a ready-to-play, 14-clue crossword about arcade games, nature, bird flight and technology. Expect a little Pac-Man, a little murmuration, and a few things that need compiling.

## From raw material to wordplay

1. **Bring a story.** Choose a PDF, Word document, text file, pasted text or public article URL, such as Wikipedia.
2. **Shape the pieces.** Review suggested answers and source-sentence clues; edit or write your own. Choose an exact 5 × 5 or 10 × 10 grid.
3. **Fit it together.** The builder finds a connected set, checks every visible letter run, and tells you which selected words did not fit.
4. **Enjoy the aha.** Solve with keyboard or touch, check letters, take a two-second hint, and resume saved progress. Download an A4 PDF with an optional separate answer key, print, or share a puzzle JSON file.

The illustrated header builds an actual valid crossword inside a miniature scaffold. It respects reduced-motion preferences. The wide GitHub banner and website artwork are generated from the same code: `pnpm hero`.

## The Collingham connection

This version consolidates the grid and solver improvements from the current Collingham Footnotes source, pinned to LocalWalks commit [`9fca683`](https://github.com/lozknowles/LocalWalks/commit/9fca683d922a766bf2d4301bc2b53e168335564f):

- The unchanged Collingham grid builder checks cells used by the standalone validator.
- Every answer needs a clue and named source; every visible multi-letter run needs exactly one clue.
- Across and Down clues are numbered and sorted; unused cells are black and playable cells white.
- The active clue sits directly beneath the grid. Spatial arrow navigation reaches every playable cell.
- Hints briefly show a word without replacing your saved letters; progress survives reloading.

See [source provenance](docs/COLLINGHAM-PROVENANCE.md) for exact files, hashes and the boundary between shared code and adapted behaviour.

## What happens to your material?

**Documents stay on your device.** PDF.js reads selectable PDF text, and the browser reads DOCX, TXT and Markdown. Files are limited to 20 MB; PDFs to 80 pages; extracted text to 180,000 characters. Scanned PDFs need OCR first. Old `.doc` files need saving as `.docx`.

**Article URLs go to this site’s article reader.** It fetches public HTML or text, without your cookies or sign-in, then returns the article text. The reader blocks private network addresses, rechecks and pins every redirect target, and limits response size, time, concurrency and request rate. It does not store submitted URLs or extracted text. Some sites require JavaScript, block automated reads or impose access restrictions; paste text you can access in those cases.

Suggested clues are **editable source sentences with a word blanked out**, not AI-written cryptic clues. English alphabetic answers are supported. Review clues before sharing; the source excerpt and original URL remain available for checking.

Only your most recent puzzle, its clue excerpts and solving progress are kept in local browser storage. “Clear saved puzzle” removes that saved session. Puzzle JSON contains answers so another person can open and solve it; it is not a secret answer format. A blank PDF does not contain the answer key unless you choose it.

## Run locally

Requires Node.js **22.18+**, pnpm **11.19.0**, and Python **3.10+** for URL imports.

```sh
pnpm install --frozen-lockfile
pnpm dev --port 5184
```

In a second terminal, enable public article imports for that development origin:

```sh
python server/article_service.py --port 8793 --dev-origin http://127.0.0.1:5184
```

Documents, the prepared crossword and PDF downloads work without the article service. No API key or AI account is required.

## Check and publish

```sh
pnpm lint
pnpm test
python -m unittest discover -s server -v
pnpm build
pnpm build:website
pnpm exec tsx scripts/verify-pdf.ts /path/to/pdf-review
```

Render and inspect generated PDFs when changing their layout. Check document and Wikipedia imports, both grid sizes, keyboard navigation, temporary hints, progress after reload, and desktop/mobile layout.

The Pages workflow runs checks and publishes `main`. Its URL importer uses the public lozknowles.com reader. `pnpm build:website` produces the `/crossword/` edition with a same-origin reader. The website repository pins this builder’s exact commit and packages its browser output; Python service code is installed outside the public directory. See [deployment notes](docs/DEPLOYMENT.md).

## License

MIT
