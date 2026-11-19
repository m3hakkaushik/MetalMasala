import { useEffect } from 'react';
import { io } from 'socket.io-client';
import { socketUrl } from '../api/config';
import http, { refreshAccess } from '../api/http';
import { useAuth } from '../stores/auth.store';

const connections = new Map();
const getToken = () => useAuth.getState().accessToken;
const RECONNECT_OPTIONS = {
  reconnection: true,
  reconnectionAttempts: Infinity,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 30_000,
  randomizationFactor: 0.5,
};
let renewal;

function renewSession() {
  if (renewal) return renewal;
  const version = useAuth.getState().sessionVersion;
  renewal = (async () => {
    try {
      await refreshAccess();
    } catch (error) {
      if (
        error.status === 401 &&
        useAuth.getState().sessionVersion === version
      ) {
        useAuth.getState().clear();
      }
    } finally {
      renewal = undefined;
    }
  })();
  return renewal;
}

function createConnection(namespace) {
  const needsAuth = namespace !== '/';
  const socket = io(socketUrl + (needsAuth ? namespace : ''), {
    autoConnect: false,
    ...RECONNECT_OPTIONS,
    auth: (done) => done({ token: needsAuth ? getToken() : undefined }),
  });
  let blockedToken;
  let reconnectTimer;
  function connect() {
    if (!needsAuth || (getToken() && getToken() !== blockedToken))
      socket.connect();
  }
  const handleOnline = () => {
    if (connections.has(namespace) && !socket.connected && !renewal) connect();
  };
  const handleVisibility = () => {
    if (
      document.visibilityState === 'visible' &&
      connections.has(namespace) &&
      !socket.connected &&
      !renewal
    ) {
      connect();
    }
  };
  window.addEventListener('online', handleOnline);
  document.addEventListener('visibilitychange', handleVisibility);
  const unsubscribe = needsAuth
    ? useAuth.subscribe((state, previous) => {
        if (state.accessToken !== previous.accessToken) {
          socket.disconnect();
          connect();
        }
      })
    : () => {};
  if (needsAuth) {
    socket.on('session:expired', () => {
      void renewSession();
    });
    socket.on('connect_error', (error) => {
      if (
        error.data?.code === 'TOKEN_EXPIRED' ||
        error.data?.code === 'UNAUTHENTICATED'
      ) {
        void renewSession();
      } else if (error.data?.code === 'FORBIDDEN') {
        blockedToken = getToken();
        void http
          .get('/auth/me')
          .then(({ data }) => {
            if (getToken() === blockedToken)
              useAuth.getState().setUser(data.user);
          })
          .catch(() => {});
      }
    });
    socket.on('disconnect', (reason) => {
      if (reason === 'io server disconnect') {
        // Give password changes time to apply their replacement token before reconnecting.
        clearTimeout(reconnectTimer);
        reconnectTimer = setTimeout(() => {
          if (connections.has(namespace) && !renewal) connect();
        }, 100);
      }
    });
  }
  function cleanup() {
    clearTimeout(reconnectTimer);
    window.removeEventListener('online', handleOnline);
    document.removeEventListener('visibilitychange', handleVisibility);
    unsubscribe();
  }
  return { socket, connect, cleanup, users: 0 };
}

// [L40] Share one Socket.IO connection per namespace and detach subscriptions on navigation.
export function useSocket(namespace, attach) {
  useEffect(() => {
    let connection = connections.get(namespace);
    if (!connection) {
      connection = createConnection(namespace);
      connections.set(namespace, connection);
    }
    connection.users++;
    const detach = attach(connection.socket);
    connection.connect();
    return () => {
      detach?.();
      connection.users--;
      if (connection.users) return;
      connection.cleanup();
      connection.socket.disconnect();
      connections.delete(namespace);
    };
  }, [namespace, attach]);
}
