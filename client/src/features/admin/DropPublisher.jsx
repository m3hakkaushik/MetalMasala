import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useRef, useState } from 'react';
import { Button } from '../../components/ui/Button';
import { Field } from '../../components/ui/Field';
import { useSocket } from '../../hooks/useSocket';
import { useAuth } from '../../stores/auth.store';
import { useUi } from '../../stores/ui.store';

export function DropPublisher() {
  const client = useQueryClient();
  const userId = useAuth((state) => state.user.id);
  const live = useRef(null);
  const [connected, setConnected] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const subscribe = useCallback(
    (socket) => {
      live.current = socket;
      const reload = () => {
        void client.invalidateQueries({ queryKey: ['admin', userId] });
      };
      const online = () => {
        setConnected(true);
        reload();
      };
      const offline = () => setConnected(false);
      const order = ({ orderNumber }) => {
        useUi.getState().announce(`New order ${orderNumber}`);
        reload();
      };
      const stock = ({ name, stock }) =>
        useUi.getState().announce(`${name}: ${stock} left in stock`);
      for (const [event, listener] of [
        ['connect', online],
        ['disconnect', offline],
        ['order:new', order],
        ['order:status', reload],
        ['stock:low', stock],
      ]) {
        socket.on(event, listener);
      }
      if (socket.connected) online();
      return () => {
        socket.off('connect', online);
        socket.off('disconnect', offline);
        socket.off('order:new', order);
        socket.off('order:status', reload);
        socket.off('stock:low', stock);
        live.current = null;
      };
    },
    [client, userId],
  );
  useSocket('/admin', subscribe);

  function publish(event) {
    event.preventDefault();
    if (!live.current?.connected || sending) return;
    const form = event.currentTarget;
    const data = new FormData(form);
    const productSlug = data.get('productSlug').trim();
    setError('');
    setSending(true);
    live.current.timeout(5000).emit(
      'drop:publish',
      {
        title: data.get('title'),
        message: data.get('message'),
        ...(productSlug && { productSlug }),
      },
      (timeout, result) => {
        setSending(false);
        if (timeout || !result?.ok) {
          setError(
            result?.message ??
              'No response received. Check the storefront before retrying.',
          );
        } else {
          form.reset();
          useUi.getState().announce('Drop announced');
        }
      },
    );
  }

  return (
    <details className="account-panel admin-drop">
      <summary>Announce a drop</summary>
      <form className="form-stack" onSubmit={publish}>
        <Field label="Title" name="title" maxLength={80} required />
        <Field label="Message" name="message" maxLength={240} required />
        <Field
          label="Product slug (optional)"
          name="productSlug"
          maxLength={120}
          pattern="[a-z0-9]+(-[a-z0-9]+)*"
        />
        {!connected && <p role="status">Connecting to live updates…</p>}
        {error && <p role="alert">{error}</p>}
        <Button type="submit" disabled={!connected || sending}>
          {sending ? 'Publishing…' : 'Publish announcement'}
        </Button>
      </form>
    </details>
  );
}
