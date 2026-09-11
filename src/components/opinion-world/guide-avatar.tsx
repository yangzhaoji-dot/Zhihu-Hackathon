import styles from "./guide-avatar.module.css";

export function GuideAvatar({ accent, label }: { accent?: string; label: string }) {
  return (
    <div
      className={styles.avatar}
      style={{ "--guide-accent": accent } as React.CSSProperties}
      aria-label={label}
    >
      <span className={styles.ear} aria-hidden />
      <span className={styles.earRight} aria-hidden />
      <span className={styles.face} aria-hidden>
        <span className={styles.eye} />
        <span className={styles.eye} />
      </span>
      <span className={styles.badge} aria-hidden />
    </div>
  );
}
