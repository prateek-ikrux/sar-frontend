/** API paths, relative to the axios baseURL (origin + /api/v1). */
const urls = {
  requestOtp: "/auth/request-otp",
  verifyOtp: "/auth/verify-otp",
  me: "/auth/me",
  getUsers: "/users/list",
  createUser: "/users/create",
  getUser: (id: string) => `/users/get/${id}`,
  updateUser: (id: string) => `/users/update/${id}`,
  deleteUser: (id: string) => `/users/delete/${id}`,
  searchProfiles: "/search/profiles",
  searchAsk: "/search/ask",
  searchAskStream: "/search/ask/stream",
  searchEndConversation: "/search/conversations/end",
  shortlist: "/shortlist/list",
  shortlistAdd: "/shortlist/add",
  shortlistNote: (profileId: string) => `/shortlist/note/${profileId}`,
  shortlistRemove: (profileId: string) => `/shortlist/remove/${profileId}`,
  health: "/health",
  healthServices: "/health/services",
} as const

export default urls
