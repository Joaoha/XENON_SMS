import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { createBackup, type BackupPeriod } from "@/lib/backup"
import { readdirSync, statSync, readFileSync, existsSync } from "fs"
import { join } from "path"

function getBackupDir(): string {
  return process.env.BACKUP_DIR || "./backups"
}

interface BackupFileInfo {
  period: string
  filename: string
  csvSize: number
  date: string
  rowCount: number | null
  checksumValid: boolean | null
}

function listBackups(): BackupFileInfo[] {
  const baseDir = getBackupDir()
  const results: BackupFileInfo[] = []
  const periods = ["daily", "weekly", "monthly", "full"] as const

  for (const period of periods) {
    const dir = join(baseDir, period)
    if (!existsSync(dir)) continue

    const files = readdirSync(dir).filter((f) => f.endsWith(".csv"))
    for (const csvFile of files) {
      const csvPath = join(dir, csvFile)
      const metaFile = csvFile.replace(/\.csv$/, ".meta.json")
      const metaPath = join(dir, metaFile)

      const csvStat = statSync(csvPath)
      let rowCount: number | null = null
      let checksumValid: boolean | null = null

      if (existsSync(metaPath)) {
        try {
          const meta = JSON.parse(readFileSync(metaPath, "utf8"))
          rowCount = meta.rowCount ?? null
          const { createHash } = require("crypto")
          const csvContent = readFileSync(csvPath, "utf8")
          const checksum = createHash("sha256").update(csvContent, "utf8").digest("hex")
          checksumValid = checksum === meta.csvChecksum
        } catch {
          checksumValid = null
        }
      }

      results.push({
        period,
        filename: csvFile,
        csvSize: csvStat.size,
        date: csvStat.mtime.toISOString(),
        rowCount,
        checksumValid,
      })
    }
  }

  results.sort((a, b) => b.date.localeCompare(a.date))
  return results
}

export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const user = session.user as { role?: string }
  if (user.role !== "admin") {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 })
  }

  const backups = listBackups()

  const lastBackupByPeriod: Record<string, string> = {}
  for (const b of backups) {
    if (!lastBackupByPeriod[b.period] || b.date > lastBackupByPeriod[b.period]) {
      lastBackupByPeriod[b.period] = b.date
    }
  }

  return NextResponse.json({ backups, lastBackupByPeriod })
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const user = session.user as { role?: string }
  if (user.role !== "admin") {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 })
  }

  const body = await req.json()
  const { period } = body as { period?: string }

  if (!period || !["daily", "weekly", "monthly", "full"].includes(period)) {
    return NextResponse.json(
      { error: "period must be daily, weekly, monthly, or full" },
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
