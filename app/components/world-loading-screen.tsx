import WorldLoadingSymbol from "./world-loading-symbol";
import styles from "./world-loading-screen.module.css";

type WorldLoadingScreenProps = {
  /** A concise, present-tense description of the real pending work. */
  label?: string;
  className?: string;
  /** `centered` is for route fallbacks; `inline` fits an unresolved content region. */
  variant?: "centered" | "inline";
  /** Optional current wordmark. The symbol itself remains usable if the name changes. */
  showWordmark?: boolean;
};

function classNames(...values: Array<string | undefined>) {
  return values.filter(Boolean).join(" ");
}

/**
 * A lightweight status for a real Suspense boundary or unresolved data region.
 * It is not an overlay and intentionally contains no timing or completion logic.
 */
export default function WorldLoadingScreen({
  label = "Opening the archive…",
  className,
  variant = "centered",
  showWordmark = false,
}: WorldLoadingScreenProps) {
  const content = (
    <div aria-atomic="true" aria-live="polite" className={styles.status} role="status">
      <WorldLoadingSymbol className={styles.symbol} size={variant === "centered" ? 64 : 32} />
      {showWordmark ? <p aria-hidden="true" className={styles.wordmark}>NODEINE</p> : null}
      <p className={styles.label}>{label}</p>
    </div>
  );

  if (variant === "inline") {
    return <div className={classNames(styles.inline, className)}>{content}</div>;
  }

  return <main className={classNames(styles.centered, className)}>{content}</main>;
}

export type { WorldLoadingScreenProps };
