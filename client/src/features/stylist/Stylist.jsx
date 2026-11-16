import { useMutation } from '@tanstack/react-query';
import { Sparkles } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { askStylist } from '../../api/ai';
import { Button } from '../../components/ui/Button';
import { Drawer } from '../../components/ui/Drawer';
import { Field } from '../../components/ui/Field';
import { ProductCard } from '../catalogue/ProductCard';

const suggestions = [
  'Something loud for a sangeet',
  'Under ₹800 for office',
  'Everyday oxidized silver',
];

export function Stylist() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [turns, setTurns] = useState([]);
  const last = useRef(null);
  const nextMessage = useMutation({
    mutationFn: (message) =>
      askStylist({
        message,
        history: turns
          .slice(-6)
          .map(({ role, content }) => ({ role, content })),
      }),
    onSuccess: ({ data }) =>
      setTurns((current) => [
        ...current,
        {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: data.reply,
          products: data.products,
        },
      ]),
  });
  useEffect(() => {
    if (open && turns.length)
      last.current?.scrollIntoView({ block: 'nearest' });
  }, [open, turns.length]);
  function ask(message) {
    const content = message.trim();
    if (!content || nextMessage.isPending) return;
    setInput('');
    nextMessage.mutate(content);
    setTurns((current) => [
      ...current,
      { id: crypto.randomUUID(), role: 'user', content },
    ]);
  }
  return (
    <>
      <Button
        className="stylist-trigger"
        variant="dark"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
      >
        <Sparkles size={20} aria-hidden="true" /> <span>Ask the stylist</span>
      </Button>
      <Drawer open={open} onClose={() => setOpen(false)} title="Masala Stylist">
        <div className="drawer-padding stylist-body">
          <p>Tell me what you’re wearing or what you’d like to spend.</p>
          {turns.length === 0 && (
            <div className="form-actions">
              {suggestions.map((text) => (
                <button
                  type="button"
                  key={text}
                  className="chip"
                  onClick={() => ask(text)}
                >
                  {text}
                </button>
              ))}
            </div>
          )}
          <div
            role="log"
            aria-label="Stylist conversation"
            className="stylist-log"
          >
            {turns.map((turn) => (
              <article
                key={turn.id}
                className={`stylist-turn stylist-turn--${turn.role}`}
              >
                <p>
                  <strong>
                    {turn.role === 'user' ? 'You' : 'Masala Stylist'}
                  </strong>{' '}
                  {turn.content}
                </p>
                {!!turn.products?.length && (
                  <div
                    className="stylist-products"
                    onClick={(event) => {
                      if (event.target.closest('a')) setOpen(false);
                    }}
                  >
                    {turn.products.map((product) => (
                      <ProductCard key={product.id} product={product} />
                    ))}
                  </div>
                )}
              </article>
            ))}
            <span ref={last} />
          </div>
          {nextMessage.isPending && (
            <p role="status">The stylist is looking through the collection…</p>
          )}
          {nextMessage.isError && (
            <div className="form-stack" role="alert">
              <p>
                {nextMessage.error.code === 'RATE_LIMITED'
                  ? nextMessage.error.message
                  : 'The stylist is unavailable right now.'}
              </p>
              <Button
                to="/shop"
                variant="outline"
                onClick={() => setOpen(false)}
              >
                Explore the shop
              </Button>
            </div>
          )}
        </div>
        <form
          className="stylist-form form-stack"
          onSubmit={(event) => {
            event.preventDefault();
            ask(input);
          }}
        >
          <Field
            label="Ask the stylist"
            maxLength={500}
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder="A gift under ₹1,000"
          />
          <Button
            type="submit"
            disabled={!input.trim() || nextMessage.isPending}
          >
            Send
          </Button>
        </form>
      </Drawer>
    </>
  );
}
