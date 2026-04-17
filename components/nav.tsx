"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { signOut } from "next-auth/react"
import { ThemeToggle } from "./theme-toggle"

interface NavProps {
  username: string
  role: string
}

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: "📊" },
  { href: "/receive", label: "Receive Stock", icon: "📥" },
  { href: "/handout", label: "Hand Out", icon: "📤" },
  { href: "/transfer", label: "Transfer", icon: "🔄" },
  { href: "/transactions", label: "Transactions", icon: "📋" },
  { href: "/reports", label: "Reports", icon: "📈" },
  { href: "/admin/stock-items", label: "Stock Items", icon: "🗂️" },
  { href: "/admin/destinations", label: "Destinations", icon: "🏢" },
  { href: "/admin/storage-locations", label: "Storage Locations", icon: "📦" },
]

const adminItems = [
  { href: "/admin/users", label: "Users", icon: "👤" },
]

export function Nav({ username, role }: NavProps) {
  const pathname = usePathname()

  return (
    <nav className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center gap-6">
            <span className="flex flex-col leading-tight">
              <span className="font-bold text-lg text-blue-700 dark:text-blue-400">XENON</span>
              <span className="text-xs font-medium text-blue-500 dark:text-blue-300">Stock Management System</span>
            </span>
            <div className="hidden md:flex items-center gap-1">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    pathname === item.href
                      ? "bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300"
                      : "text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                  }`}
                >
                  <span className="mr-1">{item.icon}</span>
                  {item.label}
                </Link>
              ))}
              {role === "admin" && (
                <>
                  <span className="mx-1 text-gray-300 dark:text-gray-600">|</span>
                  {adminItems.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                        pathname === item.href
                          ? "bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300"
                          : "text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                      }`}
                    >
                      <span className="mr-1">{item.icon}</span>
                      {item.label}
                    </Link>
                  ))}
                </>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {username}{" "}
              <span className="px-1.5 py-0.5 rounded text-xs bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 uppercase">
                {role}
              </span>
            </span>
            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
            >
              Sign out
            </button>
          </div>
        </div>
      </div>
    </nav>
  )
}
