import type { MessageDay } from "@/lib/message-days";

export default function MessageDayDivider({ day }: { day: MessageDay }) {
  return <div data-chat-day={day.dateTime} className="flex min-w-0 items-center justify-center gap-3 py-1">
    <span aria-hidden="true" className="h-px w-8 shrink-0 bg-white/10" />
    <time dateTime={day.dateTime} title={day.fullDate}
      aria-label={day.label === "Today" || day.label === "Yesterday" ? `${day.label}, ${day.fullDate}` : day.fullDate}
      className="min-w-0 rounded-full bg-[#202632] px-3 py-1 text-center text-[11px] leading-4 text-[#c7cfde]">
      {day.label}
    </time>
    <span aria-hidden="true" className="h-px w-8 shrink-0 bg-white/10" />
  </div>;
}
