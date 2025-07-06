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
      <rect x="3" y="2" width="18" height="20" rx="2" ry="2" fill="#E53935" stroke="currentColor" />
      <line x1="12" y1="2" x2="12" y2="22" stroke="#1F2937" strokeWidth="1" />
      <circle cx="17" cy="7" r="2" fill="#3B82F6" stroke="#FFFFFF" strokeWidth="1" />
      <circle cx="7" cy="7" r="1" fill="#FBBF24" />
      <circle cx="7" cy="10" r="1" fill="#EF4444" />
      <circle cx="7" cy="13" r="1" fill="#34D399" />
    </svg>
  );
}
