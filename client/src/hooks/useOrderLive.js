import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useState } from 'react';
import { nextStatuses } from '../api/commerce';
import { getOrder } from '../api/orders';
import { useSocket } from './useSocket';

const FALLBACK_POLL_MS = 10_000;

export function useOrderLive(id, userId) {
  const client = useQueryClient();
  const [live, setLive] = useState(false);

  const subscribe = useCallback(
    (socket) => {
      let active = true;
      const queryKey = ['order', userId, id];
      const reload = () => void client.invalidateQueries({ queryKey });
      const join = () =>
        socket.emit('order:subscribe', { orderId: id }, (result) => {
          if (!active) return;
          if (result?.ok) {
            setLive(true);
            reload();
          } else {
            setLive(false);
          }
        });
      const handleDisconnect = () => {
        if (!active) return;
        setLive(false);
        if (navigator.onLine) reload();
      };
      const handleConnectError = () => {
        if (!active) return;
        setLive(false);
      };
      const update = ({ orderId }) => {
        if (orderId === id) reload();
      };
      socket.on('connect', join);
      socket.on('disconnect', handleDisconnect);
      socket.on('connect_error', handleConnectError);
      socket.on('order:status', update);
      if (socket.connected) join();
      else setLive(false);
      return () => {
        active = false;
        setLive(false);
        if (socket.connected) socket.emit('order:unsubscribe', { orderId: id });
        socket.off('connect', join);
        socket.off('disconnect', handleDisconnect);
        socket.off('connect_error', handleConnectError);
        socket.off('order:status', update);
      };
    },
    [client, id, userId],
  );

  useSocket('/account', subscribe);

  useEffect(() => {
    const queryKey = ['order', userId, id];
    const handleOnline = () => void client.invalidateQueries({ queryKey });
    const handleOffline = () => setLive(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [client, id, userId]);

  return useQuery({
    queryKey: ['order', userId, id],
    queryFn: ({ signal }) => getOrder(id, signal),
    refetchOnReconnect: true,
    refetchInterval: ({ state }) => {
      if (live) return false;
      const status = state.data?.data?.status;
      return status && nextStatuses(status).length ? FALLBACK_POLL_MS : false;
    },
  });
}
