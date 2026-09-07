import WorldLoadingSymbol from "./world-loading-symbol";
import styles from "./world-loading-screen.module.css";

type WorldLoadingScreenProps = {
  /** A concise, present-tense description of the real pending work. */
  label?: string;
  className?: string;
  /** Standalone route, viewport-aligned status inside a retained shell, or contained panel. */
  variant?: "centered" | "viewport" | "inline";
  /** Optional current wordmark. The symbol itself remains usable if the name changes. */
  showWordmark?: boolean;
};

function classNames(...values: Array<string | undefined>) {
  return values.filter(Boolean).join(" ");
}

/**
 * A lightweight status for a real Suspense boundary or unresolved data region.
 * It never adds a blocking backdrop and contains no timing or completion logic.
 * Viewport mode positions only the status group, leaving a loaded shell usable.
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

  if (variant !== "centered") {
    return (
      <div className={classNames(styles[variant], className)} data-world-loading={variant}>
        {content}
      </div>
    );
  }

  return <main className={classNames(styles.centered, className)} data-world-loading="centered">{content}</main>;
}

export type { WorldLoadingScreenProps };
