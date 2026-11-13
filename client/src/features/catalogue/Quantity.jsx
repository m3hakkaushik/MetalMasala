import { Minus, Plus } from 'lucide-react';

export function Quantity({
  value,
  onChange,
  max,
  disabled = false,
  label = 'Quantity',
}) {
  return (
    <div className="quantity" role="group" aria-label={label}>
      <button
        type="button"
        className="icon-button"
        aria-label="Decrease quantity"
        disabled={disabled || value <= 1}
        onClick={() => onChange(value - 1)}
      >
        <Minus size={15} />
      </button>
      <output aria-label={label}>{value}</output>
      <button
        type="button"
        className="icon-button"
        aria-label="Increase quantity"
        disabled={disabled || value >= max}
        onClick={() => onChange(value + 1)}
      >
        <Plus size={15} />
      </button>
    </div>
  );
}
