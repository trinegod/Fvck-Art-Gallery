import assert from "node:assert/strict";
import test from "node:test";
import { createElement, isValidElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ArtworkSignalTrail from "../app/components/artwork-signal-trail";
import ThreadCard from "../app/threads/thread-card";
import ThreadDetail from "../app/threads/[slug]/thread-detail";
import { buildFeedReturnHref, parseFeedReturn, type FeedReturnContext } from "../lib/feed-return";
import type { WorldThread } from "../lib/world-threads";

const context: FeedReturnContext = {
  mode: "discover",
  signalId: "f9cd5733-0aa3-44d5-b88b-f0fd63719945",
};
const artworkId = "766265af-4837-5852-9b20-b028e66db9b6";
const thread: WorldThread = {
  id: "thread-one", ownerId: "owner-one", title: "A related chronicle", slug: "related-chronicle",
  summary: null, visibility: "public", allowForks: true,
  createdAt: "2026-09-01T12:00:00Z", updatedAt: "2026-09-01T12:00:00Z",
  owner: null, forkedFromId: "thread-source",
  forkedFrom: { id: "thread-source", slug: "source-chronicle", title: "Source chronicle" },
  itemCount: 0, items: [],
};

function hrefs(markup: string) {
  return Array.from(markup.matchAll(/href="([^"]+)"/g), (match) => match[1].replaceAll("&amp;", "&"));
}

function assertReturnContext(href: string) {
  const query = new URL(href, "https://nodeine.invalid").searchParams;
  const next = parseFeedReturn({ feedMode: query.get("feedMode") ?? undefined, feedSignal: query.get("feedSignal") ?? undefined });
  assert.deepEqual(next, context);
  assert.equal(buildFeedReturnHref(next!), `/feed?mode=discover&signal=${context.signalId}#signal-${context.signalId}`);
}

test("rendered Signal Trail links retain the original feed after another artwork hop", () => {
  const markup = renderToStaticMarkup(createElement(ArtworkSignalTrail, {
    items: [{ id: artworkId, title: "A related artwork", src: "/related.jpg", thumbSrc: null,
      mediaType: "image", mood: null, tags: [], collectionId: "world", collectionTitle: "World", reason: "Same World", score: 1 }],
    ...{ feedReturn: context },
  }));
  const relatedHref = hrefs(markup).find((href) => href.startsWith(`/artwork/${artworkId}`));
  assert.ok(relatedHref);
  assertReturnContext(relatedHref);
});

test("rendered response cards carry the originating feed, not the response artwork", () => {
  const markup = renderToStaticMarkup(createElement(ThreadCard, { thread, ...{ feedReturn: context } }));
  const responseHref = hrefs(markup).find((href) => href.startsWith(`/threads/${thread.slug}`));
  assert.ok(responseHref);
  assertReturnContext(responseHref);
});

test("Chronicle detail passes feed context into response cards and its fork-source link", () => {
  const detail = ThreadDetail({ thread, responses: [{ ...thread, id: "response", slug: "response" }], feedReturn: context });
  const links: string[] = [];
  const responseContexts: unknown[] = [];
  function visit(node: ReactNode) {
    if (Array.isArray(node)) return node.forEach(visit);
    if (!isValidElement<{ href?: string; children?: ReactNode; feedReturn?: FeedReturnContext }>(node)) return;
    if (node.props.href) links.push(node.props.href);
    if (node.type === ThreadCard) responseContexts.push(node.props.feedReturn);
    visit(node.props.children);
  }
  visit(detail);
  assert.deepEqual(responseContexts, [context]);
  const sourceHref = links.find((href) => href.startsWith("/threads/source-chronicle"));
  assert.ok(sourceHref);
  assertReturnContext(sourceHref);
});

test("direct visitors still get clean related links with no synthetic feed return", () => {
  const markup = renderToStaticMarkup(createElement(ThreadCard, { thread }));
  assert.ok(hrefs(markup).includes(`/threads/${thread.slug}`));
  assert.equal(markup.includes("feedSignal"), false);
});
