export interface PdfResult {
  text: string
  pages: number
}

export async function extractPdfText(file: File): Promise<PdfResult> {
  const [{ GlobalWorkerOptions, getDocument }, { default: workerUrl }] = await Promise.all([
    import('pdfjs-dist'),
    import('pdfjs-dist/build/pdf.worker.min.mjs?url'),
  ])
  GlobalWorkerOptions.workerSrc = workerUrl
  const data = new Uint8Array(await file.arrayBuffer())
  const task = getDocument({ data, useSystemFonts: true })
  const pdf = await task.promise
  const pages: string[] = []
  try {
  if (pdf.numPages > 80) throw new Error('Please choose a PDF with no more than 80 pages.')
  let total = 0
  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber)
    const content = await page.getTextContent()
    const text = content.items
      .map((item) => ('str' in item ? item.str : ''))
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim()
    pages.push(text)
    total += text.length
    if (total > 180000) throw new Error('This document is too long. Please use an extract of up to 180,000 characters.')
    page.cleanup()
  }
  return { text: pages.join('\n'), pages: pdf.numPages }
  } finally {
    await task.destroy()
  }
}
