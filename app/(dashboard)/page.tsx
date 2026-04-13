import { redirect } from "next/navigation"

// The (dashboard) group page.tsx and app/page.tsx both resolve to /.
// We redirect from here to /dashboard to avoid the conflict.
export default function DashboardRoot() {
  redirect("/dashboard")
}
