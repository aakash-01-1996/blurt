/**
 * Reusable shimmer/skeleton primitives for loading states.
 * Usage: <ShimmerBox className="h-6 w-48 rounded-md" />
 *        <ShimmerText lines={3} />
 */

export function ShimmerBox({ className = "" }: { className?: string }) {
  return (
    <div
      className={`animate-pulse bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 bg-[length:200%_100%] rounded ${className}`}
      style={{ animation: "shimmer 1.4s ease-in-out infinite" }}
    />
  );
}

export function ShimmerText({ lines = 1, className = "" }: { lines?: number; className?: string }) {
  const widths = ["w-full", "w-5/6", "w-4/6", "w-3/4", "w-2/3"];
  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <ShimmerBox key={i} className={`h-4 ${widths[i % widths.length]}`} />
      ))}
    </div>
  );
}

export function ShimmerCard({ className = "" }: { className?: string }) {
  return (
    <div className={`bg-white rounded-2xl p-4 flex flex-col gap-3 ${className}`}>
      <div className="flex items-center gap-2">
        <ShimmerBox className="h-5 w-16 rounded-full" />
        <ShimmerBox className="h-4 w-24" />
      </div>
      <ShimmerText lines={2} />
      <div className="flex gap-2 pt-1">
        <ShimmerBox className="h-8 flex-1 rounded-lg" />
        <ShimmerBox className="h-8 flex-1 rounded-lg" />
      </div>
    </div>
  );
}

export function ShimmerRow({ className = "" }: { className?: string }) {
  return (
    <div className={`bg-white rounded-2xl p-4 flex items-center justify-between ${className}`}>
      <div className="flex flex-col gap-2">
        <ShimmerBox className="h-4 w-32" />
        <ShimmerBox className="h-3 w-20" />
      </div>
      <ShimmerBox className="h-6 w-20 rounded-full" />
    </div>
  );
}
