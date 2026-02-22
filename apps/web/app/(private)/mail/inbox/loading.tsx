export default function Loading() {
  return (
    <div className="flex-1 space-y-1 p-4">
      {Array.from({ length: 12 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 p-3 rounded-lg">
          <div className="h-5 w-5 rounded bg-muted animate-pulse" />
          <div className="h-4 w-32 rounded bg-muted animate-pulse" />
          <div className="flex-1 space-y-1.5">
            <div className="h-4 w-3/4 rounded bg-muted animate-pulse" />
            <div className="h-3 w-1/2 rounded bg-muted/60 animate-pulse" />
          </div>
          <div className="h-3 w-16 rounded bg-muted/60 animate-pulse" />
        </div>
      ))}
    </div>
  );
}
