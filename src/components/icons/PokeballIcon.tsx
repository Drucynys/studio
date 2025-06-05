import type { SVGProps } from 'react';

export function PokeballIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <circle cx="12" cy="12" r="10" fill="hsl(var(--card))" stroke="hsl(var(--foreground))" />
      <path d="M12 2a10 10 0 0 0-10 10h20A10 10 0 0 0 12 2Z" fill="hsl(var(--destructive))" stroke="hsl(var(--foreground))" />
      <path d="M12 12H2a10 10 0 0 0 10 10Z" fill="hsl(var(--card))" />
      <path d="M12 12h10a10 10 0 0 1-10 10Z" fill="hsl(var(--card))" />
      <circle cx="12" cy="12" r="3" fill="hsl(var(--card))" stroke="hsl(var(--foreground))" />
      <circle cx="12" cy="12" r="1" fill="hsl(var(--foreground))" stroke="hsl(var(--foreground))" />
    </svg>
  );
}
