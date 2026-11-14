function visible(rect) {
  return (
    rect.bottom > 0 &&
    rect.top < window.innerHeight &&
    rect.right > 0 &&
    rect.left < window.innerWidth
  );
}

export async function flyToBag() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const image = document.querySelector('.gallery__main .smart-image');
  const bag = document.querySelector('.bag-trigger');
  if (!image || !bag || typeof image.animate !== 'function') return;
  const from = image.getBoundingClientRect();
  const to = bag.getBoundingClientRect();
  if (!visible(from) || !visible(to)) return;

  const size = 52;
  const x = from.left + from.width / 2;
  const y =
    Math.max(from.top, 0) + Math.min(from.height, window.innerHeight) / 2;
  const dx = to.left + to.width / 2 - x;
  const dy = to.top + to.height / 2 - y;
  const thumbnail = image.cloneNode(true);
  thumbnail.classList.add('bag-flight');
  thumbnail.setAttribute('aria-hidden', 'true');
  Object.assign(thumbnail.style, {
    left: `${x - size / 2}px`,
    top: `${y - size / 2}px`,
    width: `${size}px`,
    height: `${size}px`,
  });
  for (const element of thumbnail.querySelectorAll('[id]'))
    element.removeAttribute('id');
  document.body.append(thumbnail);
  try {
    await thumbnail.animate(
      [
        { transform: 'translate(0, 0) scale(1)', opacity: 1 },
        {
          transform: `translate(${dx * 0.55}px, ${dy * 0.65 - 50}px) scale(.85)`,
          opacity: 0.96,
        },
        { transform: `translate(${dx}px, ${dy}px) scale(.22)`, opacity: 0.1 },
      ],
      { duration: 270, easing: 'ease-out' },
    ).finished;
    bag.animate([{ scale: 1 }, { scale: 1.15 }, { scale: 1 }], {
      duration: 180,
    });
  } finally {
    thumbnail.remove();
  }
}
