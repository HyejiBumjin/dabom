/** Original poses using Dabom's charcoal/lavender pixel mascot palette. */
export function ExpressiveCat({ mood = "curious", className = "" }: { mood?: "curious" | "surprised" | "flustered"; className?: string }) {
  return <svg className={`retro-cat retro-expression-cat retro-expression-cat--${mood} ${className}`} viewBox="0 0 80 80" fill="none" aria-hidden="true" shapeRendering="crispEdges">
    <path d="M14 74H67V76H14Z" fill="#dcdcf1" />
    <path className="retro-expression-tail" d="M51 66H61V61H65V47H70V64H66V70H53Z" fill="#373044" />
    <path d="M25 43H50V49H54V68H50V73H39V69H35V73H22V68H20V54H25Z" fill="#373044" />
    <path d="M25 54H29V68H25ZM44 55H48V68H44Z" fill="#51435f" />
    <g className="retro-expression-head">
      <path d="M15 30V10H20V14H25V19H46V14H51V10H56V30H60V44H56V49H50V53H22V49H16V44H12V30Z" fill="#373044" />
      <path d="M19 20V28H27V24H23V20ZM52 20V28H44V24H48V20Z" fill="#bba5d1" />
      {mood === "flustered" ? <path d="M23 34H28V37H23ZM44 34H49V37H44Z" fill="#fff0cf" /> : <g className="retro-expression-eyes"><path d="M24 32H28V40H24ZM44 32H48V40H44Z" fill="#fff0cf" /><path d="M25 32H28V37H25ZM45 32H48V37H45Z" fill="#191623" /></g>}
      <path d="M33 40H39V43H37V45H35V43H33Z" fill="#d7b9d1" />
      {mood === "surprised" ? <path d="M34 46H38V50H34Z" fill="#fff0cf" /> : <path d="M30 46H34V44H36V46H40V48H36V46H34V48H30Z" fill="#c0aac7" />}
      <path d="M18 42H23V44H18ZM49 42H54V44H49Z" fill="#75617d" />
    </g>
    {mood === "curious" && <path className="retro-expression-paw" d="M19 51H25V57H22V63H17V59H15V54H19Z" fill="#51435f" />}
    {mood === "surprised" && <g className="retro-expression-notice"><path d="M65 5H71V19H65ZM65 23H71V29H65Z" fill="#9d81c6" /></g>}
    {mood === "flustered" && <path className="retro-expression-sweat" d="M59 24H62V28H65V36H62V39H57V36H55V30H57V27H59Z" fill="#a5d4ec" stroke="#709abc" strokeWidth="1" />}
  </svg>;
}
