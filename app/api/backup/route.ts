import { NextResponse } from "next/server"
import { createBackup, type BackupPeriod } from "@/lib/backup"

export async function POST(req: Request) {
  const body = await req.json()
  const { period, secret } = body as { period?: string; secret?: string }

  const expectedSecret = process.env.BACKUP_SECRET
  if (!expectedSecret || secret !== expectedSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  if (!period || !["daily", "weekly", "monthly"].includes(period)) {
    return NextResponse.json(
      { error: "period must be daily, weekly, or monthly" },
      { status: 400 }
    )
  }

  const result = await createBackup(period as BackupPeriod)

  return NextResponse.json({
    success: true,
    period: result.period,
    rowCount: result.rowCount,
    csvPath: result.csvPath,
    metaPath: result.metaPath,
    dateRange: {
      from: result.dateRange.from.toISOString(),
      to: result.dateRange.to.toISOString(),
    },
  })
}
