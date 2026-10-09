/**
 * Footer content (Marina FC), laid out like the reference footer (Reference/image.png).
 * Note: the client's current site lists support@marinafootballclub.com; the approved footer
 * design uses Contact@marinafc.com. Confirm which address should ship.
 */
export const FOOTER_COPY = {
  tagline: 'Premium football turf spaces for a stronger, healthier community.',
  followLabel: 'Follow us',
  socials: [
    { label: 'Instagram', href: '#', icon: 'instagram' },
    { label: 'YouTube', href: '#', icon: 'youtube' },
    { label: 'Facebook', href: '#', icon: 'facebook' },
  ],
  nav: [
    { label: 'Home', href: '#top' },
    { label: 'About', href: '#about-intro' },
    { label: 'Turf Locations', href: '#turf-locations' },
    { label: 'Gallery', href: '#gallery' },
    { label: 'Contact Us', href: '#contact' },
  ],
  email: 'Contact@marinafc.com',
  emailLabel: 'Official enquiries',
  watermark: 'MARINA FC',
  places: [
    { icon: 'pin', name: 'Academy HQ', detail: 'Chennai, Tamil Nadu', href: '#' },
    { icon: 'phone', name: 'Call', detail: '+91 9176127400', href: 'tel:+919176127400' },
  ],
  copyright: '© 2026 Marina Football Club. All rights reserved.',
  crafted: 'Crafted by Marina',
  legal: [
    { label: 'Privacy', href: '#' },
    { label: 'Terms', href: '#' },
    { label: 'Instagram', href: '#' },
  ],
} as const

export type SocialIcon = (typeof FOOTER_COPY.socials)[number]['icon']
export type PlaceIcon = (typeof FOOTER_COPY.places)[number]['icon']
