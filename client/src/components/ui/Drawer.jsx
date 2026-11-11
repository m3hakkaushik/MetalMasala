import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';

export function Drawer({ open, onClose, title, placement = 'side', children }) {
  const dialog = useRef(null);

  useEffect(() => {
    if (!open) return;
    const active = document.activeElement;
    const element = dialog.current;
    element.showModal();
    const oldOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      element.close();
      document.body.style.overflow = oldOverflow;
      if (active instanceof HTMLElement) active.focus();
    };
  }, [open]);

  return (
    <dialog
      ref={dialog}
      className={`drawer drawer--${placement}`}
      aria-label={title}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        if (event.target === dialog.current) onClose();
      }}
    >
      <div className="drawer__body">
        <header className="drawer__header">
          <h2>{title}</h2>
          <button
            type="button"
            className="icon-button"
            aria-label="Close"
            onClick={onClose}
          >
            <X size={22} />
          </button>
        </header>
        {open && children}
      </div>
    </dialog>
  );
}
