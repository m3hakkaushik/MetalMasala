import { useQuery } from '@tanstack/react-query';
import { isMocked } from '../api/config';
import { nextStatuses } from '../api/commerce';
import { getOrder } from '../api/orders';

export function useOrderLive(id, userId) {
  const simulate = isMocked('orders');
  return useQuery({
    queryKey: ['order', userId, id],
    queryFn: ({ signal }) =>
      getOrder(id, signal, simulate ? { demoTrack: 'true' } : undefined),
    refetchOnMount: simulate ? 'always' : true,
    refetchInterval: ({ state }) =>
      simulate && nextStatuses(state.data?.data.status).length ? 15_000 : false,
  });
}
