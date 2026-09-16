import { mkdirSync, writeFileSync } from 'node:fs'
import { buildPuzzle } from '../src/lib/crossword'
import { sampleEntries } from '../src/data/sample'

const puzzle = buildPuzzle(sampleEntries, 5, 'The workshop', 'Included Collingham example')
const scaffold = [105, 568].map((x) => `<g stroke="#82afa0" stroke-width="3" fill="none" opacity=".6"><path d="M${x} 137v320m52-320v320"/>${[157,257,357,447].map((y) => `<path d="M${x-12} ${y}h76m-64 0 52 90m0-90-52 90"/>`).join('')}<path d="M${x-10} 459h75" stroke-width="7"/></g>`).join('')
const cells = puzzle.cells.flatMap((line, row) => line.map((cell, col) => {
  const x = 222 + col * 52, y = 152 + row * 52
  if (!cell.solution) return `<rect x="${x}" y="${y}" width="50" height="50" rx="2" fill="#173d3b" stroke="#4d7771" stroke-width=".5"/>`
  const index = row * 5 + col
  return `<g class="tile" style="--delay:${index * .075}s" transform="translate(${x} ${y})"><rect width="50" height="50" rx="2" fill="#f8f1e1"/><rect x="1" y="1" width="48" height="48" rx="1" fill="none" stroke="#e2d7bd"/>${cell.number ? `<text x="5" y="12" fill="#48615b" font-size="9" font-family="Arial,sans-serif">${cell.number}</text>` : ''}<text class="letter" x="25" y="37" text-anchor="middle" fill="#133c35" font-size="25" font-weight="700" font-family="Arial,sans-serif">${cell.solution}</text></g>`
})).join('')
const art = `<defs><pattern id="blueprint" width="28" height="28" patternUnits="userSpaceOnUse"><path d="M28 0H0V28" fill="none" stroke="#a0bcb0" stroke-width=".5" opacity=".13"/></pattern><linearGradient id="night" x2="1" y2="1"><stop stop-color="#102e2d"/><stop offset="1" stop-color="#1b4940"/></linearGradient></defs>
<style>.tile{animation:assemble 9s ease both infinite;animation-delay:var(--delay)}.letter{animation:letter 9s ease both infinite;animation-delay:var(--delay)}@keyframes assemble{0%,5%{opacity:0;translate:0 -18px}18%,90%{opacity:1;translate:0 0}100%{opacity:0;translate:0 0}}@keyframes letter{0%,23%{opacity:0}35%,94%{opacity:1}100%{opacity:0}}@media(prefers-reduced-motion:reduce){.tile,.letter{animation:none}}</style>
<rect width="780" height="520" rx="18" fill="url(#night)"/><rect width="780" height="520" rx="18" fill="url(#blueprint)"/>
<text x="35" y="42" fill="#cce1d4" font-size="11" letter-spacing="3" font-family="monospace">THE CROSSWORD WORKSHOP</text><text x="35" y="65" fill="#83b0a0" font-size="9" letter-spacing="1.3" font-family="monospace">STORIES → WORDS → CONNECTIONS</text>
<path d="M45 464H735" stroke="#9bbbab" opacity=".5"/>
${scaffold}
<g fill="none" stroke="#f2bb64" stroke-width="3"><path d="M652 443V70H386m266 0h82M652 70l-45 50H402m250-50 45 50h38M636 130h32v310M636 155l32 45-32 45 32 45-32 45 32 45-32 45"/><path d="M385 70h349v18H385zM404 70l22 18 22-18 22 18 22-18 22 18 22-18 22 18 22-18 22 18 22-18 22 18 22-18" stroke-width="1.5"/><path d="M490 90v27m-10 0h20m-10 0v16q0 10 10 10" stroke-width="2"/></g>
<rect x="626" y="443" width="53" height="19" rx="2" fill="#eab868"/>
<rect x="215" y="144" width="270" height="275" rx="4" fill="#081c1b" opacity=".55"/>
${cells}
<path d="M222 435h258M206 152v258" stroke="#80b1a3" stroke-width="1" stroke-dasharray="3 5"/><text x="310" y="450" fill="#97b9ad" font-size="9" letter-spacing="2" font-family="monospace">FITTING TOGETHER</text>
<g transform="translate(63 373) rotate(-8)"><rect width="104" height="72" rx="3" fill="#f6eedc"/><path d="M14 20h66m-66 11h75m-75 11h46m-46 11h65" stroke="#869d8b" stroke-width="2"/><rect x="66" y="42" width="22" height="8" fill="#eeb166"/></g>
<g transform="translate(475 425)"><rect width="55" height="34" rx="2" fill="#e8b160"/><text x="27" y="24" text-anchor="middle" font-size="21" font-weight="700" fill="#263e34" font-family="Arial,sans-serif">?</text></g>
<g stroke="#ebbd77" stroke-width="4" fill="none"><path d="M168 438h35m-24-9 17 17m-22 0 19-17"/></g>
<text x="35" y="496" fill="#cce1d4" font-size="10" letter-spacing="2" font-family="monospace">A LITTLE WORDPLAY.</text><text x="745" y="496" text-anchor="end" fill="#eec985" font-size="10" letter-spacing="2" font-family="monospace">BY LOZ KNOWLES</text>`
mkdirSync('public', { recursive: true })
writeFileSync('public/crossword-workshop.svg', `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 780 520" role="img" aria-labelledby="title desc"><title id="title">The Crossword Workshop</title><desc id="desc">A crane and scaffolding assemble a numbered crossword from the included Collingham puzzle.</desc>${art}</svg>\n`)
writeFileSync('public/github-hero.svg', `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1400 530" role="img" aria-labelledby="title"><title id="title">Crossword Studio: stories in, crosswords out.</title><rect width="1400" height="530" rx="18" fill="#f7f2e9"/><text x="56" y="80" fill="#176b63" font-size="14" letter-spacing="3" font-family="Arial,sans-serif">CROSSWORD STUDIO</text><text x="50" y="176" fill="#23312d" font-family="Georgia,serif" font-size="69">Stories in.</text><text x="50" y="250" fill="#b44f34" font-family="Georgia,serif" font-style="italic" font-size="63">Crosswords out.</text><text x="56" y="317" fill="#52665e" font-size="20" font-family="Arial,sans-serif">Bring a document. Follow a rabbit hole.</text><text x="56" y="350" fill="#52665e" font-size="20" font-family="Arial,sans-serif">Build something worth solving.</text><text x="56" y="430" fill="#176b63" font-family="Arial,sans-serif" font-size="15" letter-spacing="1">DOCUMENTS + WEB ARTICLES</text><text x="56" y="460" fill="#176b63" font-family="Arial,sans-serif" font-size="15" letter-spacing="1">PLAY ONLINE / DOWNLOAD A PDF</text><svg x="620" y="5" width="780" height="520" viewBox="0 0 780 520">${art}</svg></svg>\n`)
console.log('Created website and GitHub hero artwork from a validated 5×5 crossword.')
