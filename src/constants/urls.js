const urls = {
  requestOtp: '/auth/request-otp',
  verifyOtp: '/auth/verify-otp',
  getUsers: '/users',
  createUser: '/users/create',
  getUser: (id) => `/users/get/${id}`,
  updateUser: (id) => `/users/update/${id}`,
  deleteUser: (id) => `/users/delete/${id}`,
  search: '/search',
  health: '/health',
  healthServices: '/health/services',
};

export default urls;
