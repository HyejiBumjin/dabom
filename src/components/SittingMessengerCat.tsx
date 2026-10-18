"use client";

import { useId } from "react";

/** Keep the seated mascot still and animate only its separate tail silhouette. */
export function SittingMessengerCat() {
  const id = useId();
  const tailClip = `${id}-tail`;
  const bodyClip = `${id}-body`;

  return (
    <svg className="retro-cat retro-sitting-cat" viewBox="0 0 64 64" fill="none" aria-hidden="true">
      <defs>
        <clipPath id={tailClip} clipPathUnits="userSpaceOnUse">
          <path d="M40.5 0H64V64H39V49H40.5Z" />
        </clipPath>
        <clipPath id={bodyClip} clipPathUnits="userSpaceOnUse">
          <path d="M0 0H40.5V49H39.8V54H40.5V64H0Z" />
        </clipPath>
      </defs>
      <g className="retro-sitting-tail">
        <image href="/images/dabom-cat-sitting.png" width="64" height="64" clipPath={`url(#${tailClip})`} />
      </g>
      {/* The body overlaps the tail root to keep the joint covered as it sways. */}
      <image className="retro-sitting-body" href="/images/dabom-cat-sitting.png" width="64" height="64" clipPath={`url(#${bodyClip})`} />
    </svg>
  );
}
