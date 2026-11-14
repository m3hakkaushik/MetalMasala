import axios from 'axios';
import { useAuth } from '../stores/auth.store';
import { apiUrl } from './config';
import { waitForApiSetup } from './networkReady';

const http = axios.create({ baseURL: apiUrl, withCredentials: true });
const sessionHttp = axios.create({ baseURL: apiUrl, withCredentials: true });
let pendingRefresh;

function unwrap(response) {
  return response.status === 204
    ? { data: null }
    : {
        data: response.data.data,
        meta: response.data.meta,
        message: response.data.message,
      };
}

function normalize(error) {
  const { response } = error;
  return {
    code: response?.data?.error?.code ?? 'REQUEST_FAILED',
    message:
      response?.data?.error?.message ?? 'The request failed. Please try again.',
    details: response?.data?.error?.details,
    status: response?.status,
  };
}

export async function refreshAccess() {
  if (!pendingRefresh) {
    const version = useAuth.getState().sessionVersion;
    pendingRefresh = (async () => {
      try {
        await waitForApiSetup();
        const { data } = unwrap(await sessionHttp.post('/auth/refresh'));
        if (useAuth.getState().sessionVersion !== version)
          throw new Error('Session changed');
        useAuth.getState().setToken(data.accessToken);
        return data.accessToken;
      } catch (error) {
        throw normalize(error);
      } finally {
        pendingRefresh = undefined;
      }
    })();
  }
  return pendingRefresh;
}

http.interceptors.request.use(async (config) => {
  await waitForApiSetup();
  const { accessToken, sessionVersion } = useAuth.getState();
  config.sessionVersion = sessionVersion;
  if (accessToken) config.headers.set('Authorization', `Bearer ${accessToken}`);
  const devRole = import.meta.env.VITE_DEV_ROLE;
  if (devRole) config.headers.set('x-dev-role', devRole);
  return config;
});

http.interceptors.response.use(unwrap, async (error) => {
  const failure = normalize(error);
  const request = error.config;
  const { accessToken, sessionVersion } = useAuth.getState();
  if (
    failure.status !== 401 ||
    failure.code !== 'TOKEN_EXPIRED' ||
    !request ||
    request._retried ||
    request.sessionVersion !== sessionVersion ||
    !accessToken
  ) {
    throw failure;
  }
  request._retried = true;
  try {
    if (request.headers.get('Authorization') === `Bearer ${accessToken}`)
      await refreshAccess();
  } catch {
    if (useAuth.getState().sessionVersion === sessionVersion) {
      useAuth.getState().clear();
      const { pathname, search, hash } = window.location;
      if (pathname !== '/login')
        window.location.assign(
          `/login?${new URLSearchParams({ returnTo: pathname + search + hash })}`,
        );
    }
    throw failure;
  }
  return http(request);
});

export default http;
