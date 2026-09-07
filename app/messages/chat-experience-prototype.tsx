"use client";

// THROWAWAY: three chat layouts on /messages?prototype=chat&variant=A|B|C.
// Question: immersive chat, separate art canvas, or audio-first salon?
// All conversation/voice/room state is fictional and in memory. No media capture or mutations.
import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Check, Eye, EyeOff, Headphones, Mic, MicOff, Palette, Play, Send, Sparkles, Square, Volume2 } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import DesktopAppNavigation from "../components/desktop-app-navigation";
import MobileAppNavigation from "../components/mobile-app-navigation";
import styles from "./chat-experience-prototype.module.css";

type Variant = "A" | "B" | "C";
type LayoutSlots = { chat: ReactNode; artwork: ReactNode; controls: ReactNode; room: ReactNode };
const variants: Variant[] = ["A", "B", "C"];
const variantNames = { A: "Atelier · immersive chat", B: "Gallery · art beside chat", C: "Salon · audio first" };
const palettes = [
  { name: "Glacier", bubble: "#8de6ed", ink: "#0b2025" },
  { name: "Orchid", bubble: "#d7c1f4", ink: "#271831" },
  { name: "Ember", bubble: "#f2c28a", ink: "#2b190d" },
];
const artworkPath = "/art/ash-005.webp";

export function VariantA({ chat, controls, room }: LayoutSlots) {
  return <div className={styles.atelier}><section>{chat}</section><aside>{controls}{room}</aside></div>;
}
export function VariantB({ artwork, chat, controls }: LayoutSlots) {
  return <div className={styles.gallery}><section className={styles.canvas}>{artwork}</section><section>{chat}{controls}</section></div>;
}
export function VariantC({ artwork, room, chat, controls }: LayoutSlots) {
  return <div className={styles.salon}><section className={styles.stage}>{artwork}{room}</section><aside>{chat}{controls}</aside></div>;
}

function Waveform() {
  return <span className={styles.wave} aria-hidden="true">{Array.from({ length: 27 }, (_, i) => <i key={i} style={{ height: `${7 + ((i * 17 + 9) % 25)}px` }} />)}</span>;
}

export default function ChatExperiencePrototype({ variant }: { variant: Variant }) {
  const router = useRouter();
  const [hidden, setHidden] = useState(false);
  const [dim, setDim] = useState(58);
  const [palette, setPalette] = useState(0);
  const [draft, setDraft] = useState("");
  const [messages, setMessages] = useState<string[]>([]);
  const [voice, setVoice] = useState<"idle" | "recording" | "preview">("idle");
  const [voiceSent, setVoiceSent] = useState(false);
  const [joined, setJoined] = useState(false);
  const [requested, setRequested] = useState(false);
  const [roomOpen, setRoomOpen] = useState(false);
  const [splashOpen, setSplashOpen] = useState(false);
  const [notice, setNotice] = useState("Try a layout, change the bubble color, or hide the artwork. Nothing is saved.");

  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      const element = event.target;
      if (element instanceof HTMLElement && (element.closest("input, textarea, select, [contenteditable], [role=dialog]") || splashOpen || roomOpen)) return;
      if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
      event.preventDefault();
      const next = variants[(variants.indexOf(variant) + (event.key === "ArrowRight" ? 1 : 2)) % 3];
      router.replace(`/messages?prototype=chat&variant=${next}`, { scroll: false });
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [variant, router, splashOpen, roomOpen]);

  const theme = { "--chat-bubble": palettes[palette].bubble, "--chat-ink": palettes[palette].ink } as CSSProperties;
  const changeVariant = (direction: number) => router.replace(`/messages?prototype=chat&variant=${variants[(variants.indexOf(variant) + direction + 3) % 3]}`, { scroll: false });
  const toggleArtwork = () => { setHidden(!hidden); setNotice(hidden ? "Artwork shown for you. Other members' views would stay unchanged." : "Artwork hidden for you only. The conversation continues."); };

  const artwork = <figure className={styles.artwork}>
    <div className={styles.artImage} style={{ backgroundImage: hidden ? "none" : `url(${artworkPath})` }} role="img" aria-label={hidden ? "Artwork hidden for your view" : "Red oni beneath a full moon, from the Ashigara archive"}>
      {hidden && <span><EyeOff size={28} /><br />Your quiet view</span>}
    </div>
    <figcaption><span className={styles.eyebrow}>On the wall</span><strong>Ashigara, after dark</strong><span>Artwork from your TRINE Archive · sample theme</span></figcaption>
  </figure>;

  const controls = <section className={styles.controls} aria-label="Chat appearance">
    <div className={styles.sectionTitle}><Palette size={17} /><h2>Make yourself at home</h2></div>
    <p>The room can be expressive. Your messages stay clear.</p>
    <button className={styles.wideButton} onClick={toggleArtwork} aria-pressed={hidden}>{hidden ? <Eye size={17} /> : <EyeOff size={17} />}{hidden ? "Show artwork" : "Hide artwork for me"}</button>
    <label className={styles.sliderLabel}>Background dimming <span>{dim}%</span><input aria-label="Background dimming" type="range" min="25" max="85" value={dim} disabled={hidden || variant !== "A"} onChange={(event) => setDim(Number(event.target.value))} /></label>
    {variant !== "A" && <small>Dimming applies to Atelier. This layout keeps the artwork separate.</small>}
    <fieldset><legend>Your bubble color</legend><div className={styles.swatches}>{palettes.map((color, index) => <button key={color.name} aria-label={`${color.name} bubble color`} aria-pressed={palette === index} onClick={() => setPalette(index)} style={{ background: color.bubble, color: color.ink }}>{palette === index && <Check size={14} />}{color.name}</button>)}</div></fieldset>
    <small>Solid bubbles. Protected labels. Personal visibility control.</small>
  </section>;

  const room = <section className={styles.room} aria-label="Audio room visual demo">
    <span className={styles.eyebrow}><Headphones size={14} /> AUDIO ROOM · VISUAL DEMO</span>
    <h2>After-hours atelier</h2><p>A small space to talk through the work.</p>
    <div className={styles.people}>{["Emi", "Aya", "Sol"].map((name, index) => <div key={name}><span className={index === 0 ? styles.host : ""}>{name[0]}</span><strong>{name}</strong><small>{index === 0 ? "Host" : "Listener"}</small></div>)}</div>
    <div className={styles.roomNote}><MicOff size={16} /><span>{joined ? "Demo joined as a listener. Your microphone is OFF." : "Invite-only concept · no recording · fictional members"}</span></div>
    <button className={styles.primaryButton} onClick={() => { setJoined(!joined); setRequested(false); setNotice(joined ? "Left the room demo. No connection was made." : "Joined the visual demo. No live audio or microphone connection."); }}>{joined ? "Leave demo room" : "Join room demo"}</button>
    {joined && <button className={styles.wideButton} disabled={requested} onClick={() => { setRequested(true); setNotice("Speaker request simulated. A real room would need host approval, then your explicit unmute."); }}>{requested ? "Request sent · demo" : "Request to speak · demo"}</button>}
  </section>;

  const chat = <div className={styles.chat}>
    <header className={styles.chatHeader}><span className={styles.groupAvatar}>A</span><div><h2>Ashigara studio</h2><p>3 fictional members · sample conversation</p></div><button aria-label="Preview audio room" title="Preview audio room" onClick={() => setRoomOpen(true)}><Headphones size={20} /></button></header>
    <div className={styles.chatBody} style={{ backgroundImage: variant === "A" && !hidden ? `linear-gradient(rgba(9,11,15,${dim / 100}),rgba(9,11,15,${dim / 100})),url(${artworkPath})` : "none" }}>
      <span className={styles.dayLabel}>Today · sample messages</span>
      <article className={styles.received}><span className={styles.messageLabel}>Emi · 8:42 PM</span><p>The moonlight gives this world such a strong identity. Could we keep that in the next character?</p></article>
      <article className={styles.sent}><span className={styles.messageLabel}>You · 8:43 PM</span><p>Yes. Same world, a different story. Let’s keep the silhouette quieter and let the light do the work.</p></article>
      <article className={styles.received}><span className={styles.messageLabel}>Aya · 8:44 PM</span><div className={styles.voiceSample}><Volume2 size={17} /><Waveform /><span>0:18</span></div><small>Voice-note appearance only · no audio</small></article>
      {messages.map((message, index) => <article className={styles.sent} key={index}><span className={styles.messageLabel}>You · local demo</span><p>{message}</p></article>)}
      {voiceSent && <article className={styles.sent}><span className={styles.messageLabel}>You · local demo</span><div className={styles.voiceSample}><Mic size={17} /><Waveform /><span>0:08</span></div><small>Simulated voice note · no recording was made</small></article>}
    </div>
    <div className={styles.composer}>
      {voice !== "idle" && <div className={styles.recordPreview}>
        <span>{voice === "recording" ? "Recording state · simulation only" : "Preview state · no real audio"}</span><Waveform />
        <div><button onClick={() => setVoice("idle")}>Discard</button>{voice === "recording" ? <button onClick={() => setVoice("preview")}><Square size={14} /> Stop demo</button> : <button onClick={() => { setVoiceSent(true); setVoice("idle"); setNotice("Voice-note placeholder added locally. Nothing uploaded or sent."); }}>Add demo note</button>}</div>
      </div>}
      <form onSubmit={(event) => { event.preventDefault(); if (!draft.trim()) return; setMessages([...messages, draft.trim()]); setDraft(""); setNotice("Sample message added to this preview only. Nothing sent."); }}>
        <button type="button" aria-label="Simulate voice recording" title="Simulate voice recording — no microphone" onClick={() => { setVoice("recording"); setNotice("Recording interface simulation. Your microphone is not accessed."); }}><Mic size={20} /></button>
        <label><span className="sr-only">Sample message</span><input value={draft} maxLength={2000} onChange={(event) => setDraft(event.target.value)} placeholder="Try a sample message…" /></label>
        <button type="submit" aria-label="Add sample message" disabled={!draft.trim()}><Send size={18} /></button>
      </form><small>Preview only. No messages are sent or saved.</small>
    </div>
  </div>;

  return <main className={styles.prototype} style={theme}>
    <header className={styles.topbar}><Link href="/feed" className={styles.wordmark}>NODEINE<span>THE TRINE ARCHIVE</span></Link><DesktopAppNavigation /><Link href="/messages" className={styles.backLink}>Exit preview <ArrowRight size={15} /></Link></header>
    <div className={styles.intro}><div><span className={styles.eyebrow}>CONVERSATIONS / DESIGN STUDY</span><h1>Art gives the room a voice.</h1><p>Three ways to be together, around the work.</p></div><button className={styles.wideButton} onClick={() => setSplashOpen(true)}><Sparkles size={17} /> Preview launch screen</button></div>
    <div className={styles.demoNotice}><span>LOCAL PROTOTYPE</span>Sample people and messages. Audio is simulated. Nothing is published.</div>
    {variant === "A" ? <VariantA chat={chat} controls={controls} room={room} artwork={artwork} /> : variant === "B" ? <VariantB chat={chat} controls={controls} room={room} artwork={artwork} /> : <VariantC chat={chat} controls={controls} room={room} artwork={artwork} />}
    <section className={styles.state} aria-label="Prototype state"><p role="status">{notice}</p><small>Layout {variant} · Artwork {hidden ? "hidden for you" : "visible"} · {palettes[palette].name} · Dimming {dim}% · Voice {voice} · Room {joined ? "demo joined" : "not joined"} · Microphone OFF · Saved data: none</small></section>
    {process.env.NODE_ENV !== "production" && <nav className={styles.switcher} aria-label="Prototype layout options"><button onClick={() => changeVariant(-1)} aria-label="Previous layout"><ArrowLeft size={18} /></button><div><span>LAYOUT PREVIEW · {variants.indexOf(variant) + 1} / 3</span><strong>{variantNames[variant]}</strong></div><button onClick={() => changeVariant(1)} aria-label="Next layout"><ArrowRight size={18} /></button></nav>}
    <MobileAppNavigation />
    <Dialog open={roomOpen} onOpenChange={setRoomOpen}><DialogContent className="max-h-[90svh] overflow-y-auto border border-white/15 bg-zinc-950 sm:max-w-md"><DialogTitle>Audio-room preview</DialogTitle><DialogDescription>Visual demo only. No microphone or live connection.</DialogDescription><div className={styles.prototype} style={theme}>{room}</div></DialogContent></Dialog>
    <Dialog open={splashOpen} onOpenChange={setSplashOpen}><DialogContent className="border border-white/15 bg-zinc-950 p-10 text-center sm:max-w-md"><DialogTitle className="sr-only">Launch-screen concept</DialogTitle><div className={styles.splash}><span className={styles.launchMark} aria-hidden="true">N</span><strong>NODEINE</strong><span>WORLDS WORTH ENTERING.</span><i className={styles.loader} aria-hidden="true" /></div><DialogDescription>Launch-screen preview. In the app, this would disappear as soon as the page is ready—not delay entry.</DialogDescription><button className={styles.primaryButton} onClick={() => setSplashOpen(false)}><Play size={15} /> Back to the preview</button></DialogContent></Dialog>
  </main>;
}
