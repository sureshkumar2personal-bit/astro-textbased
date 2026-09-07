import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'

const PRIMARY = [124, 58, 237]
const INK = [45, 33, 64]

function sanitizeFilename(value) {
  return String(value || 'report')
    .replace(/[^a-z0-9]+/gi, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase()
}

const DEFAULT_BRAND = 'AstroConnect Astrologer Wallet'

export function downloadPdf({ title, subtitle = '', columns, rows, filename = 'report', footnote = '', brand = DEFAULT_BRAND }) {
  const landscape = columns.length > 5
  const doc = new jsPDF({ orientation: landscape ? 'landscape' : 'portrait', unit: 'pt', format: 'a4' })
  const pageWidth = doc.internal.pageSize.getWidth()
  const margin = 40

  doc.setFillColor(PRIMARY[0], PRIMARY[1], PRIMARY[2])
  doc.rect(0, 0, pageWidth, 54, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(15)
  doc.text(title, margin, 26)
  doc.setFontSize(9.5)
  doc.setFont('helvetica', 'normal')
  doc.text(subtitle || '', margin, 41)

  autoTable(doc, {
    startY: 70,
    margin: { left: margin, right: margin },
    head: [columns],
    body: rows,
    theme: 'striped',
    headStyles: { fillColor: INK, textColor: [255, 255, 255], fontSize: 8.5, fontStyle: 'bold' },
    styles: { fontSize: 8.5, cellPadding: 4, textColor: INK, valign: 'middle' },
    alternateRowStyles: { fillColor: [246, 243, 255] },
    didDrawPage: () => {
      doc.setFontSize(8)
      doc.setTextColor(130, 120, 150)
      doc.text(
        `Generated ${new Date().toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })} · ${brand}`,
        margin,
        doc.internal.pageSize.getHeight() - 20,
      )
      doc.text(`Page ${doc.internal.getNumberOfPages()}`, pageWidth - margin, doc.internal.pageSize.getHeight() - 20, { align: 'right' })
    },
  })

  const finalY = (doc.lastAutoTable && doc.lastAutoTable.finalY) || 80
  if (footnote) {
    doc.setFontSize(9)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(INK[0], INK[1], INK[2])
    doc.text(footnote, margin, Math.min(finalY + 14, doc.internal.pageSize.getHeight() - 28))
  }

  doc.save(`${sanitizeFilename(filename)}.pdf`)
}