"use client";

import { useId } from "react";

/** Animate the approved artwork's tail while the body, feet and letter stay still. */
export function AnimatedMessengerCat() {
  const id = useId();
  const tailClip = `${id}-tail`;
  const bodyClip = `${id}-body`;

  return <svg className="retro-cat retro-messenger-cat" viewBox="0 0 64 64" fill="none" aria-hidden="true">
    <defs>
      {/* Coordinates follow the tail silhouette in the 1254px source, scaled to 64. */}
      <clipPath id={tailClip} clipPathUnits="userSpaceOnUse">
        <path d="M0 0H30.6V32.1H17.7V40.1H0Z" />
      </clipPath>
      <clipPath id={bodyClip} clipPathUnits="userSpaceOnUse">
        <path d="M30.6 0H64V64H0V37.7H17.7V32.1H30.6Z" />
      </clipPath>
    </defs>
    <g className="retro-messenger-tail">
      <image href="/images/dabom-cat-c.png" width="64" height="64" clipPath={`url(#${tailClip})`} />
    </g>
    {/* Draw the body last: the overlapping tail root stays covered during rotation. */}
    <image className="retro-messenger-body" href="/images/dabom-cat-c.png" width="64" height="64" clipPath={`url(#${bodyClip})`} />
  </svg>;
}
