import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/db"
import { parseCsv } from "@/lib/csv-import"

export async function POST(req: Request) {
  const session = await auth()
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const user = session.user as { id?: string; role?: string }
  if (!user.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = await req.json()
  const csvText = body.csv as string
  const fileName = (body.fileName as string) || "unknown.csv"
  if (!csvText) {
    return NextResponse.json({ error: "csv field is required" }, { status: 400 })
  }

  const { rows, errors } = parseCsv(csvText)
  if (errors.length > 0) {
    return NextResponse.json({ error: "Validation failed", errors }, { status: 400 })
  }

  let created = 0
  let skipped = 0
  let failed = 0
  const failedErrors: string[] = []

  try {
    await prisma.$transaction(async (tx) => {
      const hallCache = new Map<string, string>()
      const rowCache = new Map<string, string>()

      for (const row of rows) {
        try {
          let hallId = hallCache.get(row.dataHallCode)
          if (!hallId) {
            let hall = await tx.dataHall.findFirst({
              where: { code: row.dataHallCode },
            })
            if (hall && !hall.isActive) {
              hall = await tx.dataHall.update({
                where: { id: hall.id },
                data: { name: row.dataHallName, isActive: true },
              })
            } else if (!hall) {
              hall = await tx.dataHall.create({
                data: { code: row.dataHallCode, name: row.dataHallName },
              })
            }
            hallId = hall.id
            hallCache.set(row.dataHallCode, hallId)
          }

          const rowKey = `${hallId}|${row.rowName}`
          let rowId = rowCache.get(rowKey)
          if (!rowId) {
            let existingRow = await tx.row.findFirst({
              where: { dataHallId: hallId, name: row.rowName },
            })
            if (existingRow && !existingRow.isActive) {
              existingRow = await tx.row.update({
                where: { id: existingRow.id },
                data: { isActive: true },
              })
            } else if (!existingRow) {
              existingRow = await tx.row.create({
                data: { dataHallId: hallId, name: row.rowName },
              })
            }
            rowId = existingRow.id
            rowCache.set(rowKey, rowId)
          }

          const existingRack = await tx.rack.findFirst({
            where: { rowId, name: row.rackName },
          })
          if (existingRack && existingRack.isActive) {
            skipped++
          } else if (existingRack && !existingRack.isActive) {
            await tx.rack.update({
              where: { id: existingRack.id },
              data: { isActive: true },
            })
            created++
          } else {
            await tx.rack.create({
              data: { rowId, name: row.rackName },
            })
            created++
          }
        } catch (e) {
          failed++
          const msg = e instanceof Error ? e.message : String(e)
          failedErrors.push(`Row ${row.rowNumber}: ${msg}`)
        }
      }

      await tx.importLog.create({
        data: {
          userId: user.id!,
          fileName,
          entityType: "destination",
          created,
          skipped,
          failed,
          errors: failedErrors.length > 0 ? failedErrors.join("\n") : null,
        },
      })
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return NextResponse.json({ error: `Import failed: ${msg}` }, { status: 500 })
  }

  return NextResponse.json({
    created,
    skipped,
    failed,
    errors: failedErrors,
  })
}
