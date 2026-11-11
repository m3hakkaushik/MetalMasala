import { useState } from 'react';
import { JewelleryArt } from './JewelleryArt';

const packagedPhotos = new Set(__LOCAL_PRODUCT_PHOTOS__);

export function SmartImage({
  src,
  alt,
  category,
  finish = 'oxidized-silver',
  view = 0,
  eager,
  className = '',
  children,
}) {
  // Relative /products paths refer to optional photos in the client public directory.
  const photo =
    src?.startsWith('/products/') && !packagedPhotos.has(src) ? undefined : src;
  const [failedSrc, setFailedSrc] = useState(null);
  const [loadedSrc, setLoadedSrc] = useState(null);
  const loaded = Boolean(photo && loadedSrc === photo && failedSrc !== photo);
  return (
    <div className={`smart-image ${className}`} data-finish={finish}>
      {!loaded && (
        <div
          className="smart-image__art"
          role="img"
          aria-label={`${alt} (illustration)`}
        >
          <JewelleryArt category={category} finish={finish} view={view} />
        </div>
      )}
      {photo && failedSrc !== photo && (
        <img
          key={photo}
          src={photo}
          alt={alt}
          aria-hidden={!loaded}
          className={loaded ? undefined : 'smart-image__photo--pending'}
          width="640"
          height="640"
          loading={eager ? 'eager' : 'lazy'}
          decoding="async"
          onLoad={() => setLoadedSrc(photo)}
          onError={() => setFailedSrc(photo)}
        />
      )}
      {children}
    </div>
  );
}
