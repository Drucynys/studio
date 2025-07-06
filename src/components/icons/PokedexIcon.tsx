import type { SVGProps } from 'react';

export function PokedexIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      {/* Main red body */}
      <path d="M4 4h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z" fill="#dc2626" />
      {/* Top darker red flap */}
      <path d="M22 6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v3h20V6z" fill="#b91c1c" />
      {/* White stroke to separate */}
      <line x1="2" y1="9" x2="22" y2="9" stroke="#fff" strokeWidth="0.5" />
      {/* Blue lens */}
      <circle cx="17" cy="6" r="2.5" fill="#3b82f6" stroke="#fff" strokeWidth="1.5" />
       {/* Small indicator lights */}
      <circle cx="6" cy="13" r="1" fill="#facc15" />
      <circle cx="9" cy="13" r="1" fill="#ef4444" />
      <circle cx="12" cy="13" r="1" fill="#4ade80" />
    </svg>
  );
}
