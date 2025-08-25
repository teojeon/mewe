export default function Loading() {
  return (
    <section className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 animate-pulse">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="card h-64 bg-neutral-100" />
      ))}
    </section>
  );
}
