const urls = {
  requestOtp: '/auth/request-otp',
  verifyOtp: '/auth/verify-otp',
  getUsers: '/users/list',
  createUser: '/users/create',
  getUser: (id) => `/users/get/${id}`,
  updateUser: (id) => `/users/update/${id}`,
  deleteUser: (id) => `/users/delete/${id}`,
  searchProfiles: '/search/profiles',
  searchAsk: '/search/ask',
  searchEndConversation: '/search/conversations/end',
  health: '/health',
  healthServices: '/health/services',
};

export default urls;
