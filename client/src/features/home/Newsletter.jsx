import { useMutation } from '@tanstack/react-query';
import { ArrowRight } from 'lucide-react';
import { subscribe } from '../../api/marketing';
import { Button } from '../../components/ui/Button';

export function Newsletter() {
  const signup = useMutation({ mutationFn: subscribe });
  function submit(event) {
    event.preventDefault();
    signup.mutate(new FormData(event.currentTarget).get('email'));
  }

  return (
    <section className="newsletter">
      <div className="site-width newsletter__inner">
        <div>
          <h2>Join the drop list</h2>
          <p>First look at new pieces, restocks and studio stories.</p>
        </div>
        <form className="newsletter__form" onSubmit={submit}>
          <label htmlFor="newsletter-email">Email address</label>
          <div>
            <input
              id="newsletter-email"
              name="email"
              type="email"
              placeholder="you@example.com"
              autoComplete="email"
              required
            />
            <Button type="submit" variant="dark" disabled={signup.isPending}>
              Join the list <ArrowRight size={17} />
            </Button>
          </div>
          <p className="newsletter__status" role="status">
            {signup.data?.message ?? signup.error?.message}
          </p>
        </form>
      </div>
    </section>
  );
}
