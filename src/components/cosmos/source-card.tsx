"use client";

import { useTranslation } from "react-i18next";
import type { Author, OpinionSource } from "@/lib/opinion/types";

export function SourceCard({
  source,
  author,
}: {
  source: OpinionSource;
  author?: Author;
}) {
  const { t } = useTranslation();
  const initial = author?.name?.replace(/^@/, "").slice(0, 1) ?? "?";
  return (
    <div className="source-card">
      <div className="author">
        <span className="avatar" aria-hidden>
          {initial}
        </span>
        <span className="who">
          <b>{author?.name ?? "—"}</b>
          <small>{author?.title ?? ""}</small>
        </span>
        <span className="up">{t("cosmos.upvotes", { n: source.upvotes.toLocaleString("zh-CN") })}</span>
      </div>
      <p className="excerpt">{source.excerpt}</p>
      {source.evidence && source.evidence.length > 0 && (
        <div className="evidence">
          {source.evidence.map((e) => (
            <span key={e}>{e}</span>
          ))}
        </div>
      )}
      <a className="zhihu" href={source.url} target="_blank" rel="noreferrer">
        {t("cosmos.toZhihu")}
      </a>
    </div>
  );
}
