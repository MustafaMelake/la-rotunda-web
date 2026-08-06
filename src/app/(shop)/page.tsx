// Server Component by default: fetch with Prisma directly in the body — no API
// route, no client fetch, no first-paint spinner.
export default function HomePage() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-16">
      <h1 className="font-serif text-4xl">La Rotunda</h1>
      <p className="mt-2 text-stone-600">Pizza · Fried chicken · and more.</p>
    </section>
  );
}
