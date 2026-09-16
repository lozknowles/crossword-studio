---
name: generic-crossword-builder
description: Build, validate, and publish privacy-first browser crosswords generated from local documents or public articles in exact 5x5 or 10x10 grids.
license: MIT
compatibility: React, TypeScript, Vite, PDF.js, and pnpm 11.
metadata:
  version: "2.0"
  owner: "lozknowles"
  last_updated: "2026-09-16"
---

# Generic Crossword Builder

Use this skill when developing Crossword Studio, importing a PDF, generating a 5x5 or 10x10 puzzle, validating crossword structure, improving the solver, or publishing the static application.

## Project objective

Turn locally extracted PDF, DOCX or text and public article URLs into editable crosswords and an accessible online solver. Documents stay in the browser. URL imports use the bounded public-article reader. Include a prepared crossword and direct PDF download.

## Current implementation

The main branch provides local document extraction, a public URL reader, editable clues, exact 5x5 and 10x10 generation, strict whole-grid validation, per-entry sources, saved online solving, temporary hints, PDF/print/JSON export, and a curated themed crossword. The website and GitHub share a generated scaffolding hero.

The Collingham source comparison is pinned in `docs/COLLINGHAM-PROVENANCE.md`. Keep the copied core unchanged; adapt solver behaviour explicitly and record the upstream revision. Do not equate upstream main with a live Collingham release.

## Required workflow

1. Inspect `README.md`, `src/types.ts`, `src/lib/extract.ts`, `src/lib/crossword.ts`, `src/App.tsx`, and `src/styles.css` before changing behaviour.
2. Keep PDF processing local to the browser. Do not add an upload API unless explicitly requested.
3. Preserve exact `5 | 10` grid sizing.
4. Ensure every published answer has an answer, clue, direction, start coordinate, clue number, and human-readable source reference.
5. Validate the complete rendered grid, not only declared entries.
6. Run `pnpm lint`, `pnpm test`, Python service tests and `pnpm build` before committing.
7. Keep the GitHub Pages workflow compatible with pnpm 11.

## Crossword validity rules

A generated or imported puzzle is valid only when:

- Answers fit within the selected grid.
- Crossing letters agree.
- Two answers do not overlap in the same direction.
- Answers do not touch end-to-end.
- Non-crossing letters do not touch perpendicularly.
- Every horizontal or vertical run of two or more playable cells corresponds to exactly one clue.
- Every clue corresponds to exactly one placed answer.
- Every entry has a named source for its answer or clue.
- Across and Down lists are each sorted numerically.
- Unused cells render black and playable cells render white with black borders.

Never infer that a visually formed two-letter run is intentional. If it has no declared entry and clue, reject the layout.

## Solver accessibility rules

- All playable cells must be reachable by keyboard.
- Left/Right movement prefers Across entries; Up/Down prefers Down entries.
- Arrow navigation skips black and non-editable separator cells.
- Focus, active cell, active answer, and displayed clue stay synchronized.
- Show the selected clue directly beneath the grid so it remains visible while solving.
- Preserve accessible labels containing row and column information.
- Do not communicate correctness by colour alone.

## Source handling

- Prefer PDFs with selectable text; explain that image-only scans require OCR.
- Retain the source filename and source sentence or page reference for each proposed clue.
- Allow users to edit automatically generated answers and clues before layout.
- Do not claim a fact is sourced when the extracted text does not support it.
- Include source metadata in JSON exports.

## Verification checklist

Run:

```bash
pnpm install --frozen-lockfile
pnpm lint
pnpm build
```

Then verify both 5x5 and 10x10 puzzles:

- PDF, DOCX, text and public article extraction; prepared puzzle and sample loading
- Answer/clue editing
- Successful generation and failure messaging
- No accidental unclued runs
- Numerical Across/Down order
- Black unused and white playable cells
- Arrow-key navigation across the complete grid
- Active clue placement beneath the board
- Check, two-second hints, restart, timer, autosave, PDF, print and JSON export
- Desktop and mobile layout without horizontal overflow

## Publication boundary

Publish only built browser assets. The Python article reader stays outside the web root, binds to loopback, validates every DNS/redirect target and receives an overwritten client-IP header from the reverse proxy. Retain request, response, time and concurrency limits. Never add private-network fetching or document upload by inference.

See `docs/DEPLOYMENT.md` for website and GitHub Pages deployment. Render PDF output and inspect it visually after layout changes. Keep README capabilities and the pinned website source revision current.
