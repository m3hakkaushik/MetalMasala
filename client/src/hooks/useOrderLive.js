import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import { getOrder } from '../api/orders';
import { useSocket } from './useSocket';

export function useOrderLive(id, userId) {
  const client = useQueryClient();
  const subscribe = useCallback(
    (socket) => {
      const queryKey = ['order', userId, id];
      const reload = () => void client.invalidateQueries({ queryKey });
      const join = () =>
        socket.emit('order:subscribe', { orderId: id }, ({ ok }) => {
          if (ok) reload();
        });
      const update = ({ orderId }) => {
        if (orderId === id) reload();
      };
      socket.on('connect', join);
      socket.on('order:status', update);
      if (socket.connected) join();
      return () => {
        if (socket.connected) socket.emit('order:unsubscribe', { orderId: id });
        socket.off('connect', join);
        socket.off('order:status', update);
      };
    },
    [client, id, userId],
  );
  useSocket('/account', subscribe);
  return useQuery({
    queryKey: ['order', userId, id],
    queryFn: ({ signal }) => getOrder(id, signal),
  });
}
