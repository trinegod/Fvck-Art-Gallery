import { useId } from "react";
import styles from "./world-loading-screen.module.css";

type WorldLoadingSymbolProps = {
  /** Rendered square size in pixels. The artwork remains legible from 24–64px. */
  size?: number;
  className?: string;
  /** Makes the otherwise decorative mark available as an image to assistive technology. */
  title?: string;
};

/**
 * A name-independent navigation mark: an artwork frame containing a small world,
 * a portal aperture, and a single orbital path. It intentionally avoids relying
 * on a wordmark so it can outlive a future brand-name change.
 */
export default function WorldLoadingSymbol({
  size = 48,
  className,
  title,
}: WorldLoadingSymbolProps) {
  const gradientId = useId();
  const titleId = useId();

  return (
    <svg
      aria-hidden={title ? undefined : true}
      aria-labelledby={title ? titleId : undefined}
      className={[styles.symbol, className].filter(Boolean).join(" ")}
      fill="none"
      height={size}
      role={title ? "img" : undefined}
      viewBox="0 0 24 24"
      width={size}
      xmlns="http://www.w3.org/2000/svg"
    >
      {title ? <title id={titleId}>{title}</title> : null}
      <defs>
        <radialGradient id={gradientId} cx="0" cy="0" r="1" gradientTransform="translate(12 11) rotate(90) scale(8)">
          <stop stopColor="#153b46" stopOpacity="0.92" />
          <stop offset="0.7" stopColor="#0d1d24" stopOpacity="0.72" />
          <stop offset="1" stopColor="#0d1014" stopOpacity="0" />
        </radialGradient>
      </defs>

      <rect className="worldLoadingFrame" height="19" rx="5.25" width="19" x="2.5" y="2.5" />
      <circle className="worldLoadingWorld" cx="12" cy="12" fill={`url(#${gradientId})`} r="6.35" />
      <path className="worldLoadingGrid" d="M5.7 12h12.6M7.08 8.92c2.88 1.2 6.96 1.2 9.84 0M7.08 15.08c2.88-1.2 6.96-1.2 9.84 0M12 5.65c-1.86 1.8-2.82 4.03-2.82 6.35S10.14 16.55 12 18.35c1.86-1.8 2.82-4.03 2.82-6.35S13.86 7.45 12 5.65Z" />

      <g className="worldLoadingOrbit">
        <ellipse className="worldLoadingOrbitPath" cx="12" cy="12" rx="9.25" ry="3.8" transform="rotate(-28 12 12)" />
        <circle className="worldLoadingSignal" cx="18.92" cy="7.66" r="1.05" />
      </g>

      <path className="worldLoadingAperture" d="m12 8.72 3.05 1.76v3.04L12 15.28l-3.05-1.76v-3.04L12 8.72Z" />
      <path className="worldLoadingApertureCut" d="m12 10.3 1.67.96v1.48L12 13.7l-1.67-.96v-1.48L12 10.3Z" />
    </svg>
  );
}

export type { WorldLoadingSymbolProps };
