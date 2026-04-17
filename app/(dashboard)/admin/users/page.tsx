"use client"

import { useState, useEffect } from "react"

interface User {
  id: string
  username: string
  role: string
  isActive: boolean
  createdAt: string
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({ username: "", password: "", role: "operator" })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const [resetPasswordId, setResetPasswordId] = useState<string | null>(null)
  const [newPassword, setNewPassword] = useState("")

  async function loadUsers() {
    const res = await fetch("/api/users")
    if (res.ok) setUsers(await res.json())
    setLoading(false)
  }

  useEffect(() => {
    loadUsers()
  }, [])

  async function addUser() {
    if (!form.username || !form.password) return
    setSaving(true)
    setError("")
    setSuccess("")
    const res = await fetch("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    })
    setSaving(false)
    if (!res.ok) {
      const data = await res.json()
      setError(data.error || "Failed to create user")
    } else {
      setForm({ username: "", password: "", role: "operator" })
      setSuccess("User created successfully")
      loadUsers()
    }
  }

  async function toggleActive(user: User) {
    setError("")
    setSuccess("")
    const res = await fetch(`/api/users/${user.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !user.isActive }),
    })
    if (!res.ok) {
      const data = await res.json()
      setError(data.error || "Failed to update user")
    } else {
      setSuccess(`User ${user.isActive ? "deactivated" : "activated"}`)
      loadUsers()
    }
  }

  async function changeRole(user: User, role: string) {
    setError("")
    setSuccess("")
    const res = await fetch(`/api/users/${user.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role }),
    })
    if (!res.ok) {
      const data = await res.json()
      setError(data.error || "Failed to update role")
    } else {
      setSuccess(`Role updated to ${role}`)
      loadUsers()
    }
  }

  async function deleteUser(id: string) {
    setError("")
    setSuccess("")
    const res = await fetch(`/api/users/${id}`, { method: "DELETE" })
    if (!res.ok) {
      const data = await res.json()
      setError(data.error || "Failed to delete user")
    } else {
      const data = await res.json()
      setSuccess(data.deactivated ? "User has transactions and was deactivated instead" : "User deleted")
      loadUsers()
    }
    setConfirmDelete(null)
  }

  async function resetPassword() {
    if (!resetPasswordId || !newPassword) return
    setError("")
    setSuccess("")
    const res = await fetch(`/api/users/${resetPasswordId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: newPassword }),
    })
    if (!res.ok) {
      const data = await res.json()
      setError(data.error || "Failed to reset password")
    } else {
      setSuccess("Password reset successfully")
    }
    setResetPasswordId(null)
    setNewPassword("")
  }

  const inputCls = "mt-1 w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 px-2 py-1.5 text-sm"

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">User Management</h1>

      {error && <div className="rounded-md bg-red-50 dark:bg-red-900/30 p-3 text-sm text-red-700 dark:text-red-400">{error}</div>}
      {success && <div className="rounded-md bg-green-50 dark:bg-green-900/30 p-3 text-sm text-green-700 dark:text-green-400">{success}</div>}

      {/* Add User Form */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-5 space-y-3 max-w-md">
        <h2 className="font-semibold text-gray-800 dark:text-gray-200">Add User</h2>
        <div>
          <label className="block text-xs text-gray-500 dark:text-gray-400">Username</label>
          <input
            value={form.username}
            onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))}
            placeholder="username"
            className={inputCls}
          />
        </div>
        <div>
          <label className="block text-xs text-gray-500 dark:text-gray-400">Password</label>
          <input
            type="password"
            value={form.password}
            onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
            placeholder="password"
            className={inputCls}
          />
        </div>
        <div>
          <label className="block text-xs text-gray-500 dark:text-gray-400">Role</label>
          <select
            value={form.role}
            onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}
            className={inputCls}
          >
            <option value="operator">Operator</option>
            <option value="admin">Admin</option>
          </select>
        </div>
        <button
          onClick={addUser}
          disabled={saving || !form.username || !form.password}
          className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 disabled:opacity-50"
        >
          {saving ? "Creating..." : "Add User"}
        </button>
      </div>

      {/* Users Table */}
      {!loading && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-900">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Username</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Role</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Created</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {users.map((user) => (
                <tr key={user.id} className={!user.isActive ? "opacity-50" : ""}>
                  <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100 font-medium">{user.username}</td>
                  <td className="px-4 py-3 text-sm">
                    <select
                      value={user.role}
                      onChange={(e) => changeRole(user, e.target.value)}
                      className="rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-xs px-1.5 py-0.5"
                    >
                      <option value="operator">operator</option>
                      <option value="admin">admin</option>
                    </select>
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${user.isActive ? "bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400" : "bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400"}`}>
                      {user.isActive ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                    {new Date(user.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-sm text-right space-x-2">
                    <button
                      onClick={() => toggleActive(user)}
                      className="text-xs text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 underline"
                    >
                      {user.isActive ? "Deactivate" : "Activate"}
                    </button>
                    <button
                      onClick={() => setResetPasswordId(user.id)}
                      className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 underline"
                    >
                      Reset Password
                    </button>
                    <button
                      onClick={() => setConfirmDelete(user.id)}
                      className="text-xs text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 underline"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 max-w-sm w-full mx-4 space-y-4">
            <h3 className="font-semibold text-gray-900 dark:text-gray-100">Delete User</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Are you sure? If the user has transactions, they will be deactivated instead of deleted.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setConfirmDelete(null)}
                className="px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={() => deleteUser(confirmDelete)}
                className="px-3 py-1.5 bg-red-600 text-white text-sm rounded-md hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reset Password Modal */}
      {resetPasswordId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 max-w-sm w-full mx-4 space-y-4">
            <h3 className="font-semibold text-gray-900 dark:text-gray-100">Reset Password</h3>
            <div>
              <label className="block text-xs text-gray-500 dark:text-gray-400">New Password</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="new password"
                className={inputCls}
              />
            </div>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => { setResetPasswordId(null); setNewPassword("") }}
                className="px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={resetPassword}
                disabled={!newPassword}
                className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                Reset
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
