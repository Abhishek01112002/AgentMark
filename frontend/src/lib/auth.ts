export const getToken = (): string | null => {
  return localStorage.getItem('agentmark_token');
};

export const setToken = (token: string): void => {
  localStorage.setItem('agentmark_token', token);
};

export const removeToken = (): void => {
  localStorage.removeItem('agentmark_token');
};

export const getUser = () => {
  const user = localStorage.getItem('agentmark_user');
  return user ? JSON.parse(user) : null;
};

export const setUser = (user: any): void => {
  localStorage.setItem('agentmark_user', JSON.stringify(user));
};

export const removeUser = (): void => {
  localStorage.removeItem('agentmark_user');
};

export const isAuthenticated = (): boolean => {
  return !!getToken();
};

export const logout = (): void => {
  removeToken();
  removeUser();
};
