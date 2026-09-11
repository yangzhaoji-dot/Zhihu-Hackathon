import { useTranslation } from "react-i18next";
import { GuideAvatar } from "@/components/opinion-world/guide-avatar";
import styles from "./cosmos-guide.module.css";

export function CosmosGuide({
  selectedTitle,
  launching,
  onLaunch,
}: {
  selectedTitle: string | null;
  launching: boolean;
  onLaunch: (() => void) | null;
}) {
  const { t } = useTranslation();
  return (
    <aside className={styles.guide} data-el="cosmos-guide">
      <div className={styles.bubble}>
        <span className={styles.name}>{t("world.guideName")}</span>
        <p>
          {selectedTitle
            ? t("world.cosmosGuideSelected", { title: selectedTitle })
            : t("world.cosmosGuidePrompt")}
        </p>
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
