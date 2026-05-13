export default function Loading() {
  return (
    <div className="container py-24 flex flex-col items-center gap-3">
      <span className="inline-block size-6 rounded-full border-2 border-swamp-100 border-t-swamp-500 animate-spin" />
      <p className="font-mono text-xs uppercase tracking-wider text-gray-400">
        Loading…
      </p>
    </div>
  );
}
