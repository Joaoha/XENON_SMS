import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"

export interface PickingListItem {
  sku: string
  name: string
  quantity: number
  unit: string
  storageLocation: string | null
}

export interface PickingListData {
  date: string
  picker: string
  destination: string
  reference: string
  sourceWarehouse?: string
  items: PickingListItem[]
  notes: string
}

export function generatePickingListPdf(data: PickingListData): jsPDF {
  const doc = new jsPDF({ orientation: "landscape" })
  const pageWidth = doc.internal.pageSize.getWidth()
  let y = 20

  doc.setFontSize(18)
  doc.setFont("helvetica", "bold")
  doc.text("Stock Handout", pageWidth / 2, y, { align: "center" })
  y += 12

  doc.setFontSize(10)
  doc.setFont("helvetica", "normal")
  const headerLeft = [
    `Date: ${data.date}`,
    `Picked By: ${data.picker}`,
    data.sourceWarehouse ? `Source: ${data.sourceWarehouse}` : "",
  ].filter(Boolean)
  const headerRight = [
    `Destination: ${data.destination}`,
    data.reference ? `Reference: ${data.reference}` : "",
  ].filter(Boolean)

  headerLeft.forEach((line, i) => {
    doc.text(line, 14, y + i * 6)
  })
  headerRight.forEach((line, i) => {
    doc.text(line, pageWidth / 2 + 10, y + i * 6)
  })
  y += Math.max(headerLeft.length, headerRight.length) * 6 + 6

  doc.setDrawColor(200)
  doc.line(14, y, pageWidth - 14, y)
  y += 6

  autoTable(doc, {
    startY: y,
    head: [["#", "SKU", "Item Name", "Qty", "Unit", "Storage Location", "OK"]],
    body: data.items.map((item, i) => [
      String(i + 1),
      item.sku,
      item.name,
      String(item.quantity),
      item.unit,
      item.storageLocation || "-",
      "[ ]",
    ]),
    styles: { fontSize: 9, cellPadding: 4 },
    headStyles: { fillColor: [51, 51, 51], textColor: 255, fontStyle: "bold" },
    columnStyles: {
      0: { cellWidth: 12, halign: "center" },
      1: { cellWidth: 30 },
      2: { cellWidth: "auto" },
      3: { cellWidth: "auto", halign: "center" },
      4: { cellWidth: 15 },
      5: { cellWidth: "auto" },
      6: { cellWidth: 15, halign: "center", fontSize: 12 },
    },
    tableWidth: "auto",
    theme: "grid",
  })

  y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 16

  if (data.notes) {
    doc.setFontSize(10)
    doc.setFont("helvetica", "bold")
    doc.text("Notes:", 14, y)
    y += 6
    doc.setFont("helvetica", "normal")
    doc.setFontSize(9)
    const lines = doc.splitTextToSize(data.notes, pageWidth - 28)
    doc.text(lines, 14, y)
    y += lines.length * 5 + 12
  } else {
    y += 4
  }

  const pageHeight = doc.internal.pageSize.getHeight()
  const sigY = Math.max(y, pageHeight - 30)
  doc.setDrawColor(0)
  doc.setFontSize(10)
  doc.setFont("helvetica", "normal")

  doc.text("Picked by:", 14, sigY)
  doc.line(40, sigY + 1, 100, sigY + 1)

  doc.text("Date/Time:", pageWidth / 2 + 10, sigY)
  doc.line(pageWidth / 2 + 36, sigY + 1, pageWidth - 14, sigY + 1)

  const footerY = doc.internal.pageSize.getHeight() - 10
  doc.setFontSize(7)
  doc.setTextColor(150)
  doc.text(
    `Generated ${new Date().toLocaleString()} - XENON Stock Management`,
    pageWidth / 2,
    footerY,
    { align: "center" },
  )

  return doc
}
