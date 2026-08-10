export type Profile = {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
};
export type ConversationRole = "owner" | "admin" | "member";

export type ConversationRow = {
  id: string;
  kind: "direct" | "group";
  title: string | null;
  avatar_path: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
};

export type MembershipRow = {
  conversation_id: string;
  profile_id: string;
  role: ConversationRole;
  joined_at: string;
  last_read_at: string | null;
  muted_until: string | null;
};

export type MessageType = "text" | "artwork" | "image" | "video";

export type MessageRow = {
  id: string;
  conversation_id: string;
  sender_id: string;
  body: string | null;
  message_type: MessageType;
  artwork_id: string | null;
  attachment_path: string | null;
  attachment_mime: string | null;
  attachment_name: string | null;
  created_at: string;
  attachmentUrl?: string | null;
};

export type InboxConversation = ConversationRow & {
  members: MembershipRow[];
  memberIds: string[];
  memberCount: number;
  otherProfile: Profile | null;
  avatarUrl: string | null;
  preview: string;
  previewAt: string;
  unreadCount: number;
};

export type PendingGroupInvite = {
  invite_id: string;
  conversation_id: string;
  conversation_title: string;
  avatar_path: string | null;
  invited_by: string;
  invited_at: string;
};

export type ConversationInviteRow = {
  id: string;
  conversation_id: string;
  invited_profile_id: string;
  invited_by: string;
  status: "pending" | "accepted" | "declined" | "cancelled";
  created_at: string;
  responded_at: string | null;
};

export type SharedArtwork = {
  id: string;
  collection_id?: string | null;
  title: string;
  src: string;
  thumb_src: string | null;
  media_type: "image" | "video";
  mood: string | null;
};
