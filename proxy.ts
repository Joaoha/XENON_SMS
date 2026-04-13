export { auth as proxy } from "@/auth"

export const config = {
  matcher: ["/((?!login|api/auth|api/seed|_next/static|_next/image|favicon.ico).*)"],
}
