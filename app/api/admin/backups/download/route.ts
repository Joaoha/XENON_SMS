import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { existsSync, readFileSync } from "fs"
import { join, basename } from "path"

function getBackupDir(): string {
  return process.env.BACKUP_DIR || "./backups"
}

export async function GET(req: Request) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const user = session.user as { role?: string }
  if (user.role !== "admin") {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 })
  }

  const url = new URL(req.url)
  const period = url.searchParams.get("period")
  const filename = url.searchParams.get("filename")
  const type = url.searchParams.get("type") || "csv"

  if (!period || !filename) {
    return NextResponse.json({ error: "period and filename are required" }, { status: 400 })
  }

  if (!["daily", "weekly", "monthly", "full"].includes(period)) {
    return NextResponse.json({ error: "Invalid period" }, { status: 400 })
  }

  const safeFilename = basename(filename)
  if (safeFilename !== filename) {
    return NextResponse.json({ error: "Invalid filename" }, { status: 400 })
  }

  const baseDir = getBackupDir()
  let filePath: string

  if (type === "meta") {
    const metaName = safeFilename.replace(/\.csv$/, ".meta.json")
    filePath = join(baseDir, period, metaName)
  } else {
    filePath = join(baseDir, period, safeFilename)
  }

  if (!existsSync(filePath)) {
    return NextResponse.json({ error: "File not found" }, { status: 404 })
  }

  const content = readFileSync(filePath)
  const contentType = type === "meta" ? "application/json" : "text/csv"
  const downloadName = basename(filePath)

  return new NextResponse(content, {
    headers: {
      "Content-Type": contentType,
      "Content-Disposition": `attachment; filename="${downloadName}"`,
    },
  })
}
