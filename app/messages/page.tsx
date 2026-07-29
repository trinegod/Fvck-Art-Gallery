import MessagesView from "./messages-view";

type MessagesPageProps = {
  searchParams: Promise<{
    conversation?: string | string[];
    with?: string | string[];
  }>;
};

export default async function MessagesPage({ searchParams }: MessagesPageProps) {
  const params = await searchParams;
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
