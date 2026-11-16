import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { writeReview } from '../../api/reviews';
import { reviewSchema } from '../../api/validation';
import { Button } from '../../components/ui/Button';
import { Field } from '../../components/ui/Field';
import { RequestError } from '../../components/ui/Status';

export function ReviewForm({ productId, saved }) {
  const {
    register,
    handleSubmit,
    setError,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(reviewSchema),
    defaultValues: { rating: '', title: '', body: '' },
  });
  async function submit(data) {
    try {
      await writeReview(productId, data);
      await saved();
      reset();
    } catch (error) {
      setError('root.api', { message: error.message });
    }
  }
  return (
    <form
      className="form-stack review-form"
      noValidate
      onSubmit={handleSubmit(submit)}
    >
      <Field
        as="select"
        label="Rating"
        error={errors.rating?.message}
        {...register('rating')}
      >
        <option value="">Choose a rating</option>
        {[5, 4, 3, 2, 1].map((value) => (
          <option key={value} value={value}>
            {value} out of 5
          </option>
        ))}
      </Field>
      <Field
        label="Title"
        error={errors.title?.message}
        {...register('title')}
      />
      <Field
        as="textarea"
        rows={4}
        label="Your review"
        error={errors.body?.message}
        {...register('body')}
      />
      {errors.root?.api && <RequestError error={errors.root.api} />}
      <Button type="submit" disabled={isSubmitting}>
        Post review
      </Button>
    </form>
  );
}
