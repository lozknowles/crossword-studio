---
name: generic-crossword-builder
description: Build, validate, and publish privacy-first browser crosswords generated from PDF source material in exact 5x5 or 10x10 grids.
license: MIT
compatibility: React, TypeScript, Vite, PDF.js, and pnpm 11.
metadata:
  version: "1.0"
  owner: "lozknowles"
  last_updated: "2026-07-11"
---

# Generic Crossword Builder

Use this skill when developing Crossword Studio, importing a PDF, generating a 5x5 or 10x10 puzzle, validating crossword structure, improving the solver, or publishing the static application.

## Project objective

Turn locally extracted PDF text into an editable crossword and an accessible online solver without uploading the source document or requiring a backend.

## Current implementation

The `codex/build-crossword-studio` branch contains the working React application. It includes:

- Browser-local PDF.js extraction
- Curated and automatically suggested answers and clues
- Deterministic multi-attempt layout generation
- Exact 5x5 and 10x10 grids
- Conflict, overlap, adjacency, and boundary checks
- Reading-order clue numbering
- Black unused squares
- Responsive mouse, touch, and arrow-key solving
- Check, reveal, restart, timer, print, autosave, and JSON export
- GitHub Pages deployment

The Collingham Footnotes deployment has additionally proven the need for per-entry sources, strict run validation, numerical clue ordering, white answer cells with black borders, and an active clue immediately beneath the grid. Treat those as required consolidation work for the standalone builder.

## Required workflow

1. Inspect `README.md`, `src/types.ts`, `src/lib/extract.ts`, `src/lib/crossword.ts`, `src/App.tsx`, and `src/styles.css` before changing behaviour.
2. Keep PDF processing local to the browser. Do not add an upload API unless explicitly requested.
3. Preserve exact `5 | 10` grid sizing.
4. Ensure every published answer has an answer, clue, direction, start coordinate, clue number, and human-readable source reference.
5. Validate the complete rendered grid, not only declared entries.
6. Run `pnpm lint` and `pnpm build` before committing.
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

- PDF extraction and sample loading
- Answer/clue editing
- Successful generation and failure messaging
- No accidental unclued runs
- Numerical Across/Down order
- Black unused and white playable cells
- Arrow-key navigation across the complete grid
- Active clue placement beneath the board
- Check, reveal, restart, timer, autosave, print, and JSON export
- Desktop and mobile layout without horizontal overflow

## Progress record

As of 11 July 2026:

- Initial standalone studio implemented and pushed.
- GitHub Pages workflow aligned with pnpm 11.
- Draft PR #1 open.
- Collingham Footnotes integration deployed to staging and used to identify stricter publishing and accessibility requirements.
- README and this skill updated to distinguish implemented standalone features from the next consolidation work.
