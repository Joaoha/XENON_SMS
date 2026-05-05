"use server"

import { signIn } from "@/auth"
import { redirect } from "next/navigation"

export async function loginAction(formData: FormData) {
  const username = formData.get("username") as string
  const password = formData.get("password") as string

  if (!username || !password) {
    redirect("/login?error=missing")
  }

  try {
    await signIn("credentials", {
      username,
      password,
      redirect: false,
    })
  } catch {
    redirect("/login?error=invalid")
  }

  redirect("/")
}
