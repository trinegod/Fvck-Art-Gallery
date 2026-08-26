import type { Metadata } from "next";
import ThreadComposer from "../thread-composer";

export const metadata: Metadata = {
  title: "Create a World Thread — NODEINE",
  description: "Connect saved artwork into a credited visual lineage.",
  robots: { index: false, follow: false },
};

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export default async function NewWorldThreadPage({
  searchParams,
}: {
  searchParams: Promise<{ artwork?: string | string[] }>;
}) {
  const query = await searchParams;
  const artwork = Array.isArray(query.artwork) ? query.artwork[0] : query.artwork;

  return (
    <ThreadComposer
      mode="create"
      seedArtworkId={artwork && uuidPattern.test(artwork) ? artwork : null}
    />
  );
}
