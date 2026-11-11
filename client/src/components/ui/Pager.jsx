import { Button } from './Button';

export function Pager({ meta, onPage }) {
  if (!meta || meta.totalPages <= 1) return null;
  return (
    <nav className="pager" aria-label="Pagination">
      <Button
        variant="outline"
        disabled={!meta.hasPrev}
        onClick={() => onPage(meta.page - 1)}
      >
        Previous
      </Button>
      <span>
        Page {meta.page} of {meta.totalPages}
      </span>
      <Button
        variant="outline"
        disabled={!meta.hasNext}
        onClick={() => onPage(meta.page + 1)}
      >
        Next
      </Button>
    </nav>
  );
}
