// utils/generateDecisionPDF.ts
// Generates a beautifully formatted PDF of the oral interview decision record.
// Follows the established CMD branding pattern (deep-sea header, Alliance Blue accents).

import {
  INTERVIEW_SECTIONS,
  INTERVIEW_RATING_LABELS,
  type InterviewRating,
} from './interviewQuestions'

interface DecisionPDFData {
  candidateName: string
  cohortLabel?: string                        // e.g. "Fall 2025 Cohort"
  interviewDate: string                       // e.g. "2026-04-22"
  result: string                              // sustained | conditional | deferred | not_sustained
  resultLabel: string                         // e.g. "Conditionally Sustained"
  councilPresent: string[]                    // array of member names
  finalScores: Record<string, string>         // section_id → rating
  conditions?: string                         // conditions for conditional/deferred
  decisionNotes?: string                      // deliberation notes
}

const RESULT_COLOURS: Record<string, { r: number; g: number; b: number }> = {
  sustained:     { r: 22, g: 163, b: 74 },
  conditional:   { r: 37, g: 99, b: 235 },
  deferred:      { r: 217, g: 119, b: 6 },
  not_sustained: { r: 220, g: 38, b: 38 },
}

const RATING_COLOURS: Record<string, { r: number; g: number; b: number }> = {
  insufficient: { r: 239, g: 68, b: 68 },
  adequate:     { r: 245, g: 158, b: 11 },
  good:         { r: 59, g: 130, b: 246 },
  excellent:    { r: 34, g: 197, b: 94 },
  exceptional:  { r: 168, g: 85, b: 247 },
}

export async function generateDecisionPDF(data: DecisionPDFData) {
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

  const PW = 612, PH = 792   // letter, points
  const ML = 60, MR = 60
  const CW = PW - ML - MR
  const HEADER_H = 50, FOOTER_H = 32

  const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'letter' })

  let y = 0

  // ── Page chrome ─────────────────────────────────────────────────────

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
    doc.text('Canadian Midwest District \u00b7 The Alliance Canada', PW - MR, 28, { align: 'right' })
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
    doc.text('CONFIDENTIAL \u2014 For CMD District Records Only', ML, PH - 12)
    doc.text(`Page ${pageNum} of ${pageCount}`, PW - MR, PH - 12, { align: 'right' })
  }

  function checkBreak(needed: number) {
    if (y + needed > PH - FOOTER_H - 16) {
      doc.addPage()
      drawPageHeader()
    }
  }

  // ── Section header ──────────────────────────────────────────────────

  function sectionHeader(title: string) {
    y += 10
    checkBreak(30)
    doc.setFillColor(235, 245, 255)
    doc.rect(ML - 6, y - 14, CW + 12, 24, 'F')
    doc.setFillColor(0, 119, 200)
    doc.rect(ML - 6, y - 14, 3, 24, 'F')
    doc.setTextColor(0, 66, 106)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9.5)
    doc.text(title.toUpperCase(), ML + 8, y + 2)
    y += 22
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
  doc.text('Interview Decision Record', ML, y)
  y += 28

  doc.setTextColor(30, 41, 59)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(15)
  doc.text(data.candidateName, ML, y)
  y += 18

  if (data.cohortLabel) {
    doc.setTextColor(71, 85, 105)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(10)
    doc.text(data.cohortLabel, ML, y)
    y += 14
  }

  // Interview date
  if (data.interviewDate) {
    const dateFormatted = new Date(data.interviewDate + 'T12:00:00').toLocaleDateString('en-CA', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
    doc.setTextColor(100, 116, 139)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.text(`Interview conducted ${dateFormatted}`, ML, y)
    y += 14
  }

  doc.setDrawColor(0, 119, 200)
  doc.setLineWidth(1.5)
  doc.line(ML, y, PW - MR, y)
  y += 30

  // ── Decision outcome — large, coloured ─────────────────────────────

  const resultColour = RESULT_COLOURS[data.result] ?? { r: 100, g: 116, b: 139 }

  // Background pill
  const pillW = 260, pillH = 50
  const pillX = ML + (CW - pillW) / 2
  doc.setFillColor(resultColour.r, resultColour.g, resultColour.b)
  doc.roundedRect(pillX, y - 8, pillW, pillH, 12, 12, 'F')

  // Outcome label
  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(18)
  doc.text(data.resultLabel, PW / 2, y + 22, { align: 'center' })
  y += pillH + 24

  // ── Conditions (conditional / deferred only) ───────────────────────

  if (data.conditions && data.conditions.trim()) {
    sectionHeader(data.result === 'deferred' ? 'Conditions for Reinstatement' : 'Conditions for Ordination')

    doc.setFillColor(255, 251, 235)
    const condLines = doc.splitTextToSize(data.conditions.trim(), CW - 24) as string[]
    const condH = condLines.length * 14 + 16
    checkBreak(condH + 4)
    doc.roundedRect(ML, y - 6, CW, condH, 6, 6, 'F')
    doc.setDrawColor(217, 119, 6)
    doc.setLineWidth(0.75)
    doc.roundedRect(ML, y - 6, CW, condH, 6, 6, 'S')

    doc.setTextColor(120, 53, 15)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(10)
    let condY = y + 6
    for (const cl of condLines) {
      doc.text(cl, ML + 12, condY)
      condY += 14
    }
    y = condY + 8
  }

  // ── Council present ────────────────────────────────────────────────

  if (data.councilPresent.length > 0) {
    sectionHeader('Council Members Present')
    doc.setTextColor(30, 41, 59)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(10)

    const memberText = data.councilPresent.join('  \u00b7  ')
    const memberLines = doc.splitTextToSize(memberText, CW) as string[]
    checkBreak(memberLines.length * 14 + 4)
    for (const ml of memberLines) {
      doc.text(ml, ML, y)
      y += 14
    }
    y += 4
  }

  // ── Official section grades ────────────────────────────────────────

  const scoredSections = INTERVIEW_SECTIONS.filter(s => data.finalScores[s.id])
  if (scoredSections.length > 0) {
    sectionHeader('Official Section Grades')

    const rowH = 22
    const labelW = 190
    const pillWidth = 80

    for (const section of scoredSections) {
      checkBreak(rowH + 4)
      const rating = data.finalScores[section.id] as InterviewRating
      const rc = RATING_COLOURS[rating] ?? { r: 100, g: 116, b: 139 }

      // Section label
      doc.setTextColor(51, 65, 85)
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(10)
      doc.text(section.title, ML, y + 4)

      // Coloured rating pill
      doc.setFillColor(rc.r, rc.g, rc.b)
      const rx = ML + labelW
      doc.roundedRect(rx, y - 8, pillWidth, rowH, 6, 6, 'F')
      doc.setTextColor(255, 255, 255)
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(9)
      doc.text(INTERVIEW_RATING_LABELS[rating] ?? rating, rx + pillWidth / 2, y + 5, { align: 'center' })

      y += rowH + 4
    }
    y += 4
  }

  // ── Deliberation notes ─────────────────────────────────────────────

  if (data.decisionNotes && data.decisionNotes.trim()) {
    sectionHeader('Deliberation Notes')

    doc.setTextColor(30, 41, 59)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(10)

    const noteLines = data.decisionNotes.trim().split('\n')
    for (const line of noteLines) {
      const trimmed = line.trim()
      if (!trimmed) { y += 6; continue }

      const wrapped = doc.splitTextToSize(trimmed, CW) as string[]
      checkBreak(wrapped.length * 14 + 4)
      for (const wl of wrapped) {
        doc.text(wl, ML, y)
        y += 14
      }
      y += 2
    }
  }

  // ── Signature line ─────────────────────────────────────────────────

  y += 30
  checkBreak(60)

  doc.setDrawColor(203, 213, 225)
  doc.setLineWidth(0.5)

  // Two signature lines side by side
  const sigW = (CW - 40) / 2

  doc.line(ML, y, ML + sigW, y)
  doc.setTextColor(100, 116, 139)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.text('Chair, Ordination Council', ML, y + 12)

  doc.line(ML + sigW + 40, y, ML + sigW + 40 + sigW, y)
  doc.text('Date', ML + sigW + 40, y + 12)

  y += 30

  doc.line(ML, y, ML + sigW, y)
  doc.text('District Superintendent', ML, y + 12)

  doc.line(ML + sigW + 40, y, ML + sigW + 40 + sigW, y)
  doc.text('Date', ML + sigW + 40, y + 12)

  // ── Footers ────────────────────────────────────────────────────────

  const totalPages = doc.getNumberOfPages()
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i)
    drawPageFooter(i, totalPages)
  }

  const safeName = data.candidateName.replace(/[^a-zA-Z0-9-]/g, '-').replace(/-+/g, '-')
  doc.save(`Interview-Decision-${safeName}.pdf`)
}
