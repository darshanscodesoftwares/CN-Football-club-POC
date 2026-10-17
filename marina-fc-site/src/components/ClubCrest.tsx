import { CLUB } from '../club'
import { LOGO_HEIGHT, LOGO_URL, LOGO_WIDTH } from './logoArt'

/** The club logo (artwork in logoArt.ts), sized by the caller's CSS height. */
export function ClubCrest({ className }: { className?: string }) {
  return <img className={className} src={LOGO_URL} alt={`${CLUB.name} logo`} width={LOGO_WIDTH} height={LOGO_HEIGHT} draggable={false} />
}
