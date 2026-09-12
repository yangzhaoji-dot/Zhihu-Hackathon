import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { GuideAvatar } from "@/components/opinion-world/guide-avatar";
import styles from "./cosmos-guide.module.css";

export function CosmosGuide({
  selectedTitle,
  launching,
}: {
  selectedTitle: string | null;
  launching: boolean;
  onLaunch: (() => void) | null;
}) {
  const { t, i18n } = useTranslation();
  const locale = i18n.resolvedLanguage === "en-US" ? "en-US" : "zh-CN";
  const guideRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const root = guideRef.current?.closest(".cosmos");
    if (!(root instanceof HTMLElement)) return;
    root.classList.toggle("planet-focus", Boolean(selectedTitle));
    return () => root.classList.remove("planet-focus");
  }, [selectedTitle]);

  const prompt = launching
    ? (locale === "en-US"
        ? "Trajectory locked. We are leaving orbit now. Read the world itself after touchdown."
        : "航线已经锁定。我们正在离开轨道——落地以后，先读这个世界本身。")
    : selectedTitle
      ? (locale === "en-US"
          ? `This planet carries the opinion “${selectedTitle}”. Orbit it first. When you are ready, use the flight controls to land and investigate why this world formed this way.`
          : `这颗星球承载着「${selectedTitle}」。先绕着它看看；准备好以后，再用航行控制登陆，去理解这个世界为什么会形成。`)
      : (locale === "en-US"
          ? "Seeker, this is the main field of the question galaxy. Choose one clear opinion planet and inspect it before deciding where to land."
          : "寻知者，这里是这个问题的主星系。先选择一颗清晰的观点星球，看看它，再决定要不要登陆。");

  return (
    <aside
      ref={guideRef}
      className={styles.guide}
      data-launching={launching ? "true" : "false"}
      data-el="cosmos-guide"
    >
      <div className={styles.bubble}>
        <span className={styles.name}>
          {t("world.guideName")} · {locale === "en-US" ? "Seeker Navigation" : "寻知者导航"}
        </span>
        <p>{prompt}</p>
      </div>
      <GuideAvatar label={t("world.guideAvatarLabel")} />
    </aside>
  );
}
