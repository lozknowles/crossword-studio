# Collingham source alignment

Reviewed 16 September 2026 against `lozknowles/LocalWalks` main at
`9fca683d922a766bf2d4301bc2b53e168335564f`. This is the source reference;
it is not a claim that this commit was deployed on Collingham.org.

| Upstream file | Git blob | Use here |
| --- | --- | --- |
| `src/data/footnotesCrossword.ts` | `47353bbeb698b435efaee44763c6ecaba6215af1` | Byte-for-byte copy at `src/collingham/footnotesCrossword.ts` |
| `src/components/FootnotesCrossword.tsx` | `bf21cf856a8333de0b7d58523030eda6e0e4fdd9` | Adapted keyboard movement, clue ordering, pointer behaviour, temporary hints and fullscreen in `src/Solver.tsx` and `src/lib/navigation.ts` |
| `src/lib/footnotesProgress.ts` | `e179a37264955ae70227a02bc5d222fabca00a44` | Adapted defensive progress validation in `src/lib/storage.ts`; standalone storage includes the generated puzzle |

The unchanged builder imports portable record types supplied by `src/types.ts`.
The stricter standalone validator also checks every full letter run, connectivity,
numbering, per-cell references and required source metadata. The layout search,
document extraction, public-article reader, construction artwork and PDF export
are standalone features. Collingham authentication, publication and puzzle-library
services are not copied or changed.

For a future sync, fetch current main, compare all three upstream files, preserve
the original core file and record the new commit/blobs here. Run the complete
grid, navigation, storage and PDF tests after adapting behavioural differences.
