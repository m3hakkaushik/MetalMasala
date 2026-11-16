import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router-dom';
import { sendContact } from '../api/marketing';
import { contactSchema } from '../api/validation';
import { Seo } from '../app/Seo';
import { Button } from '../components/ui/Button';
import { Field } from '../components/ui/Field';
import { RequestError } from '../components/ui/Status';

const questions = [
  [
    'What metals do you use?',
    'The collection includes brass, copper, German silver, sterling silver and alloy. The material for each piece is listed on its product page.',
  ],
  [
    'How do I take care of my jewellery?',
    'Wipe it with a soft cloth after wearing it. Keep it dry, away from perfume and moisture, and store it in its pouch.',
  ],
  [
    'How much does shipping cost?',
    'Standard shipping is ₹79 across India. It’s free when your subtotal reaches ₹999, and cash on delivery adds ₹49.',
  ],
  [
    'Where can I track an order?',
    'Sign in and open the Orders section of your account. Choose Track order beside your order number.',
  ],
];

export function About() {
  return (
    <article className="site-width info-page">
      <Seo title="About Metal मसाला" />
      <h1>Jewellery with a little masala</h1>
      <div className="info-copy">
        <p>
          Metal मसाला is an Indian jewellery collection built around the texture
          and character of handworked metal. There are jhumkas made to move,
          cuffs with visible hammer marks, and green patinas that show traces of
          the copper underneath.
        </p>
        <h2>Meet the hands behind each piece</h2>
        <p>
          The Craft section on each product page names its studio, region and
          technique. In this capstone demo, the studios and product
          illustrations are fictional.
        </p>
        <Button to="/shop">Explore the collection</Button>
      </div>
    </article>
  );
}

export function Faq() {
  return (
    <div className="site-width info-page">
      <Seo title="Frequently asked questions" />
      <h1>Frequently asked questions</h1>
      <div className="info-copy info-faq">
        {questions.map(([question, answer]) => (
          <details key={question}>
            <summary>{question}</summary>
            <p>{answer}</p>
          </details>
        ))}
      </div>
    </div>
  );
}

export function Shipping() {
  return (
    <article className="site-width info-page">
      <Seo title="Shipping and returns" />
      <h1>Shipping and returns</h1>
      <div className="info-copy">
        <h2>Shipping within India</h2>
        <p>
          Standard shipping is ₹79 and becomes free at a subtotal of ₹999. Cash
          on delivery carries a ₹49 fee. You can check the final total before
          placing your order.
        </p>
        <h2>Order updates and returns</h2>
        <p>
          Open{' '}
          <Link className="text-link" to="/account?tab=orders">
            your orders
          </Link>{' '}
          to see the delivery timeline or cancel an order that has been placed
          or confirmed. For a return request,{' '}
          <Link className="text-link" to="/contact">
            contact us
          </Link>{' '}
          with your order number and the piece you’re asking about.
        </p>
        <p className="form-help">
          This capstone demo uses simulated payments and deliveries.
        </p>
      </div>
    </article>
  );
}

export function Contact() {
  const [status, setStatus] = useState('');
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(contactSchema),
    defaultValues: { name: '', email: '', message: '' },
  });
  async function submit(fields) {
    setStatus('');
    try {
      const result = await sendContact(fields);
      reset();
      setStatus(result.message ?? 'Your message was sent.');
    } catch (error) {
      setError('root.api', { message: error.message });
    }
  }
  return (
    <div className="site-width info-page">
      <Seo title="Contact the studio" />
      <h1>Contact the studio</h1>
      <div className="info-copy">
        <p>
          Ask us about a piece, care, or an order. If you’re writing about an
          order, include its order number.
        </p>
        <form
          className="form-stack contact-form"
          onSubmit={handleSubmit(submit)}
          noValidate
        >
          <Field
            label="Name"
            autoComplete="name"
            error={errors.name?.message}
            {...register('name')}
          />
          <Field
            label="Email address"
            type="email"
            autoComplete="email"
            error={errors.email?.message}
            {...register('email')}
          />
          <Field
            label="Message"
            as="textarea"
            rows={5}
            error={errors.message?.message}
            {...register('message')}
          />
          {errors.root?.api && <RequestError error={errors.root.api} />}
          <Button type="submit" disabled={isSubmitting}>
            Send message
          </Button>
          <p role="status">{status}</p>
        </form>
      </div>
    </div>
  );
}
