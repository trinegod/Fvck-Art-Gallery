import { cache } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  parseFeedReturn,
  type FeedReturnQuery,
} from "@/lib/feed-return";
import {
  getPublicWorldThreadBySlug,
  getPublicWorldThreadResponses,
  worldThreadDescription,
} from "@/lib/world-threads";
import OwnerThreadDetail from "./owner-thread-detail";
import ThreadDetail from "./thread-detail";

type ThreadPageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<FeedReturnQuery>;
};

export const dynamic = "force-dynamic";

const validSlug = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const getPublicThread = cache(getPublicWorldThreadBySlug);
const getPublicResponses = cache(getPublicWorldThreadResponses);

function siteOrigin() {
  const configured = process.env.NEXT_PUBLIC_SITE_URL;
  if (configured) return configured.replace(/\/$/, "");
  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL ?? process.env.VERCEL_URL;
  return vercel ? `https://${vercel}` : "http://localhost:3000";
}

export async function generateMetadata({ params }: ThreadPageProps): Promise<Metadata> {
  const { slug } = await params;
  if (!validSlug.test(slug)) {
    return { title: "World Thread not found — NODEINE", robots: { index: false, follow: false } };
  }
  const thread = await getPublicThread(slug);
  if (!thread) {
    return { title: "Private World Thread — NODEINE", robots: { index: false, follow: false } };
  }

  const origin = siteOrigin();
  const title = `${thread.title} — World Threads — NODEINE`;
  const description = worldThreadDescription(thread);
  const canonical = `${origin}/threads/${thread.slug}`;
  const cover = thread.items[0]?.artwork;
  const coverUrl = cover
    ? new URL(cover.thumbSrc || cover.src, origin).toString()
    : undefined;

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      title,
      description,
      type: "article",
      url: canonical,
      siteName: "NODEINE",
      images: coverUrl ? [{ url: coverUrl, alt: `${thread.title} cover` }] : undefined,
    },
    twitter: {
      card: coverUrl ? "summary_large_image" : "summary",
      title,
      description,
      images: coverUrl ? [coverUrl] : undefined,
    },
  };
}

export default async function WorldThreadPage({ params, searchParams }: ThreadPageProps) {
  const [{ slug }, query] = await Promise.all([params, searchParams]);
  if (!validSlug.test(slug)) notFound();

  const thread = await getPublicThread(slug);
  if (!thread) return <OwnerThreadDetail slug={slug} />;

  const responses = await getPublicResponses(thread.id).catch(() => []);
  return (
    <ThreadDetail
      thread={thread}
      responses={responses}
      feedReturn={parseFeedReturn(query)}
    />
  );
}
