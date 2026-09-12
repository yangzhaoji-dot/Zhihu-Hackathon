"use client";

import { useParams } from "next/navigation";
import { EnvironmentGuidanceLayer } from "@/components/world/environment-guidance-layer";
import { FirstCarrierCue } from "@/components/world/first-carrier-cue";
import { FirstFragmentCue } from "@/components/world/first-fragment-cue";
import { ForestStoryLandmarks } from "@/components/world/forest-story-landmarks";
import { PlanetArrivalGuide } from "@/components/world/planet-arrival-guide";
import { PlanetArtDirection } from "@/components/world/planet-art-direction";
import { PlanetBiomeSync } from "@/components/world/planet-biome-sync";
import { PlanetRouteWhisper } from "@/components/world/planet-route-whisper";
import { PlanetStoryMvp } from "@/components/world/planet-story-mvp";
import { ResonanceHush } from "@/components/world/resonance-hush";
import PlanetRuntimeV2 from "./planet-runtime-v2";

const STORY_MVP_OPINIONS = new Set(["o_stoploss"]);

export default function PlanetPage() {
  const params = useParams<{ opinionId: string }>();
  const opinionId = decodeURIComponent(params.opinionId);

  if (STORY_MVP_OPINIONS.has(opinionId)) {
    return <PlanetStoryMvp opinionId={opinionId} />;
  }

  return (
    <>
      <PlanetRuntimeV2 />
      <PlanetBiomeSync opinionId={opinionId} />
      <PlanetArtDirection opinionId={opinionId} />
      <ForestStoryLandmarks opinionId={opinionId} />
      <EnvironmentGuidanceLayer opinionId={opinionId} />
      <PlanetRouteWhisper opinionId={opinionId} />
      <PlanetArrivalGuide opinionId={opinionId} />
      <FirstCarrierCue opinionId={opinionId} />
      <FirstFragmentCue opinionId={opinionId} />
      <ResonanceHush opinionId={opinionId} />
    </>
  );
}
