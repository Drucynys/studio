// src/components/CardSkeleton.tsx
import { Skeleton } from "@/components/ui/skeleton";

interface CardSkeletonProps {
  count?: number;
  gridClassName?: string;
}

export function CardSkeleton({ 
  count = 12, 
  gridClassName = "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 pt-4 px-4" 
}: CardSkeletonProps) {
  return (
    <div className={gridClassName}>
      {Array.from({ length: count }).map((_, i) => (
        <div 
          key={i} 
          className="aspect-[2.5/3.5] w-full rounded-lg bg-card border border-border/40 p-2 flex flex-col justify-between shadow-sm relative overflow-hidden"
        >
          {/* Top card detail line */}
          <div className="flex justify-between items-center mb-2">
            <Skeleton className="h-3.5 w-24" />
            <Skeleton className="h-4 w-8 rounded-full" />
          </div>
          
          {/* Main Card Art Area */}
          <div className="flex-grow w-full relative rounded-md overflow-hidden bg-muted/40 mb-2 flex items-center justify-center">
            {/* Shimmer pulse circle representing Pokeball in center */}
            <div className="w-12 h-12 rounded-full border-2 border-dashed border-muted flex items-center justify-center animate-spin [animation-duration:12s]">
              <div className="w-4 h-4 rounded-full bg-muted" />
            </div>
          </div>
          
          {/* Bottom detail area */}
          <div className="space-y-1.5 pt-1">
            <Skeleton className="h-3 w-4/5" />
            <div className="flex justify-between items-center">
              <Skeleton className="h-3 w-1/3" />
              <Skeleton className="h-4 w-10 rounded-sm" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
