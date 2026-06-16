import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import { SheetResult } from './calculateSheet'

export function generatePdf(sheet: SheetResult): Buffer {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })

  // Title
  doc.setFontSize(12)
  doc.setFont('helvetica', 'bold')
  doc.text(sheet.title, 14, 12)

  autoTable(doc, {
    head: [sheet.tableHead],
    body: sheet.tableBody.map((row) => row.map(String)),
    foot: [sheet.tableFooter.map(String)],
    startY: 18,
    styles: {
      fontSize: 6,
      cellPadding: 1.5,
      overflow: 'linebreak',
    },
    headStyles: {
      fillColor: [21, 64, 141],
      textColor: 255,
      fontStyle: 'bold',
      fontSize: 6,
    },
    footStyles: {
      fillColor: [230, 236, 245],
      textColor: [21, 64, 141],
      fontStyle: 'bold',
      fontSize: 6,
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    margin: { top: 18, right: 8, bottom: 10, left: 8 },
    tableWidth: 'auto',
  })

  return Buffer.from(doc.output('arraybuffer'))
}
