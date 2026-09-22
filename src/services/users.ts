import urls from "@/constants/urls"
import { api, unwrap } from "@/lib/api"
import type { ApiEnvelope, Role, User, UserPage } from "@/types"

export async function listUsers(params?: {
  page?: number
  limit?: number
}): Promise<UserPage> {
  return unwrap(await api.get<ApiEnvelope<UserPage>>(urls.getUsers, { params }))
}

export async function getUser(id: string): Promise<User> {
  return unwrap(await api.get<ApiEnvelope<User>>(urls.getUser(id)))
}

export async function createUser(input: {
  email: string
  name: string
  role?: Role
}): Promise<User> {
  return unwrap(await api.post<ApiEnvelope<User>>(urls.createUser, input))
}

/** Partial update. The server rejects a patch that touches none of the three. */
export async function updateUser(
  id: string,
  patch: { name?: string; role?: Role; active?: boolean }
): Promise<User> {
  return unwrap(await api.put<ApiEnvelope<User>>(urls.updateUser(id), patch))
}

export async function deleteUser(id: string): Promise<void> {
  await api.delete(urls.deleteUser(id))
}
