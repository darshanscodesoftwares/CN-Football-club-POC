import { CLUB } from '../../club'

/**
 * Footer content: the brand column (tagline, socials), the "Explore" links, the "Get in touch"
 * card, the club name across the pitch, and the legal bar.
 */
export const FOOTER_COPY = {
  tagline: 'A multi-sport academy growing confident players, on and off the pitch.',
  socials: [
    { label: 'Instagram', href: '#', icon: 'instagram' },
    { label: 'YouTube', href: '#', icon: 'youtube' },
    { label: 'Facebook', href: '#', icon: 'facebook' },
  ],
  navLabel: 'Explore',
  nav: [
    { label: 'Home', href: '#top' },
    { label: 'About us', href: '#about-intro' },
    { label: 'Gallery', href: '#gallery' },
    { label: 'Our coaches', href: '#coaches' },
    { label: 'Contact', href: '#contact' },
  ],
  contactLabel: 'Get in touch',
  contact: [
    { icon: 'mail', label: 'Official enquiries', value: CLUB.email, href: `mailto:${CLUB.email}` },
    { icon: 'phone', label: 'Call us', value: CLUB.phone, href: `tel:${CLUB.phone.replace(/\s+/g, '')}` },
    { icon: 'pin', label: 'Academy HQ', value: `${CLUB.city}, ${CLUB.region}`, href: '#' },
  ],
  watermark: CLUB.shortName.toUpperCase(),
  copyright: `© 2026 ${CLUB.shortName}. All rights reserved.`,
  crafted: `Crafted by ${CLUB.shortName}`,
  legal: [
    { label: 'Privacy', href: '#' },
    { label: 'Terms', href: '#' },
  ],
  backToTop: 'Back to top',
} as const

export type SocialIcon = (typeof FOOTER_COPY.socials)[number]['icon']
export type ContactIcon = (typeof FOOTER_COPY.contact)[number]['icon']
