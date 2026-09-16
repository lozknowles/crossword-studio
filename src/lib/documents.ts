import type { SourceDocument } from '../types'

export const MAX_FILE_BYTES = 20 * 1024 * 1024
export const MAX_TEXT_LENGTH = 180000

export function validateText(text: string): string {
  const cleaned = text.split(String.fromCharCode(0)).join('').trim()
  if (cleaned.length < 120) throw new Error('Please use a few paragraphs of text so there are enough words and clues to choose from.')
  if (cleaned.length > MAX_TEXT_LENGTH) throw new Error('Please use a shorter extract (up to 180,000 characters).')
  return cleaned
}

export async function readDocument(file: File): Promise<SourceDocument> {
  if (file.size > MAX_FILE_BYTES) throw new Error('Please choose a document smaller than 20 MB.')
  if (!file.size) throw new Error('This file is empty.')
  const extension = file.name.split('.').pop()?.toLowerCase()
  const name = file.name.slice(0, 240)
  if (extension === 'pdf') {
    const { extractPdfText } = await import('./pdf')
    const result = await extractPdfText(file)
    if (result.text.trim().length < 120) throw new Error('This PDF has too little selectable text. Image-only scans need OCR first; you can also paste the text.')
    return { name, text: validateText(result.text), pages: result.pages, kind: 'document' }
  }
  if (extension === 'docx') {
    const { unzipSync, strFromU8 } = await import('fflate')
    let expandedSize = 0
    const files = unzipSync(new Uint8Array(await file.arrayBuffer()), {
      filter: (entry) => {
        expandedSize += entry.originalSize
        if (expandedSize > 40 * 1024 * 1024 || entry.originalSize > 20 * 1024 * 1024) throw new Error('This Word document is too large when unpacked.')
        return entry.name === 'word/document.xml'
      },
    })
    if (!files['word/document.xml']) throw new Error('This is not a readable .docx document. Please export it as PDF or plain text.')
    const xml = new DOMParser().parseFromString(strFromU8(files['word/document.xml']), 'application/xml')
    if (xml.querySelector('parsererror')) throw new Error('The Word document contains damaged text.')
    const text = [...xml.getElementsByTagNameNS('*', 'p')].map((p) =>
      [...p.getElementsByTagNameNS('*', 't')].map((t) => t.textContent).join(''),
    ).join('\n')
    return { name, text: validateText(text), kind: 'document' }
  }
  if (extension === 'txt' || extension === 'md') {
    return { name, text: validateText(await file.text()), kind: 'document' }
  }
  throw new Error('Choose a PDF, Word (.docx), plain text (.txt) or Markdown (.md) document.')
}

export async function readArticle(url: string, signal?: AbortSignal): Promise<SourceDocument> {
  let parsed: URL
  try { parsed = new URL(url.trim()) } catch { throw new Error('Enter the full web address, starting with https://.') }
  if (!['http:', 'https:'].includes(parsed.protocol) || parsed.username || parsed.password) throw new Error('Use a public http or https article URL without sign-in details.')
  const endpoint = import.meta.env.VITE_ARTICLE_API || `${import.meta.env.BASE_URL}api/article`
  const response = await fetch(endpoint, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url: parsed.href }), signal,
  })
  let result: { title?: string; url?: string; text?: string; error?: string }
  try { result = await response.json() } catch { throw new Error('Article import is temporarily unavailable. You can paste the article text instead.') }
  if (!response.ok) throw new Error(result.error || 'This page could not be read. Try another article or paste its text.')
  if (typeof result.text !== 'string' || typeof result.title !== 'string' || typeof result.url !== 'string') throw new Error('The article service returned an incomplete response.')
  return { name: result.title.slice(0, 240), text: validateText(result.text), url: result.url, kind: 'url' }
}
