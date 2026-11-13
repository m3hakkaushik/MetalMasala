import {
  motion,
  useMotionValue,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
  useVelocity,
} from 'framer-motion';
import { useEffect, useRef } from 'react';
import { ArrowUpRight, Sparkle } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { JewelleryArt } from '../../components/ui/JewelleryArt';

const pendants = [
  {
    category: 'jhumkas',
    finish: 'oxidized-silver',
    length: '3.5rem',
    tilt: -9,
    scale: 1.05,
  },
  {
    category: 'maang-tikka',
    finish: 'antique-gold',
    length: '6.2rem',
    tilt: 5,
    scale: 0.72,
  },
  {
    category: 'jhumkas',
    finish: 'antique-gold',
    length: '2.4rem',
    tilt: 8,
    scale: 1.14,
  },
  {
    category: 'nose-pins',
    finish: 'oxidized-silver',
    length: '4.6rem',
    tilt: -6,
    scale: 0.62,
  },
];

function Pendant({ piece, pointer, speed, index, reduced }) {
  const rotateTarget = useTransform(
    [pointer, speed],
    ([x, y]) =>
      piece.tilt +
      Math.max(-19, Math.min(19, x * (1 - index * 0.12) + y * 0.008)),
  );
  const rotate = useSpring(rotateTarget, {
    stiffness: 112 - index * 12,
    damping: 8,
    mass: 0.95,
  });
  return (
    <motion.div
      className="pendant"
      style={{
        rotate: reduced ? piece.tilt : rotate,
        '--chain': piece.length,
        '--piece-scale': piece.scale,
      }}
    >
      <span className="pendant__chain" />
      <JewelleryArt
        category={piece.category}
        finish={piece.finish}
        single
        className="pendant__piece"
      />
    </motion.div>
  );
}

export function Hero() {
  const pointer = useMotionValue(0);
  const lastPosition = useRef(null);
  const settleTimer = useRef(null);
  const { scrollY } = useScroll();
  const speed = useVelocity(scrollY);
  const reduced = useReducedMotion();

  useEffect(() => () => window.clearTimeout(settleTimer.current), []);

  function swing(event) {
    if (reduced || event.pointerType === 'touch') return;
    const previous = lastPosition.current;
    lastPosition.current = { x: event.clientX, time: event.timeStamp };
    if (!previous) return;
    const duration = Math.max(8, event.timeStamp - previous.time);
    pointer.set(((event.clientX - previous.x) / duration) * 6);
    window.clearTimeout(settleTimer.current);
    settleTimer.current = window.setTimeout(() => pointer.set(0), 65);
  }

  return (
    <section
      className="hero dark-field"
      onPointerMove={swing}
      onPointerLeave={() => {
        lastPosition.current = null;
      }}
    >
      <div className="hero__inner site-width">
        <div className="hero__copy">
          <h1 className="hero__wordmark">
            <span>Metal</span>
            <span lang="hi">मसाला</span>
          </h1>
          <p>Handcrafted Indian jewellery with a little extra masala.</p>
          <Button to="/shop?newDrop=true" variant="gold">
            Shop the new drop <ArrowUpRight size={18} aria-hidden="true" />
          </Button>
        </div>
        <div className="hero__art" aria-hidden="true">
          <div className="hero__frame" />
          <Sparkle
            className="hero__sparkle hero__sparkle--first"
            size={29}
            strokeWidth={1}
          />
          <Sparkle
            className="hero__sparkle hero__sparkle--second"
            size={18}
            strokeWidth={1}
          />
          <div className="hero__rail">
            {pendants.map((piece, index) => (
              <Pendant
                key={index}
                piece={piece}
                pointer={pointer}
                speed={speed}
                index={index}
                reduced={reduced}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
