import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { CSV_TEMPLATE_EXAMPLE } from "@/lib/csv-import"

export async function GET() {
  const session = await auth()
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  return new NextResponse(CSV_TEMPLATE_EXAMPLE, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": 'attachment; filename="destination-locations-template.csv"',
    },
  })
}
