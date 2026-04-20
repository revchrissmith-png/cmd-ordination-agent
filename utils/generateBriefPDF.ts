// utils/generateBriefPDF.ts
// Generates a styled PDF of the AI Interview Brief for a candidate.
// Extracted from candidates/[id]/page.tsx to reduce component size.

interface CandidateInfo {
  first_name?: string
  last_name?: string
  cohorts?: { season: string; year: number } | null
}

export async function generateBriefPDF(candidate: CandidateInfo, briefContent: string) {
  const { jsPDF } = await import('jspdf')

  const PW = 612, PH = 792   // letter, points
  const ML = 60, MR = 60      // left / right margin
  const CW = PW - ML - MR     // content width
  const HEADER_H = 40, FOOTER_H = 32

  const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'letter' })

  const KNOWN_HEADERS = new Set([
    'CANDIDATE OVERVIEW', 'ASSIGNMENT COMPLETION SUMMARY',
    'COUNCIL-IDENTIFIED STRENGTHS', 'AREAS FOR CONTINUED GROWTH',
    'SELF-ASSESSMENT INSIGHT', 'PARDINGTON STUDY PATTERNS',
    'SUGGESTED INTERVIEW PROBES',
  ])

  let y = 0

  function drawPageHeader() {
    doc.setFillColor(0, 66, 106)
    doc.rect(0, 0, PW, HEADER_H, 'F')
    doc.setFillColor(0, 119, 200)
    doc.rect(0, HEADER_H - 2, PW, 2, 'F')
    doc.setTextColor(255, 255, 255)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9.5)
    doc.text('CMD ORDINATION PORTAL', ML, 25)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.text('Canadian Midwest District · The Alliance Canada', PW - MR, 25, { align: 'right' })
    y = HEADER_H + 44
  }

  function drawPageFooter(pageNum: number, pageCount: number) {
    doc.setFillColor(241, 245, 249)
    doc.rect(0, PH - FOOTER_H, PW, FOOTER_H, 'F')
    doc.setDrawColor(203, 213, 225)
    doc.setLineWidth(0.5)
    doc.line(0, PH - FOOTER_H, PW, PH - FOOTER_H)
    doc.setTextColor(100, 116, 139)
    doc.setFont('helvetica', 'italic')
    doc.setFontSize(7.5)
    doc.text('CONFIDENTIAL — For CMD Ordination Council Use Only', ML, PH - 12)
    doc.text(`Page ${pageNum} of ${pageCount}`, PW - MR, PH - 12, { align: 'right' })
  }

  function checkBreak(needed: number) {
    if (y + needed > PH - FOOTER_H - 16) {
      doc.addPage()
      drawPageHeader()
    }
  }

  // ── Page 1 ──────────────────────────────────────────────────────────────
  drawPageHeader()

  // Title block
  doc.setDrawColor(0, 119, 200)
  doc.setLineWidth(1.5)
  doc.line(ML, y, PW - MR, y)
  y += 20

  doc.setTextColor(0, 66, 106)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(20)
  doc.text('Oral Interview Brief', ML, y)
  y += 26

  doc.setTextColor(30, 41, 59)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(13)
  doc.text(`${candidate.first_name} ${candidate.last_name}`, ML, y)
  y += 16

  if (candidate.cohorts) {
    doc.setTextColor(71, 85, 105)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    const cohortLabel = `${candidate.cohorts.season} ${candidate.cohorts.year} Cohort`
    doc.text(cohortLabel, ML, y)
    y += 14
  }

  doc.setTextColor(100, 116, 139)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8.5)
  const dateStr = new Date().toLocaleDateString('en-CA', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
  doc.text(`Generated ${dateStr}`, ML, y)
  y += 8

  doc.setDrawColor(0, 119, 200)
  doc.setLineWidth(1.5)
  doc.line(ML, y, PW - MR, y)
  y += 28

  // ── Markdown helpers ─────────────────────────────────────────────────────
  type Seg = { text: string; bold: boolean; italic: boolean }

  function parseInline(text: string): Seg[] {
    const segs: Seg[] = []
    const re = /\*\*([^*]+)\*\*|\*([^*]+)\*/g
    let last = 0, m: RegExpExecArray | null
    while ((m = re.exec(text)) !== null) {
      if (m.index > last) segs.push({ text: text.slice(last, m.index), bold: false, italic: false })
      if (m[1] !== undefined) segs.push({ text: m[1], bold: true, italic: false })
      else segs.push({ text: m[2], bold: false, italic: true })
      last = re.lastIndex
    }
    if (last < text.length) segs.push({ text: text.slice(last), bold: false, italic: false })
    return segs.filter(s => s.text.length > 0)
  }

  function stripInline(text: string): string {
    return text.replace(/\*\*([^*]+)\*\*/g, '$1').replace(/\*([^*]+)\*/g, '$1')
  }

  function renderFormatted(segs: Seg[], x: number, startY: number, maxW: number, fontSize: number, lineH: number): number {
    const tokens: { word: string; bold: boolean; italic: boolean }[] = []
    for (const seg of segs) {
      for (const word of seg.text.split(/(\s+)/)) {
        if (word) tokens.push({ word, bold: seg.bold, italic: seg.italic })
      }
    }
    let cx = x, cy = startY, lines = 1
    for (const t of tokens) {
      if (/^\s+$/.test(t.word)) continue
      const style = t.bold ? 'bold' : t.italic ? 'italic' : 'normal'
      doc.setFont('helvetica', style)
      doc.setFontSize(fontSize)
      const prefix = cx > x ? ' ' : ''
      const w = doc.getTextWidth(prefix + t.word)
      if (cx > x && cx + w > x + maxW) {
        cy += lineH; cx = x; lines++
        doc.text(t.word, cx, cy)
        cx += doc.getTextWidth(t.word)
      } else {
        doc.text(prefix + t.word, cx, cy)
        cx += w
      }
    }
    return lines
  }

  function estimateLines(plain: string, maxW: number, fontSize: number): number {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(fontSize)
    return (doc.splitTextToSize(plain, maxW) as string[]).length
  }

  // ── Brief content ────────────────────────────────────────────────────────
  const lines = briefContent.split('\n')
  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed || trimmed === '---') { y += 5; continue }

    const isMarkdownHeader = /^#{1,3}\s/.test(trimmed)
    const headerText = isMarkdownHeader ? trimmed.replace(/^#+\s*/, '') : trimmed
    const headerKey = headerText.toUpperCase()

    if (KNOWN_HEADERS.has(headerKey) || KNOWN_HEADERS.has(trimmed)) {
      y += 8
      checkBreak(30)
      doc.setFillColor(235, 245, 255)
      doc.rect(ML - 6, y - 14, CW + 12, 24, 'F')
      doc.setFillColor(0, 119, 200)
      doc.rect(ML - 6, y - 14, 3, 24, 'F')
      doc.setTextColor(0, 66, 106)
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(9.5)
      doc.text(headerKey, ML + 8, y + 2)
      y += 20

    } else if (isMarkdownHeader) {
      checkBreak(22)
      doc.setTextColor(0, 66, 106)
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(10)
      doc.text(stripInline(headerText), ML, y)
      y += 18

    } else if (/^[-•]\s/.test(trimmed) || /^\d+\.\s/.test(trimmed)) {
      const isNumbered = /^\d+\.\s/.test(trimmed)
      const bulletChar = isNumbered ? (trimmed.match(/^(\d+\.)/)?.[1] ?? '•') : '•'
      const itemText = trimmed.replace(/^[-•]\s+/, '').replace(/^\d+\.\s+/, '')
      const plain = stripInline(itemText)
      const est = estimateLines(plain, CW - 18, 10)
      checkBreak(est * 13 + 4)
      doc.setTextColor(30, 41, 59)
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(10)
      doc.text(bulletChar, ML + 4, y)
      const rendered = renderFormatted(parseInline(itemText), ML + 18, y, CW - 18, 10, 13)
      y += rendered * 13 + 4

    } else {
      const plain = stripInline(trimmed)
      const est = estimateLines(plain, CW, 10)
      checkBreak(est * 14 + 4)
      doc.setTextColor(30, 41, 59)
      doc.setFontSize(10)
      const rendered = renderFormatted(parseInline(trimmed), ML, y, CW, 10, 14)
      y += rendered * 14 + 4
    }
  }

  // ── Footers on all pages ─────────────────────────────────────────────────
  const totalPages = doc.getNumberOfPages()
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i)
    drawPageFooter(i, totalPages)
  }

  const safeName = `${candidate.first_name ?? ''}-${candidate.last_name ?? ''}`.replace(/[^a-zA-Z0-9-]/g, '')
  doc.save(`Interview-Brief-${safeName}.pdf`)
}
