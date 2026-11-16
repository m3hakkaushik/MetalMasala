import { useEffect, useState } from 'react';

export function useDebounce(value, wait = 300) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), wait);
    return () => window.clearTimeout(timer);
  }, [value, wait]);
  return debounced;
}
