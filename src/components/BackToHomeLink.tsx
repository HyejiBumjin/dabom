import Link from "next/link";

interface BackToHomeLinkProps {
  href?: string;
  children?: React.ReactNode;
  className?: string;
}

export function BackToHomeLink({
  href = "/",
  children = "홈으로",
  className = "text-sm text-zinc-600 hover:underline",
}: BackToHomeLinkProps) {
  return (
    <Link
      href={href}
      className={`inline-flex items-center gap-1.5 ${className}`}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={3}
        strokeLinecap="round"
        strokeLinejoin="round"
        className="size-4 shrink-0"
        aria-hidden
      >
        <path d="M19 12H5M12 19l-7-7 7-7" />
      </svg>
      <span>{children}</span>
    </Link>
  );
}
