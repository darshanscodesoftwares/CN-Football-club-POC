type IconProps = { className?: string }

const stroke = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.7, strokeLinecap: 'round', strokeLinejoin: 'round' } as const

/** Outline icons, matching the reference footer's line style. */
export function InstagramIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true" {...stroke}>
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.3" cy="6.7" r="0.6" fill="currentColor" />
    </svg>
  )
}

export function YouTubeIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true" {...stroke}>
      <rect x="2.5" y="5" width="19" height="14" rx="4" />
      <path d="m10 9.2 4.8 2.8-4.8 2.8z" />
    </svg>
  )
}

export function FacebookIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true" {...stroke}>
      <path d="M14.5 8H17V4.5h-2.5A4 4 0 0 0 10.5 8.5V11H8v3.5h2.5V21H14v-6.5h2.5L17 11h-3V9a1 1 0 0 1 1-1Z" />
    </svg>
  )
}

export function MailIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true" {...stroke}>
      <rect x="3" y="5.5" width="18" height="13" rx="2.5" />
      <path d="m4 7.5 8 5.5 8-5.5" />
    </svg>
  )
}

export function PinIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true" {...stroke}>
      <path d="M19 10.2c0 4.9-7 10.3-7 10.3s-7-5.4-7-10.3a7 7 0 1 1 14 0Z" />
      <circle cx="12" cy="10.2" r="2.6" />
    </svg>
  )
}

export function PhoneIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true" {...stroke}>
      <path d="M21 16.6v2.9a1.9 1.9 0 0 1-2.1 1.9A18.8 18.8 0 0 1 2.6 5.1 1.9 1.9 0 0 1 4.5 3h2.9a1.9 1.9 0 0 1 1.9 1.6c.12.9.34 1.8.66 2.6a1.9 1.9 0 0 1-.43 2L8.3 10.4a15.2 15.2 0 0 0 5.3 5.3l1.2-1.2a1.9 1.9 0 0 1 2-.43c.84.32 1.7.54 2.6.66A1.9 1.9 0 0 1 21 16.6Z" />
    </svg>
  )
}

export function ArrowUpRightSmall({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true" {...stroke} strokeWidth={2}>
      <path d="M7 17 17 7M8 7h9v9" />
    </svg>
  )
}
