import { useId } from 'react';

const metals = {
  'oxidized-silver': ['#fcf8dd', '#a9a8a0', '#484642', '#e1ddc7'],
  'oxidized-black': ['#e3d6b3', '#8f8574', '#24262c', '#bbb1a0'],
  'antique-gold': ['#fff1ba', '#d2a45e', '#634224', '#f6d598'],
  'antique-copper': ['#ffe0ba', '#bf7758', '#6b3d31', '#eabf9a'],
  'patina-green': ['#def2de', '#89b4a2', '#29483e', '#b4cab2'],
};

function Rosette({ x = 0, y = 0, size = 1 }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${size})`}>
      <circle r="20" />
      {Array.from({ length: 8 }, (_, index) => (
        <ellipse
          key={index}
          cx="0"
          cy="-10"
          rx="3.5"
          ry="7"
          transform={`rotate(${index * 45})`}
          fill="none"
        />
      ))}
      <circle r="5" />
      <circle r="2" fill="var(--art-ink)" />
    </g>
  );
}

function Bell() {
  return (
    <g>
      <Rosette y={-44} size={0.72} />
      <circle cy="-26" r="4.5" fill="none" strokeWidth="2" />
      <path d="M-43 13C-36 4-34-15-18-20Q0-30 18-20C34-15 36 4 43 13Z" />
      <ellipse cy="13" rx="43" ry="8" />
      <ellipse cy="14" rx="35" ry="4.5" fill="var(--art-ink)" opacity=".6" />
      {[-30, -20, -10, 0, 10, 20, 30].map((x) => (
        <g key={x}>
          <path d={`M${x * 0.43} -20Q${x * 0.68} -10 ${x} 10`} fill="none" />
          <path d={`M${x} 18v${9 - Math.abs(x) / 12}`} />
          <circle cx={x} cy={30 - Math.abs(x) / 12} r="4.6" />
          <circle
            cx={x - 1}
            cy={29 - Math.abs(x) / 12}
            r="1.05"
            fill="var(--art-light)"
            stroke="none"
          />
        </g>
      ))}
    </g>
  );
}

function Necklace({ anklet = false }) {
  return (
    <g>
      <path
        d="M-74-49C-59 31-35 57 0 59C35 57 59 31 74-49"
        fill="none"
        stroke="var(--art-light)"
        strokeWidth={anklet ? 2 : 5}
      />
      <path
        d="M-74-49C-59 31-35 57 0 59C35 57 59 31 74-49"
        fill="none"
        strokeWidth="1.5"
        strokeDasharray="2 4"
      />
      {[-3, -2, -1, 0, 1, 2, 3].map((step) => {
        const y = anklet ? 53 - step ** 2 * 3.4 : 37 - step ** 2 * 3.4;
        return (
          <g
            key={step}
            transform={`translate(${step * 19} ${y}) rotate(${step * -15})`}
          >
            <path d="M0 2V16" stroke="var(--art-light)" strokeWidth="2" />
            {anklet ? (
              <circle cy="20" r={Math.abs(step) === 0 ? 6 : 4.5} />
            ) : (
              <Rosette y={18} size={step === 0 ? 0.85 : 0.48} />
            )}
          </g>
        );
      })}
    </g>
  );
}

function Ring() {
  return (
    <g>
      <ellipse
        cy="23"
        rx="40"
        ry="30"
        fill="none"
        strokeWidth="8"
        stroke="var(--art-mid)"
      />
      <ellipse
        cy="23"
        rx="40"
        ry="30"
        fill="none"
        strokeWidth="2"
        stroke="var(--art-light)"
      />
      <path d="M0-54 31-38 31-9 0 7-31-9-31-38Z" />
      <path d="M0-48 25-35 25-13 0 0-25-13-25-35Z" fill="none" />
      <Rosette y={-24} size={0.82} />
    </g>
  );
}

function Cuff() {
  return (
    <g>
      <path d="M-66 3C-70-34-32-55 7-52 45-49 78-26 70 4L55 30C48 17 28 4 3 2-23 0-48 14-53 30Z" />
      <path
        d="M-66 3C-61-20-33-35 5-33 41-31 65-14 70 4"
        fill="none"
        strokeWidth="2"
      />
      <path
        d="M-60 15C-51-5-23-23 4-21 31-19 56-4 63 15"
        fill="none"
        strokeWidth="1.5"
      />
      {[-4, -3, -2, -1, 0, 1, 2, 3, 4].map((step) => (
        <g
          key={step}
          transform={`translate(${step * 13} ${-21 + step ** 2 * 1.65}) rotate(${step * 11})`}
        >
          <path d="M0-9 4 0 0 9-4 0Z" fill="var(--art-ink)" />
          <circle r="1.75" fill="var(--art-light)" stroke="none" />
        </g>
      ))}
      <path
        d="M-53 30C-45 44-36 45-30 39L-19 29M55 30C50 43 41 48 34 40L21 29"
        fill="none"
        stroke="var(--art-mid)"
        strokeWidth="6"
      />
    </g>
  );
}

function Tikka() {
  return (
    <g>
      <path
        d="M0-70q12-4 8-12M0-68v43"
        fill="none"
        stroke="var(--art-light)"
        strokeWidth="2"
      />
      {[-67, -61, -55, -49, -43, -37, -31].map((y) => (
        <ellipse key={y} cy={y} rx="3" ry="3.5" fill="none" />
      ))}
      <path d="M0-29C17-11 34-7 35 15 33 35 14 44 0 45-14 44-33 35-35 15-34-7-17-11 0-29Z" />
      <Rosette y={11} size={1.06} />
      {[-2, -1, 0, 1, 2].map((step) => (
        <g
          key={step}
          transform={`translate(${step * 11} ${44 - step ** 2 * 1.7})`}
        >
          <path d="M0 0v9" />
          <circle cy="11" r="3.6" />
        </g>
      ))}
    </g>
  );
}

function NosePin() {
  return (
    <g>
      <path
        d="M17 7c27 19 27 41 9 41-6 0-13-7-11-14"
        fill="none"
        stroke="var(--art-mid)"
        strokeWidth="5"
      />
      <Rosette size={1.8} />
      {Array.from({ length: 12 }, (_, index) => (
        <circle
          key={index}
          cy="-33"
          r="2.8"
          transform={`rotate(${index * 30})`}
        />
      ))}
    </g>
  );
}

const pieces = {
  jhumkas: Bell,
  'chokers-necklaces': Necklace,
  rings: Ring,
  'kadas-bangles': Cuff,
  payals: () => <Necklace anklet />,
  'maang-tikka': Tikka,
  'nose-pins': NosePin,
  'gift-combos': () => (
    <g>
      <g transform="translate(-23 22) rotate(-10) scale(.86)">
        <Cuff />
      </g>
      <g transform="translate(38 -19) rotate(16) scale(.77)">
        <Bell />
      </g>
    </g>
  ),
};

export function JewelleryArt({
  category = 'jhumkas',
  finish = 'oxidized-silver',
  view = 0,
  single = false,
  className,
}) {
  const id = useId();
  const [light, mid, ink, edge] = metals[finish] ?? metals['oxidized-silver'];
  const Piece = pieces[category] ?? Bell;
  const pair = category === 'jhumkas' && !single;
  const transforms = [
    'rotate(-7)',
    'rotate(8) scale(1.22)',
    'rotate(-21) scale(.94)',
  ];
  return (
    <svg
      className={className}
      viewBox="-103 -103 206 206"
      aria-hidden="true"
      style={{ '--art-light': light, '--art-mid': mid, '--art-ink': ink }}
    >
      <defs>
        <linearGradient id={id} x1="0%" y1="3%" x2="95%" y2="100%">
          <stop offset="0" stopColor={light} />
          <stop offset=".25" stopColor={mid} />
          <stop offset=".46" stopColor={edge} />
          <stop offset=".77" stopColor={mid} />
          <stop offset="1" stopColor={edge} />
        </linearGradient>
      </defs>
      <g
        fill={`url(#${id})`}
        stroke={ink}
        strokeWidth="1.15"
        strokeLinejoin="round"
        transform={transforms[view % transforms.length]}
      >
        {pair ? (
          <>
            <g transform="translate(-38 -10) scale(.85)">
              <Bell />
            </g>
            <g transform="translate(36 21) rotate(14) scale(.88)">
              <Bell />
            </g>
          </>
        ) : (
          <Piece />
        )}
      </g>
    </svg>
  );
}
