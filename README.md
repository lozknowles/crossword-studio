# Crossword Studio

Crossword Studio turns a text-based or OCRed PDF into an editable, playable crossword. It runs entirely in the browser: source PDFs are never uploaded to a server.

The included first-run example is based on **A History of the Public Houses of Collingham, Nottinghamshire**. Its curated clue set demonstrates the complete source-to-puzzle workflow for both supported grid sizes.

## Features

- Local PDF text extraction with PDF.js
- Automatic term and source-sentence clue suggestions
- Editable answers, clues, and puzzle title
- Exact 5×5 and 10×10 grid generation
- Responsive online solver with across/down highlighting
- Keyboard and touch-friendly play
- Check, reveal, restart, timer, and progress autosave
- Print layout and JSON puzzle export
- Static deployment with no backend or API key

## Run locally

```bash
pnpm install
pnpm dev
```

Open the URL printed by Vite. For a production build:

```bash
pnpm lint
pnpm build
pnpm preview
```

## How generation works

1. PDF.js extracts text inside the browser.
2. The extractor ranks proper names and repeated source terms, then turns their source sentences into editable fill-in-the-blank clues.
3. A deterministic multi-attempt layout engine places selected answers, favouring intersections and central positions while preventing invalid adjacent words.
4. The resulting puzzle is handed directly to the solver and saved locally as the player works.

For reliable clues, use PDFs with selectable text or run OCR before uploading. Image-only scans do not contain text for the browser to extract.

## Deploy to GitHub Pages

The included workflow builds and deploys the site whenever `main` is pushed. In the repository settings, choose **GitHub Actions** as the Pages source.

## Privacy

No PDF contents, answers, clues, or solver progress are transmitted by the application. Progress is stored in the browser's local storage.

## License

MIT
