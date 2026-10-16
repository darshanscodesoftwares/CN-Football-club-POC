type IconProps = { className?: string }

const stroke = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.6, strokeLinecap: 'round', strokeLinejoin: 'round' } as const

/** Ball with its centre panel and seams. */
export function FootballIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true" {...stroke}>
      <circle cx="12" cy="12" r="9" />
      <path d="m12 8.2 3.6 2.6-1.4 4.2H9.8l-1.4-4.2Z" />
      <path d="M12 8.2V3M15.6 10.8l4.9-1.6M14.2 15l3 4.2M9.8 15l-3 4.2M8.4 10.8 3.5 9.2" />
    </svg>
  )
}

/** Bat and ball. */
export function CricketIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true" {...stroke}>
      <path d="m14.5 3.5 2 2-9.3 9.3a1.4 1.4 0 0 1-2 0l0 0a1.4 1.4 0 0 1 0-2Z" />
      <path d="m5.6 15.8-2.6 2.6M3.8 17.6l1.6 1.6" />
      <circle cx="17.5" cy="17" r="3" />
    </svg>
  )
}

/** Shuttlecock. */
export function BadmintonIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true" {...stroke}>
      <path d="M9.5 16.5 4 6.5h16l-5.5 10" />
      <path d="M9.5 16.5h5M8 6.5l2.3 10M16 6.5l-2.3 10M12 6.5v10" />
      <path d="M9.5 16.5a2.5 2.5 0 0 0 5 0" />
    </svg>
  )
}

/** Small-sided goal and ball. */
export function FutsalIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true" {...stroke}>
      <path d="M3 14V5h18v9" />
      <path d="M7 5v9M12 5v9M17 5v9M3 9.5h18" />
      <circle cx="12" cy="18.5" r="2.5" />
    </svg>
  )
}
