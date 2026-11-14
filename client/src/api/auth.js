import { useAuth } from '../stores/auth.store';
import http, { refreshAccess } from './http';

export const login = (fields) => http.post('/auth/login', fields);
export const register = (fields) => http.post('/auth/register', fields);
export const logout = () => http.post('/auth/logout');
export const changePassword = (fields) => http.patch('/auth/password', fields);

export async function restoreSession() {
  const { setSession, clear } = useAuth.getState();
  try {
    const accessToken = await refreshAccess();
    const { data } = await http.get('/auth/me');
    setSession({ user: data.user, accessToken });
  } catch {
    clear();
  }
}
