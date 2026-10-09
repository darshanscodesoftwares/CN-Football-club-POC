/**
 * The Marina FC crest stand-in as a standalone SVG string, for painting onto the cursor ball.
 * Same artwork as components/MarinaCrest.tsx (keep the two in step); replace both with the
 * official logo when the client supplies it.
 */
export const CREST_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 36 60" width="360" height="600">
<defs><clipPath id="c"><ellipse cx="18" cy="30" rx="15.6" ry="27.4"/></clipPath></defs>
<ellipse cx="18" cy="30" rx="17" ry="28.8" fill="#ffffff" stroke="#1b3f91" stroke-width="1.5"/>
<g clip-path="url(#c)">
<rect width="36" height="60" fill="#eaf1ff"/>
<path d="M0 23.5q4.5-3 9 0t9 0 9 0 9 0V31H0Z" fill="#2c5fcf"/>
<path d="M0 30.5q4.5-3 9 0t9 0 9 0 9 0V37H0Z" fill="#a9c2f2"/>
<path d="M0 36.5q4.5-3 9 0t9 0 9 0 9 0V60H0Z" fill="#1b3f91"/>
<circle cx="18" cy="12.2" r="5.6" fill="#ffffff" stroke="#14254f" stroke-width="0.9"/>
<path d="M18 9.6l2.3 1.7-.9 2.7h-2.8l-.9-2.7Z" fill="#14254f"/>
<path d="M18 9.6V6.8M20.3 11.3l2.7-.9M19.4 14l1.6 2.1M16.6 14l-1.6 2.1M15.7 11.3l-2.7-.9" stroke="#14254f" stroke-width="0.75"/>
<text x="18" y="46.8" text-anchor="middle" font-size="6.3" font-weight="800" letter-spacing="0.2" fill="#ffffff" font-family="system-ui, -apple-system, 'Segoe UI', sans-serif">MARINA</text>
<text x="18" y="54.4" text-anchor="middle" font-size="5.8" font-weight="800" letter-spacing="0.5" fill="#ffffff" font-family="system-ui, -apple-system, 'Segoe UI', sans-serif">· FC ·</text>
</g>
</svg>`
