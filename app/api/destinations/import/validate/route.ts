import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/db"
import { parseCsv, type ImportPreview, type ImportPreviewRow, type ValidationError } from "@/lib/csv-import"

export async function POST(req: Request) {
  const session = await auth()
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = await req.json()
  const csvText = body.csv as string
  if (!csvText) {
    return NextResponse.json({ error: "csv field is required" }, { status: 400 })
  }

  const { rows, errors } = parseCsv(csvText)
  if (errors.length > 0) {
    return NextResponse.json({
      rows: [],
      errors,
      summary: { toCreate: 0, toSkip: 0, errors: errors.length },
    } satisfies ImportPreview)
  }

  const halls = await prisma.dataHall.findMany({
    where: { isActive: true },
    include: {
      rows: {
        where: { isActive: true },
        include: { racks: { where: { isActive: true } } },
      },
    },
  })

  const hallByCode = new Map(halls.map((h) => [h.code, h]))

  const previewRows: ImportPreviewRow[] = []
  const validationErrors: ValidationError[] = []

  for (const row of rows) {
    const hall = hallByCode.get(row.dataHallCode)
    const existingRow = hall?.rows.find((r) => r.name === row.rowName)
    const existingRack = existingRow?.racks.find((rk) => rk.name === row.rackName)

    if (existingRack) {
      previewRows.push({
        ...row,
        action: "skip",
        detail: "Already exists",
      })
    } else {
      previewRows.push({
        ...row,
        action: "create",
        detail: !hall
          ? "New data hall + row + rack"
          : !existingRow
            ? "New row + rack"
            : "New rack",
      })
    }
  }

  return NextResponse.json({
    rows: previewRows,
    errors: validationErrors,
    summary: {
      toCreate: previewRows.filter((r) => r.action === "create").length,
      toSkip: previewRows.filter((r) => r.action === "skip").length,
      errors: validationErrors.length,
    },
  } satisfies ImportPreview)
}
