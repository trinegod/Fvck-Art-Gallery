import type { Metadata } from "next";
import ThreadComposer from "../../thread-composer";

export const metadata: Metadata = {
  title: "Edit World Thread — NODEINE",
  robots: { index: false, follow: false },
};

export default async function EditWorldThreadPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return <ThreadComposer mode="edit" slug={slug} />;
}
