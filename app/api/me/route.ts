import { NextResponse } from "next/server"
import { auth } from "@/auth"

export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const user = session.user as { id?: string; name?: string; role?: string }
  return NextResponse.json({ id: user.id, username: user.name, role: user.role })
}
