import type { Coffee } from '../data'

const ROAST_LEVEL = { Light: 1, Medium: 2, Dark: 3 } as const

/** A drawn coffee bag in the coffee's colour. No image files to fetch. */
export function BagArt({ coffee, size = 'md' }: { coffee: Coffee; size?: 'md' | 'lg' }) {
  const level = ROAST_LEVEL[coffee.roast]
  return (
    <div className={`bag-art bag-art-${size}`} style={{ background: `${coffee.color}1f` }}>
      <svg viewBox="0 0 160 200" aria-hidden="true" focusable="false">
        <ellipse cx="80" cy="186" rx="52" ry="7" fill="rgba(0,0,0,0.08)" />
        <path d="M34 44 L44 18 H116 L126 44 Z" fill={coffee.color} />
        <path d="M34 44 L44 18 H116 L126 44 Z" fill="rgba(0,0,0,0.18)" />
        <rect x="30" y="40" width="100" height="142" rx="10" fill={coffee.color} />
        <rect x="30" y="40" width="100" height="10" fill="rgba(0,0,0,0.1)" />
        <rect x="44" y="78" width="72" height="72" rx="8" fill="#fff" />
        <text x="80" y="104" textAnchor="middle" fontSize="13" fontWeight="800" fill="#1d1a17">
          FIKA
        </text>
        <text x="80" y="121" textAnchor="middle" fontSize="8" fill="#6b625a">
          {coffee.origin.toUpperCase().slice(0, 16)}
        </text>
        {[0, 1, 2].map((i) => (
          <circle
            key={i}
            cx={68 + i * 12}
            cy="136"
            r="4"
            fill={i < level ? coffee.color : '#e8e1d8'}
          />
        ))}
      </svg>
    </div>
  )
}
