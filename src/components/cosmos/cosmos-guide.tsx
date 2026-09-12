import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { GuideAvatar } from "@/components/opinion-world/guide-avatar";
import styles from "./cosmos-guide.module.css";

type GalaxyNotice = "deep-view" | "discovered" | null;

export function CosmosGuide({
  selectedTitle,
  launching,
  onLaunch,
}: {
  selectedTitle: string | null;
  launching: boolean;
  onLaunch: (() => void) | null;
}) {
  const { t, i18n } = useTranslation();
  const locale = i18n.resolvedLanguage === "en-US" ? "en-US" : "zh-CN";
  const [notice, setNotice] = useState<GalaxyNotice>(null);

  useEffect(() => {
    const onDeepView = () => setNotice("deep-view");
    const onDiscovered = () => setNotice("discovered");
    window.addEventListener("galaxy:deep-view", onDeepView);
    window.addEventListener("opinion:discovered", onDiscovered);
    return () => {
      window.removeEventListener("galaxy:deep-view", onDeepView);
      window.removeEventListener("opinion:discovered", onDiscovered);
    };
  }, []);

  const prompt = notice === "discovered"
    ? (locale === "en-US"
        ? "Seeker, the weak signal has resolved into a traceable human opinion. A cognition relic has been located."
        : "寻知者，微弱信号已经解析成一条可追溯的人类观点。认知遗迹已定位。")
    : notice === "deep-view"
      ? (locale === "en-US"
          ? "Your first resonance has given us a new reference frame. Deep view is open — there are faint signals beyond the main galaxy."
          : "第一次共鸣给了我们新的参照系。深空视野已经展开——主星系之外，还有微弱的认知信号。")
      : selectedTitle
        ? (locale === "en-US"
            ? `This planet carries the opinion “${selectedTitle}”. You can orbit it first, then launch when you are ready to understand why it formed this way.`
            : `这颗星球承载着「${selectedTitle}」。先看看它，再决定是否发射；我们要理解它为什么会形成，而不是急着判断对错。`)
        : (locale === "en-US"
            ? "Seeker, this is the main field of the question galaxy. Start with one clear opinion planet. Understanding it may reveal a larger sky."
            : "寻知者，这里是这个问题的主星系。先从一颗清晰的观点星球开始；真正理解它以后，也许会看到更大的天空。");

  return (
    <aside className={styles.guide} data-el="cosmos-guide">
      <div className={styles.bubble}>
        <span className={styles.name}>
          {t("world.guideName")} · {locale === "en-US" ? "Seeker Navigation" : "寻知者导航"}
        </span>
        <p>{prompt}</p>
        {selectedTitle && onLaunch && (
          <button type="button" disabled={launching} onClick={onLaunch}>
            {launching ? t("cosmos.rocketInFlight") : t("world.cosmosGuideLaunch")}
          </button>
        )}
      </div>
      <GuideAvatar label={t("world.guideAvatarLabel")} />
    </aside>
  );
}
