import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { Nav } from "@/components/nav"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()
  if (!session) redirect("/login")

  const user = session.user as { name?: string; role?: string }

  return (
    <div className="min-h-screen flex flex-col">
      <Nav username={user.name || "user"} role={user.role || "operator"} />
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {children}
      </main>
    </div>
  )
}
