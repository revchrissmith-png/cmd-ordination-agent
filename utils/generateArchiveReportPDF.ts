// utils/generateArchiveReportPDF.ts
// Generates a styled PDF of the final archive report for an ordinand.
// Mirrors the generateBriefPDF pattern with archive-specific sections.

interface CandidateInfo {
  first_name?: string
  last_name?: string
  cohorts?: { season: string; year: number } | null
}

interface ArchiveReportData {
  candidate: CandidateInfo
  completionSummary: string        // pre-formatted text block
  interviewSection: string         // pre-formatted interview text
  ordinationSection: string        // pre-formatted ordination text
  evaluationSection: string        // pre-formatted evaluation summaries
  mentorSection: string            // pre-formatted mentor report summary
  aiSummary: string                // AI executive summary
}

export async function generateArchiveReportPDF(data: ArchiveReportData) {
  const { jsPDF } = await import('jspdf')

  // Load logo before drawing
  const logoData = await new Promise<string | null>((resolve) => {
    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = img.width
      canvas.height = img.height
      const ctx = canvas.getContext('2d')
      if (ctx) { ctx.drawImage(img, 0, 0); resolve(canvas.toDataURL('image/png')) }
      else resolve(null)
    }
    img.onerror = () => resolve(null)
    img.src = '/cmd-logo.png'
  })

  const PW = 612, PH = 792
  const ML = 60, MR = 60
  const CW = PW - ML - MR
  const HEADER_H = 50, FOOTER_H = 32

  const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'letter' })

  let y = 0

  function drawPageHeader() {
    doc.setFillColor(0, 66, 106)
    doc.rect(0, 0, PW, HEADER_H, 'F')
    doc.setFillColor(0, 119, 200)
    doc.rect(0, HEADER_H - 2, PW, 2, 'F')
    if (logoData) {
      doc.addImage(logoData, 'PNG', 14, 9, 32, 32)
    }
    doc.setTextColor(255, 255, 255)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9.5)
    doc.text('CMD ORDINATION PORTAL', ML, 28)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.text('Canadian Midwest District · The Alliance Canada', PW - MR, 28, { align: 'right' })
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
    doc.text('CONFIDENTIAL — For CMD District Records Only', ML, PH - 12)
    doc.text(`Page ${pageNum} of ${pageCount}`, PW - MR, PH - 12, { align: 'right' })
  }

  function checkBreak(needed: number) {
    if (y + needed > PH - FOOTER_H - 16) {
      doc.addPage()
      drawPageHeader()
    }
  }

  function renderSectionHeader(title: string) {
    y += 8
    checkBreak(30)
    doc.setFillColor(235, 245, 255)
    doc.rect(ML - 6, y - 14, CW + 12, 24, 'F')
    doc.setFillColor(0, 119, 200)
    doc.rect(ML - 6, y - 14, 3, 24, 'F')
    doc.setTextColor(0, 66, 106)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9.5)
    doc.text(title.toUpperCase(), ML + 8, y + 2)
    y += 20
  }

  function renderTextBlock(text: string) {
    if (!text.trim()) return
    const lines = text.split('\n')
    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed) { y += 5; continue }

      doc.setFont('helvetica', 'normal')
      doc.setFontSize(10)
      doc.setTextColor(30, 41, 59)

      const indent = trimmed.startsWith('✓') || trimmed.startsWith('○') || trimmed.startsWith('•') || trimmed.startsWith('-')
      const x = indent ? ML + 12 : ML
      const w = indent ? CW - 12 : CW

      const wrapped = doc.splitTextToSize(trimmed, w) as string[]
      checkBreak(wrapped.length * 14 + 4)
      for (const wl of wrapped) {
        doc.text(wl, x, y)
        y += 14
      }
      y += 2
    }
  }

  // ── Page 1 — Title ─────────────────────────────────────────────────
  drawPageHeader()

  doc.setDrawColor(0, 119, 200)
  doc.setLineWidth(1.5)
  doc.line(ML, y, PW - MR, y)
  y += 20

  doc.setTextColor(0, 66, 106)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(20)
  doc.text('Archive Report', ML, y)
  y += 26

  doc.setTextColor(30, 41, 59)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(13)
  doc.text(`${data.candidate.first_name} ${data.candidate.last_name}`, ML, y)
  y += 16

  if (data.candidate.cohorts) {
    doc.setTextColor(71, 85, 105)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.text(`${data.candidate.cohorts.season} ${data.candidate.cohorts.year} Cohort`, ML, y)
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

  // ── Sections ───────────────────────────────────────────────────────
  if (data.completionSummary) {
    renderSectionHeader('Completion Summary')
    renderTextBlock(data.completionSummary)
  }

  if (data.interviewSection) {
    renderSectionHeader('Oral Interview')
    renderTextBlock(data.interviewSection)
  }

  if (data.ordinationSection) {
    renderSectionHeader('Ordination Service')
    renderTextBlock(data.ordinationSection)
  }

  if (data.evaluationSection) {
    renderSectionHeader('External Evaluations')
    renderTextBlock(data.evaluationSection)
  }

  if (data.mentorSection) {
    renderSectionHeader('Mentor Report')
    renderTextBlock(data.mentorSection)
  }

  if (data.aiSummary) {
    renderSectionHeader('AI Executive Summary')
    renderTextBlock(data.aiSummary)
    y += 4
    doc.setTextColor(148, 163, 184)
    doc.setFont('helvetica', 'italic')
    doc.setFontSize(8)
    const note = doc.splitTextToSize('Confidential — for council records only. AI-generated from portal data.', CW) as string[]
    checkBreak(note.length * 11 + 4)
    for (const l of note) { doc.text(l, ML, y); y += 11 }
  }

  // ── Footers ────────────────────────────────────────────────────────
  const totalPages = doc.getNumberOfPages()
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i)
    drawPageFooter(i, totalPages)
  }

  const safeName = `${data.candidate.first_name ?? ''}-${data.candidate.last_name ?? ''}`.replace(/[^a-zA-Z0-9-]/g, '')
  doc.save(`Archive-Report-${safeName}.pdf`)
}
