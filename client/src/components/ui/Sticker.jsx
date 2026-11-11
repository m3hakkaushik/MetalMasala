export function Sticker({ variant = 'highlight', children }) {
  return <span className={`sticker sticker--${variant}`}>{children}</span>;
}
