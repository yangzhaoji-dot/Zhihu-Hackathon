"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Link2, LoaderCircle, LogOut, RefreshCcw, XCircle } from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  fetchZhihuOAuthStatus,
  fetchZhihuUserDataSample,
  logoutZhihuOAuth,
  type ZhihuOAuthStatus,
} from "@/lib/api/zhihu-oauth";
import styles from "./zhihu-account-button.module.css";

type SampleResults = Record<string, { status: string; item?: unknown; error?: string }>;

export function ZhihuAccountButton() {
  const { t } = useTranslation("galaxy");
  const [status, setStatus] = useState<ZhihuOAuthStatus | null>(null);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [results, setResults] = useState<SampleResults | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchZhihuOAuthStatus().then(setStatus).catch(() => setError("status"));
  }, []);

  const verifyData = async () => {
    setBusy(true);
    setError(null);
    try {
      const response = await fetchZhihuUserDataSample();
      setResults(response.results);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "verify");
    } finally {
      setBusy(false);
    }
  };

  const logout = async () => {
    setBusy(true);
    try {
      await logoutZhihuOAuth();
      setStatus((current) => current ? { ...current, connected: false, profile: null, expiresAt: null } : current);
      setResults(null);
      setOpen(false);
    } finally {
      setBusy(false);
    }
  };

  if (!status) {
    return <button type="button" disabled aria-label={t("zhihuOAuth.loading")}><LoaderCircle className={styles.spin} size={14} /></button>;
  }

  if (!status.connected) {
    const ready = status.configured.appId && status.configured.redirectUri
      && status.configured.appKey && status.configured.sessionSecret;
    return (
      <a className={styles.connect} href={ready ? "/api/oauth/start" : undefined} aria-disabled={!ready} title={ready ? t("zhihuOAuth.connect") : t("zhihuOAuth.notConfigured")}>
        <Link2 size={14} />{ready ? t("zhihuOAuth.connect") : t("zhihuOAuth.waiting")}
      </a>
    );
  }

  return (
    <div className={styles.wrap}>
      <button type="button" className={styles.connected} onClick={() => setOpen((value) => !value)}>
        <CheckCircle2 size={14} />{status.profile?.fullname ?? t("zhihuOAuth.connected")}
      </button>
      {open && (
        <section className={styles.panel} aria-label={t("zhihuOAuth.panelTitle")}>
          <div className={styles.profile}>
            <strong>{status.profile?.fullname ?? t("zhihuOAuth.connected")}</strong>
            {status.profile?.headline && <span>{status.profile.headline}</span>}
          </div>
          <button type="button" className={styles.action} onClick={() => void verifyData()} disabled={busy}>
            {busy ? <LoaderCircle className={styles.spin} size={14} /> : <RefreshCcw size={14} />}{t("zhihuOAuth.verify")}
          </button>
          {results && (
            <ul className={styles.results}>
              {Object.entries(results).map(([name, result]) => (
                <li key={name} data-status={result.status}>
                  {result.status === "failed" ? <XCircle size={12} /> : <CheckCircle2 size={12} />}
                  <span>{t(`zhihuOAuth.endpoints.${name}`)}</span><b>{t(`zhihuOAuth.states.${result.status}`)}</b>
                </li>
              ))}
            </ul>
          )}
          {error && <p className={styles.error}>{t("zhihuOAuth.verifyFailed")}</p>}
          <button type="button" className={styles.action} onClick={() => void logout()} disabled={busy}>
            <LogOut size={14} />{t("zhihuOAuth.logout")}
          </button>
        </section>
      )}
    </div>
  );
}
