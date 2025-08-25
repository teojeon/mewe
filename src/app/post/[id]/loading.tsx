export default function Loading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-8 w-24 bg-neutral-100 rounded" />
      <div className="card h-[60vh] bg-neutral-100" />
      <div className="grid gap-4 sm:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="card h-20 bg-neutral-100" />
        ))}
      </div>
    </div>
  );
}
