import urls from "@/constants/urls"
import { api } from "@/lib/api"
import type { Role, User } from "@/types"

export async function listUsers(): Promise<User[]> {
  const { data } = await api.get<{ users: User[] }>(urls.getUsers)
  return data.users
}

export async function createUser(input: {
  email: string
  name?: string
  role?: Role
}): Promise<User> {
  const { data } = await api.post<{ user: User }>(urls.createUser, input)
  return data.user
}

export async function updateUser(
  id: string,
  patch: { active?: boolean; role?: Role }
): Promise<User> {
  const { data } = await api.put<{ user: User }>(urls.updateUser(id), patch)
  return data.user
}

export async function deleteUser(id: string): Promise<void> {
  await api.delete(urls.deleteUser(id))
}
