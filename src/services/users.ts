import urls from "@/constants/urls"
import { api, unwrap } from "@/lib/api"
import type {
  ApiEnvelope,
  CreatedUser,
  Role,
  User,
  UserListParams,
  UserPage,
} from "@/types"

export async function listUsers(params?: UserListParams): Promise<UserPage> {
  return unwrap(await api.get<ApiEnvelope<UserPage>>(urls.getUsers, { params }))
}

export async function getUser(id: string): Promise<User> {
  return unwrap(await api.get<ApiEnvelope<User>>(urls.getUser(id)))
}

/** Also emails the new user; `invited` says whether that worked. */
export async function createUser(input: {
  email: string
  name: string
  role?: Role
}): Promise<CreatedUser> {
  return unwrap(await api.post<ApiEnvelope<CreatedUser>>(urls.createUser, input))
}

export type UserPatch = { name?: string; role?: Role; active?: boolean }

/**
 * Partial update. The server rejects a patch that touches none of the three,
 * and a change to your own role or status (403).
 */
export async function updateUser(id: string, patch: UserPatch): Promise<User> {
  return unwrap(await api.put<ApiEnvelope<User>>(urls.updateUser(id), patch))
}

export async function deleteUser(id: string): Promise<void> {
  await api.delete(urls.deleteUser(id))
}
