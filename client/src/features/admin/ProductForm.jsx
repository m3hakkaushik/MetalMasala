import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { Sparkles } from 'lucide-react';
import { useFieldArray, useForm } from 'react-hook-form';
import { createProduct, updateProduct } from '../../api/admin';
import { describeProduct } from '../../api/ai';
import { FINISHES, MATERIALS } from '../../api/catalogue';
import { productFormSchema } from '../../api/productFields';
import { Button } from '../../components/ui/Button';
import { Field } from '../../components/ui/Field';
import { RequestError } from '../../components/ui/Status';

function productDefaults(product) {
  return {
    name: product?.name ?? '',
    slug: product?.slug ?? '',
    sku: product?.sku ?? '',
    category: product?.category.id ?? '',
    tagline: product?.tagline ?? '',
    description: product?.description ?? '',
    price: product?.price ?? '',
    compareAtPrice: product?.compareAtPrice ?? '',
    material: product?.material ?? '',
    finish: product?.finish ?? '',
    stock: product?.stock ?? '',
    tags: product?.tags.join(', ') ?? '',
    isFeatured: product?.isFeatured ?? false,
    isNewDrop: product?.isNewDrop ?? false,
    images: product?.images ?? [{ url: '', alt: '' }],
    craft: product?.craft ?? { artisan: '', region: '', technique: '' },
    details: product?.details ?? { weightGrams: '', lengthMm: '', care: '' },
  };
}

export function ProductForm({ product, categories, saved }) {
  const {
    control,
    register,
    handleSubmit,
    setError,
    getValues,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(productFormSchema),
    defaultValues: productDefaults(product),
  });
  const images = useFieldArray({ control, name: 'images' });
  const draft = useMutation({
    mutationFn: describeProduct,
    onSuccess: ({ data }) => {
      setValue('tagline', data.tagline, {
        shouldValidate: true,
        shouldDirty: true,
      });
      setValue('description', data.description, {
        shouldValidate: true,
        shouldDirty: true,
      });
    },
  });
  function generate() {
    const { name, material, finish, category, tags, craft } = getValues();
    const categoryName = categories.find(({ id }) => id === category)?.name;
    if (!name.trim() || !material || !finish || !categoryName) {
      setError('root.ai', {
        message:
          'Enter a name and select a category, material, and finish first.',
      });
      return;
    }
    setError('root.ai', { message: '' });
    draft.mutate({
      name,
      material,
      finish,
      category: categoryName,
      tags: tags
        .split(',')
        .map((tag) => tag.trim())
        .filter(Boolean),
      notes: craft.technique || undefined,
    });
  }
  async function submit(data) {
    try {
      await (product ? updateProduct(product.id, data) : createProduct(data));
      await saved();
    } catch (error) {
      for (const detail of error.details ?? []) {
        if (detail.field) setError(detail.field, { message: detail.message });
      }
      setError('root.api', { message: error.message });
    }
  }
  return (
    <form
      className="drawer-padding form-stack admin-product-form"
      onSubmit={handleSubmit(submit)}
      noValidate
    >
      <fieldset>
        <legend>Listing</legend>
        <Field
          label="Product name"
          error={errors.name?.message}
          {...register('name')}
        />
        <div className="form-row">
          <Field
            label="Slug (optional)"
            placeholder="Generated from product name"
            error={errors.slug?.message}
            {...register('slug')}
          />
          <Field label="SKU" error={errors.sku?.message} {...register('sku')} />
        </div>
        <Field
          label="Category"
          as="select"
          error={errors.category?.message}
          {...register('category')}
        >
          <option value="">Choose a category</option>
          {categories.map(({ id, name }) => (
            <option key={id} value={id}>
              {name}
            </option>
          ))}
        </Field>
        <div className="form-row">
          <Field
            label="Material"
            as="select"
            error={errors.material?.message}
            {...register('material')}
          >
            <option value="">Choose a material</option>
            {Object.entries(MATERIALS).map(([id, name]) => (
              <option key={id} value={id}>
                {name}
              </option>
            ))}
          </Field>
          <Field
            label="Finish"
            as="select"
            error={errors.finish?.message}
            {...register('finish')}
          >
            <option value="">Choose a finish</option>
            {Object.entries(FINISHES).map(([id, name]) => (
              <option key={id} value={id}>
                {name}
              </option>
            ))}
          </Field>
        </div>
        <Field
          label="Tags (comma-separated)"
          error={errors.tags?.message}
          {...register('tags')}
        />
        <div className="form-actions">
          <label className="filter-option">
            <input type="checkbox" {...register('isFeatured')} /> Featured
          </label>
          <label className="filter-option">
            <input type="checkbox" {...register('isNewDrop')} /> New drop
          </label>
        </div>
      </fieldset>
      <fieldset>
        <legend>Price and stock</legend>
        <div className="form-row">
          <Field
            label="Price (₹)"
            type="number"
            min={1}
            error={errors.price?.message}
            {...register('price')}
          />
          <Field
            label="Compare-at price (₹, optional)"
            type="number"
            min={1}
            error={errors.compareAtPrice?.message}
            {...register('compareAtPrice')}
          />
        </div>
        <Field
          label="Stock"
          type="number"
          min={0}
          error={errors.stock?.message}
          {...register('stock')}
        />
      </fieldset>
      <fieldset>
        <legend>Images</legend>
        {images.fields.map(({ id }, index) => (
          <div className="form-stack image-fields" key={id}>
            <div className="form-row">
              <Field
                label={`Image ${index + 1} URL`}
                error={errors.images?.[index]?.url?.message}
                {...register(`images.${index}.url`)}
              />
              <Field
                label={`Image ${index + 1} alt text`}
                error={errors.images?.[index]?.alt?.message}
                {...register(`images.${index}.alt`)}
              />
            </div>
            {images.fields.length > 1 && (
              <button
                className="text-link"
                type="button"
                onClick={() => images.remove(index)}
              >
                Remove image {index + 1}
              </button>
            )}
          </div>
        ))}
        {images.fields.length < 6 && (
          <Button
            variant="outline"
            onClick={() => images.append({ url: '', alt: '' })}
          >
            Add image
          </Button>
        )}
      </fieldset>
      <fieldset>
        <legend>Craft and dimensions</legend>
        <Field
          label="Artisan or studio"
          error={errors.craft?.artisan?.message}
          {...register('craft.artisan')}
        />
        <Field
          label="Region"
          error={errors.craft?.region?.message}
          {...register('craft.region')}
        />
        <Field
          label="Technique"
          error={errors.craft?.technique?.message}
          {...register('craft.technique')}
        />
        <div className="form-row">
          <Field
            label="Weight (g)"
            type="number"
            min={1}
            error={errors.details?.weightGrams?.message}
            {...register('details.weightGrams')}
          />
          <Field
            label="Length (mm)"
            type="number"
            min={1}
            error={errors.details?.lengthMm?.message}
            {...register('details.lengthMm')}
          />
        </div>
        <Field
          label="Care notes"
          as="textarea"
          rows={3}
          error={errors.details?.care?.message}
          {...register('details.care')}
        />
      </fieldset>
      <fieldset>
        <legend>Product copy</legend>
        <Button variant="outline" onClick={generate} disabled={draft.isPending}>
          <Sparkles size={17} aria-hidden="true" />
          {draft.isPending ? 'Drafting…' : 'Generate copy with AI'}
        </Button>
        {errors.root?.ai?.message && <RequestError error={errors.root.ai} />}
        {draft.isError && <RequestError error={draft.error} />}
        <Field
          label="Tagline"
          error={errors.tagline?.message}
          {...register('tagline')}
        />
        <Field
          label="Description"
          as="textarea"
          rows={5}
          error={errors.description?.message}
          {...register('description')}
        />
      </fieldset>
      {errors.root?.api && <RequestError error={errors.root.api} />}
      <Button type="submit" disabled={isSubmitting || draft.isPending}>
        {isSubmitting ? 'Saving…' : 'Save product'}
      </Button>
    </form>
  );
}
