import Link from "next/link";

export default function NotFound() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6 text-center font-sans">
      <p className="text-xs font-mono font-bold uppercase tracking-[0.3em] text-gray-600 mb-6">404 · Not found</p>
      <h1 className="text-5xl md:text-7xl font-black uppercase tracking-tighter leading-none mb-8">
        This road
        <br />
        isn&apos;t on the map.
      </h1>
      <Link href="/" className="inline-block bg-black text-white px-7 py-4 text-sm font-bold uppercase tracking-widest border-2 border-black hover:bg-white hover:text-black transition-colors">
        Back to the intersection
      </Link>
    </main>
  );
}
