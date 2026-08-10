"use client";

import { Users } from "lucide-react";
import PolishedImage from "../components/polished-image";
import type { Profile } from "./messages-types";

type ConversationAvatarProps = {
  profile?: Profile | null;
  group?: boolean;
  groupAvatarUrl?: string | null;
  className?: string;
};

export default function ConversationAvatar({
  profile,
  group = false,
  groupAvatarUrl,
  className = "size-11",
}: ConversationAvatarProps) {
  const initial = profile?.display_name.charAt(0).toUpperCase() || "N";
  const imageUrl = group ? groupAvatarUrl : profile?.avatar_url;

  return (
    <span
      className={`grid shrink-0 place-items-center overflow-hidden rounded-full border border-white/12 bg-cyan-300/8 text-sm font-medium text-cyan-200 ${className}`}
      aria-hidden="true"
    >
      {imageUrl ? (
        <PolishedImage
          src={imageUrl}
          alt=""
          wrapperClassName="size-full"
          className="size-full object-cover"
        />
      ) : group ? (
        <Users className="size-5" />
      ) : (
        initial
      )}
    </span>
  );
}
