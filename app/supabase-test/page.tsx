import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

export default async function SupabaseTestPage() {
  const { data, error } = await supabase
    .from("collections")
    .select("title, summary, world_code")
    .order("sort_order");

  if (error) {
    return (
      <main className="min-h-screen bg-black p-8 text-red-300">
        <h1 className="text-3xl font-semibold">Supabase Error</h1>
        <pre className="mt-4 whitespace-pre-wrap">{error.message}</pre>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-black p-8 text-white">
      <h1 className="text-3xl font-semibold">Supabase Test</h1>
      <p className="mt-2 text-zinc-400">
        If Cyber X appears below, your app is connected to Supabase.
      </p>

      <div className="mt-8 grid gap-4">
        {data?.map((collection) => (
          <article
            key={collection.title}
            className="rounded border border-white/10 bg-white/5 p-5"
          >
            <p className="text-sm uppercase tracking-[0.2em] text-cyan-300">
              {collection.world_code}
            </p>
            <h2 className="mt-2 text-2xl font-semibold">
              {collection.title}
            </h2>
            <p className="mt-2 text-zinc-400">{collection.summary}</p>
          </article>
        ))}
      </div>
    </main>
  );
}