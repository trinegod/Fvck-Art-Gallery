import { isFeedMode, type FeedMode } from "@/lib/feed";

export type FeedReturnContext = {
  mode: FeedMode;
  signalId: string;
};

export type FeedReturnQueryValue = string | string[] | undefined;

export type FeedReturnQuery = {
  feedMode?: FeedReturnQueryValue;
  feedSignal?: FeedReturnQueryValue;
};

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const internalOrigin = "https://nodeine.invalid";

function firstQueryValue(value: FeedReturnQueryValue) {
  return Array.isArray(value) ? value[0] : value;
}

function validatedContext(context: FeedReturnContext) {
  if (!isFeedMode(context.mode) || !uuidPattern.test(context.signalId)) {
    return null;
  }

  return {
    mode: context.mode,
    signalId: context.signalId.toLowerCase(),
  } satisfies FeedReturnContext;
}

export function parseFeedReturn(
  query: FeedReturnQuery
): FeedReturnContext | null {
  const mode = firstQueryValue(query.feedMode);
  const signalId = firstQueryValue(query.feedSignal);

  if (!isFeedMode(mode) || !signalId || !uuidPattern.test(signalId)) {
    return null;
  }

  return { mode, signalId: signalId.toLowerCase() };
}

export function buildFeedReturnHref(context: FeedReturnContext) {
  const validated = validatedContext(context);
  if (!validated) return "/feed";

  const query = new URLSearchParams({
    mode: validated.mode,
    signal: validated.signalId,
  });
  return `/feed?${query.toString()}#signal-${validated.signalId}`;
}

export function appendFeedReturnContext(
  href: string,
  context: FeedReturnContext
) {
  if (!href.startsWith("/") || href.startsWith("//")) {
    throw new TypeError("Feed return context can only be added to an internal path.");
  }

  const validated = validatedContext(context);
  if (!validated) return href;

  const destination = new URL(href, internalOrigin);
  destination.searchParams.set("feedMode", validated.mode);
  destination.searchParams.set("feedSignal", validated.signalId);

  return `${destination.pathname}${destination.search}${destination.hash}`;
}
