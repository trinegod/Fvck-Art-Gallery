"use client";

import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type RefObject } from "react";
import { ArrowDown, Check, ImageIcon, LoaderCircle, Play, Search, Send, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { supabase } from "@/lib/supabase-browser";
import { filterPickerArtworks, loadPickerArtworks, type ArtworkWorld } from "@/lib/artwork-picker";
import type { ArtworkShareResult } from "@/lib/artwork-share";
import PolishedImage from "../components/polished-image";
import type { SharedArtwork } from "./messages-types";
import styles from "./artwork-share-dialog.module.css";

type ArtworkShareDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onShare: (artwork: SharedArtwork) => Promise<ArtworkShareResult>;
  returnFocusRef: RefObject<HTMLButtonElement | null>;
};

export default function ArtworkShareDialog(props: ArtworkShareDialogProps) {
  // Reopening fetches fresh artwork and never inherits an unfinished selection.
  return <ArtworkPickerSession key={String(props.open)} {...props} />;
}

function ArtworkPickerSession({ open, onOpenChange, onShare, returnFocusRef }: ArtworkShareDialogProps) {
  const [artworks, setArtworks] = useState<SharedArtwork[]>([]);
  const [worlds, setWorlds] = useState<ArtworkWorld[]>([]);
  const [worldId, setWorldId] = useState("all");
  const [search, setSearch] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [retry, setRetry] = useState(0);
  const [sharing, setSharing] = useState(false);
  const [delivery, setDelivery] = useState<Exclude<ArtworkShareResult, { status: "sent" }> | null>(null);
  const [moreBelow, setMoreBelow] = useState(false);
  const [reflow, setReflow] = useState(false);
  const [viewport, setViewport] = useState<{ height: number; top: number } | null>(null);
  const galleryRef = useRef<HTMLDivElement>(null);
  const browserRef = useRef<HTMLDivElement>(null);
  const filtersRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const searchToggleRef = useRef<HTMLButtonElement>(null);
  const sendLock = useRef(false);
  const mounted = useRef(true);
  const searchId = useId();
  const hintId = useId();
  const locked = sharing || delivery?.status === "unconfirmed";

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  useEffect(() => {
    if (!open) return;
    const visualViewport = window.visualViewport;
    if (!visualViewport) return;
    // iOS keyboards can resize only the visual viewport, not CSS viewport units.
    const update = () => setViewport(current => {
      const next = { height: visualViewport.height, top: visualViewport.offsetTop };
      return current?.height === next.height && current.top === next.top ? current : next;
    });
    update();
    visualViewport.addEventListener("resize", update);
    visualViewport.addEventListener("scroll", update);
    return () => {
      visualViewport.removeEventListener("resize", update);
      visualViewport.removeEventListener("scroll", update);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const database = supabase;
    let cancelled = false;
    const request = new AbortController();
    async function load() {
      setLoading(true);
      setLoadError(null);
      try {
        if (!database) throw new Error("Artwork is unavailable right now.");
        const [pieces, worldResult] = await Promise.all([
          loadPickerArtworks((from, to) => database.from("artworks")
            .select("id, collection_id, title, src, thumb_src, media_type, mood")
            .order("created_at", { ascending: false }).order("sort_order", { ascending: true }).order("id", { ascending: true }).range(from, to).abortSignal(request.signal)),
          database.from("collections").select("id, title, world_code, sort_order").order("sort_order", { ascending: true }).abortSignal(request.signal),
        ]);
        if (worldResult.error) throw new Error(worldResult.error.message);
        if (!Array.isArray(worldResult.data)) throw new Error("Worlds response was incomplete.");
        if (cancelled) return;
        setArtworks(pieces);
        setWorlds((worldResult.data ?? []) as ArtworkWorld[]);
      } catch {
        if (!cancelled) setLoadError("We couldn't load the artwork. Check your connection and try again.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => { cancelled = true; request.abort(); };
  }, [open, retry]);

  const filtered = useMemo(() => filterPickerArtworks(artworks, worldId, search), [artworks, worldId, search]);
  const selected = filtered.find(artwork => artwork.id === selectedId) ?? null;
  const counts = useMemo(() => {
    const result = new Map<string, number>();
    for (const artwork of artworks) {
      if (artwork.collection_id) result.set(artwork.collection_id, (result.get(artwork.collection_id) ?? 0) + 1);
    }
    return result;
  }, [artworks]);

  useLayoutEffect(() => {
    const gallery = galleryRef.current;
    const browser = browserRef.current;
    const filters = filtersRef.current;
    const header = browser?.querySelector("header");
    if (!open || !gallery || !browser || !filters || !header) return;
    const scroller = reflow ? browser : gallery;
    const update = () => {
      const headerHeight = `${header.clientHeight}px`;
      if (browser.style.getPropertyValue("--picker-header-height") !== headerHeight) browser.style.setProperty("--picker-header-height", headerHeight);
      // At large text sizes or with the keyboard up, let the filters scroll
      // away too instead of trapping the artwork in a tiny remaining strip.
      setReflow(browser.clientHeight - header.clientHeight - filters.clientHeight < 160);
      setMoreBelow(scroller.scrollHeight - scroller.clientHeight - scroller.scrollTop > 4);
    };
    const observer = new ResizeObserver(update);
    observer.observe(gallery);
    observer.observe(browser);
    observer.observe(filters);
    observer.observe(header);
    update();
    scroller.addEventListener("scroll", update, { passive: true });
    return () => { observer.disconnect(); scroller.removeEventListener("scroll", update); };
  }, [open, filtered.length, loading, loadError, reflow]);

  function resetSelection() {
    setSelectedId(null);
    setDelivery(null);
    galleryRef.current?.scrollTo({ top: 0, behavior: "instant" });
    browserRef.current?.scrollTo({ top: 0, behavior: "instant" });
  }

  function changeOpen(next: boolean) {
    if (!sendLock.current) onOpenChange(next);
  }

  function toggleSearch() {
    if (searchOpen) {
      setSearch("");
      resetSelection();
      setSearchOpen(false);
      searchToggleRef.current?.focus();
    } else setSearchOpen(true);
  }

  useEffect(() => {
    if (searchOpen) searchRef.current?.focus();
  }, [searchOpen]);

  async function shareSelected() {
    if (!selected || locked || sendLock.current) return;
    sendLock.current = true;
    setSharing(true);
    setDelivery(null);
    try {
      const result = await onShare(selected);
      if (!mounted.current) return;
      if (result.status === "sent") onOpenChange(false);
      else setDelivery(result);
    } catch {
      if (mounted.current) setDelivery({ status: "unconfirmed", message: "Delivery couldn't be confirmed. Check this chat before trying again." });
    } finally {
      sendLock.current = false;
      if (mounted.current) setSharing(false);
    }
  }

  const viewportStyle = viewport ? {
    "--picker-viewport-height": `${viewport.height}px`,
    "--picker-viewport-top": `${viewport.top}px`,
  } as CSSProperties : undefined;

  return <Dialog open={open} onOpenChange={changeOpen}>
    <DialogContent className={styles.picker} style={viewportStyle} data-reflow={reflow ? "true" : undefined} data-compact={viewport && viewport.height < 480 ? "true" : undefined}
      showCloseButton={false} initialFocus={titleRef} finalFocus={returnFocusRef}>
      <div ref={browserRef} className={styles.browser} role={reflow ? "region" : undefined} aria-label={reflow ? "Artwork browser" : undefined} tabIndex={reflow ? 0 : undefined}>
      <header className={styles.header}>
        <div className="min-w-0">
          <DialogTitle ref={titleRef} tabIndex={-1} className="text-lg text-white outline-none">Drop from a world</DialogTitle>
          <DialogDescription className="sr-only">Select an artwork, then choose Share artwork. Its original page and credit stay attached. Nothing is sent until you confirm.</DialogDescription>
        </div>
        <button type="button" onClick={() => changeOpen(false)} disabled={sharing} aria-label="Close artwork picker" className={styles.iconButton}><X className="size-5" /></button>
      </header>

      <div ref={filtersRef} className={styles.filters}>
        <div className={styles.filterRow}>
          <NativeSelect aria-label="Choose a visual world" value={worldId} disabled={loading || Boolean(loadError) || locked}
            onChange={event => { setWorldId(event.target.value); setSearch(""); resetSelection(); }}
            className="min-w-0 w-full [&_select]:h-11 [&_select]:text-base [&_select]:text-zinc-100">
            <NativeSelectOption value="all">{loading ? "Loading worlds…" : `All worlds (${artworks.length})`}</NativeSelectOption>
            {worlds.map(world => <NativeSelectOption key={world.id} value={world.id}>{world.title} ({counts.get(world.id) ?? 0})</NativeSelectOption>)}
          </NativeSelect>
          <button ref={searchToggleRef} type="button" className={styles.iconButton} onClick={toggleSearch} disabled={loading || Boolean(loadError) || locked}
            aria-label={searchOpen ? "Close artwork search" : "Search artwork"} aria-expanded={searchOpen} aria-controls={searchId}>
            {searchOpen ? <X className="size-5" /> : <Search className="size-5" />}
          </button>
        </div>
        {searchOpen && <label id={searchId} className="block">
          <span className="sr-only">Search artwork</span>
          <Input ref={searchRef} type="search" value={search} disabled={locked} placeholder="Search title or mood" className="h-11 text-base!"
            onChange={event => { setSearch(event.target.value); resetSelection(); }} />
        </label>}
        <div className={styles.listMeta} id={hintId}>
          <span role="status">{loading ? "Loading artwork…" : loadError ? "Artwork unavailable" : `${filtered.length} ${filtered.length === 1 ? "artwork" : "artworks"}`}</span>
          {!loading && !loadError && filtered.length > 0 && <span className="inline-flex items-center gap-1.5">{moreBelow ? <><ArrowDown className="size-3" aria-hidden="true" />Scroll to explore</> : "End of collection"}</span>}
        </div>
      </div>

      <div ref={galleryRef} role="region" aria-label="World artwork" aria-describedby={hintId} aria-busy={loading} tabIndex={0} className={styles.gallery}>
        {loading ? <div role="status" className={styles.empty}><LoaderCircle className="size-6 animate-spin motion-reduce:animate-none" /><p>Loading your worlds…</p></div>
          : loadError ? <div className={styles.empty}><p role="alert">{loadError}</p><Button className="min-h-11" variant="outline" onClick={() => setRetry(current => current + 1)}>Try again</Button></div>
          : filtered.length ? <ul className={styles.grid}>
            {filtered.map(artwork => <li key={artwork.id}>
              <button type="button" className={styles.tile} aria-label={`Select ${artwork.title}`} aria-pressed={selectedId === artwork.id} disabled={locked}
                onClick={() => { setSelectedId(current => current === artwork.id ? null : artwork.id); setDelivery(null); }}>
                <span className={styles.preview}>
                  {artwork.thumb_src || artwork.media_type === "image" ? <PolishedImage src={artwork.thumb_src ?? artwork.src} alt="" loading="lazy" decoding="async" wrapperClassName="size-full" className="size-full object-cover" />
                    : <span className="grid size-full place-items-center text-zinc-400"><ImageIcon className="size-8" /></span>}
                  {artwork.media_type === "video" && <span className={styles.videoTag}><Play className="size-3" fill="currentColor" />Video</span>}
                  {selectedId === artwork.id && <span className={styles.check}><Check className="size-4" aria-hidden="true" /></span>}
                </span>
                <span className={styles.tileTitle}>{artwork.title}</span>
              </button>
            </li>)}
          </ul>
          : <div className={styles.empty}><ImageIcon className="size-7" /><p>{search ? "No artwork matches your search." : "No artwork in this world yet."}</p>{search && <Button variant="outline" className="min-h-11" onClick={() => { setSearch(""); resetSelection(); }}>Clear search</Button>}</div>}
      </div>
      </div>

      <footer className={styles.footer} aria-busy={sharing}>
        {delivery && <p role="alert" className="text-sm leading-5 text-amber-200">{delivery.message}</p>}
        <div className={styles.footerRow}>
          <div className="min-w-0" role="status">
            <p className="text-xs text-zinc-400">{sharing ? "Sharing artwork…" : selected ? "Ready to share" : "Nothing selected"}</p>
            <p className="truncate text-sm text-zinc-100" title={selected?.title}>{selected?.title ?? "Tap an artwork"}</p>
          </div>
          {delivery?.status === "unconfirmed" ? <Button className={styles.shareButton} onClick={() => changeOpen(false)}>Check chat</Button>
            : <Button className={styles.shareButton} disabled={!selected || loading || sharing} onClick={() => void shareSelected()}>
              {sharing ? <LoaderCircle className="size-4 animate-spin motion-reduce:animate-none" /> : <Send className="size-4" />}<span>{sharing ? "Sharing…" : "Share artwork"}</span>
            </Button>}
        </div>
      </footer>
    </DialogContent>
  </Dialog>;
}
