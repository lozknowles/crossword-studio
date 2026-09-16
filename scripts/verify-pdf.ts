import { mkdirSync, writeFileSync } from 'node:fs'
import { createPuzzlePdf } from '../src/lib/exportPdf'
import { buildPuzzle } from '../src/lib/crossword'
import { sampleEntries } from '../src/data/sample'
import featured from '../src/data/featured.json'
import { validatePuzzle } from '../src/lib/validate'

const output = process.argv[2]
if (!output) throw new Error('Provide an output directory for PDF review files.')
mkdirSync(output, { recursive: true })
validatePuzzle(featured)
writeFileSync(`${output}/lozs-world.pdf`, await createPuzzlePdf(featured, true))
writeFileSync(`${output}/quick-puzzle.pdf`, await createPuzzlePdf(buildPuzzle(sampleEntries, 5, 'A little Collingham crossword', 'Included example')))
