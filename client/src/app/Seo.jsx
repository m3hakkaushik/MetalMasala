import { Helmet } from 'react-helmet-async';

export function Seo({
  title,
  description = 'Handcrafted Indian jewellery with a little extra masala.',
}) {
  const fullTitle = `${title} · Metal मसाला`;
  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
    </Helmet>
  );
}
