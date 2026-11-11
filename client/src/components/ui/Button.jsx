import { Link } from 'react-router-dom';

export function Button({
  to,
  variant = 'primary',
  className = '',
  children,
  ...props
}) {
  const styles = `button button--${variant} ${className}`;
  return to ? (
    <Link to={to} className={styles} {...props}>
      {children}
    </Link>
  ) : (
    <button type="button" className={styles} {...props}>
      {children}
    </button>
  );
}
