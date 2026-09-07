import MessagesView from "./messages-view";

type MessagesPageProps = {
  searchParams: Promise<{
    conversation?: string | string[];
    with?: string | string[];
    prototype?: string | string[];
    variant?: string | string[];
  }>;
};

export default async function MessagesPage({ searchParams }: MessagesPageProps) {
  const params = await searchParams;
  // Throwaway visual study. Never replace the real inbox in a production build.
  if (process.env.NODE_ENV === "development" && params.prototype === "chat") {
    const { default: ChatExperiencePrototype } = await import("./chat-experience-prototype");
    const variant = params.variant === "B" || params.variant === "C" ? params.variant : "A";
    return <ChatExperiencePrototype variant={variant} />;
  }
  const conversation = Array.isArray(params.conversation)
    ? params.conversation[0]
    : params.conversation;
  const profile = Array.isArray(params.with) ? params.with[0] : params.with;

  return (
    <MessagesView
      initialConversationId={conversation}
      initialProfileId={profile}
    />
  );
}
