import type { SourceEntry } from '../types'

export const sampleText = `A History of the Public Houses of Collingham, Nottinghamshire.
Collingham is situated on the River Fleet, six miles north-east of Newark-on-Trent. The Royal Oak has been an important part of the village since at least 1803 and operated as a coaching inn. When the Midland Railway station opened in 1846, the Royal Oak adopted the additional identity Railway Hotel. White's Directory of 1853 names James Hoe as proprietor and notes excellent stables and a roomy coach house.
The Kings Head on High Street and the Grey Horse Inn on Low Street gave Collingham three public houses. The Grey Horse was associated with Home Brewery and later Everards Brewery. A 1950s Tudor Revival refurbishment created a distinctive interior. It closed in January 2020 and was converted to housing in 2021.
The Kings Head now incorporates the Rose Orchard Chinese Restaurant. The Royal Oak is operated by Collingham Community Pub Ltd and was registered as an Asset of Community Value in September 2023. As of June 2026, the Royal Oak and Kings Head remain active.`

const entries: Array<[string, string]> = [
  ['COLLINGHAM', 'Nottinghamshire village at the heart of this history'],
  ['ROYALOAK', 'Community-owned pub documented from at least 1803'],
  ['GREYHORSE', 'Low Street inn that closed in January 2020'],
  ['RAILWAY', 'Transport link that reached the village in 1846'],
  ['EVERARDS', 'Leicester brewer that later owned the Grey Horse'],
  ['NEWARK', 'Nearby market town, six miles to the south-west'],
  ['LINCOLN', 'City twelve miles to the north-east'],
  ['STABLES', 'Described as “excellent” in White’s 1853 Directory'],
  ['COACHING', 'The Royal Oak’s original type of inn'],
  ['VICTORIAN', 'Era in which the village’s three-pub trade flourished'],
  ['CAMRA', 'Organisation that recorded the Grey Horse’s closure'],
  ['TUDOR', 'Revival style used in the Grey Horse refurbishment'],
  ['FLEET', 'River on which Collingham is situated'],
  ['HOE', 'Surname of Royal Oak proprietor James'],
  ['ALES', 'Traditional drinks still served at the village pubs'],
  ['KING', 'Royal title in the name of the High Street pub'],
  ['HOME', 'Nottingham brewery once tied to the Grey Horse'],
  ['OAK', 'Tree in the name of Collingham’s community pub'],
  ['INN', 'A house offering refreshment and overnight accommodation'],
  ['PUB', 'Short name for a public house'],
  ['BAR', 'The drinks-serving part of a public house'],
]

export const sampleEntries: SourceEntry[] = entries.map(([answer, clue], index) => ({
  id: `sample-${index}`,
  answer,
  clue,
  selected: true,
  sourceName: 'Collingham pub history — included example',
}))
