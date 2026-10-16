import { useId } from 'react'
import { CLUB } from '../club'

/**
 * Vector stand-in for the club crest: a tall oval (about 3:5, like the real logo) with wave
 * bands, a ball and the club name (CLUB.crest). Replace with the official logo file when the client supplies it.
 */
/** Font size for the crest's top line, shrunk so longer names (wide letters like M) stay inside the oval. */
export const CREST_NAME_SIZE = Math.min(6.3, 23 / (0.8 * CLUB.crest[0].length))

export function ClubCrest({ className }: { className?: string }) {
  const clip = useId()
  return (
    <svg className={className} viewBox="0 0 36 60" role="img" aria-label={`${CLUB.name} crest`}>
      <defs>
        <clipPath id={clip}>
          <ellipse cx="18" cy="30" rx="15.6" ry="27.4" />
        </clipPath>
      </defs>
      <ellipse cx="18" cy="30" rx="17" ry="28.8" fill="#ffffff" stroke="#1b3f91" strokeWidth="1.5" />
      <g clipPath={`url(#${clip})`}>
        <rect width="36" height="60" fill="#eaf1ff" />
        <path d="M0 23.5q4.5-3 9 0t9 0 9 0 9 0V31H0Z" fill="#2c5fcf" />
        <path d="M0 30.5q4.5-3 9 0t9 0 9 0 9 0V37H0Z" fill="#a9c2f2" />
        <path d="M0 36.5q4.5-3 9 0t9 0 9 0 9 0V60H0Z" fill="#1b3f91" />
        <circle cx="18" cy="12.2" r="5.6" fill="#ffffff" stroke="#14254f" strokeWidth="0.9" />
        <path d="M18 9.6l2.3 1.7-.9 2.7h-2.8l-.9-2.7Z" fill="#14254f" />
        <path d="M18 9.6V6.8M20.3 11.3l2.7-.9M19.4 14l1.6 2.1M16.6 14l-1.6 2.1M15.7 11.3l-2.7-.9" stroke="#14254f" strokeWidth="0.75" />
        <text x="18" y="46.8" textAnchor="middle" fontSize={CREST_NAME_SIZE} fontWeight="800" letterSpacing="0.2" fill="#ffffff" fontFamily="system-ui, -apple-system, 'Segoe UI', sans-serif">
          {CLUB.crest[0]}
        </text>
        <text x="18" y="54.4" textAnchor="middle" fontSize="5.8" fontWeight="800" letterSpacing="0.5" fill="#ffffff" fontFamily="system-ui, -apple-system, 'Segoe UI', sans-serif">
          {CLUB.crest[1]}
        </text>
      </g>
    </svg>
  )
}
