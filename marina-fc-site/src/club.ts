/**
 * The club this build of the site is for. Change these to re-brand the site for another client;
 * the hero, about, gallery, coaches, footer and cursor ball all read from here (the logo itself is
 * components/logoArt.ts).
 * index.html keeps its own <title> and description, so update those too.
 */
export const CLUB = {
  /** Full name, used in running copy, headings and screen-reader labels. */
  name: 'Common-Football',
  /** Wordmark beside the crest in the hero. */
  wordmark: 'COMMON-FOOTBALL',
  /** Short name, used in the footer (copyright, big watermark on the pitch) and on the cursor ball. */
  shortName: 'CN-Football',
  /** Contact details in the footer (placeholders until the client gives theirs). */
  email: 'contact@cnfootball.com',
  phone: '+91 98765 43210',
  /** Where the academy is: the footer's contact card and the gallery's photo captions. */
  city: 'Chennai',
  region: 'Tamil Nadu',
} as const
