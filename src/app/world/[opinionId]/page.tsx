"use client";

import { useParams, useSearchParams } from "next/navigation";
import "@/components/world/planet-synthesis-extra.module.css";
import { DynamicPlanetLawV2 } from "@/components/world/dynamic-planet-law-v2";
import { EnvironmentGuidanceLayer } from "@/components/world/environment-guidance-layer";
import { FirstCarrierCue } from "@/components/world/first-carrier-cue";
import { FirstFragmentCue } from "@/components/world/first-fragment-cue";
import { ForestStoryLandmarks } from "@/components/world/forest-story-landmarks";
import { PlanetArrivalGuide } from "@/components/world/planet-arrival-guide";
import { PlanetArtDirection } from "@/components/world/planet-art-direction";
import { PlanetBiomeSync } from "@/components/world/planet-biome-sync";
import { PlanetLawMvp } from "@/components/world/planet-law-mvp";
import { PlanetRouteWhisper } from "@/components/world/planet-route-whisper";
import { ResonanceHush } from "@/components/world/resonance-hush";
import PlanetRuntimeV2 from "./planet-runtime-v2";

const LAW_MVP_OPINIONS = new Set(["o_stoploss"]);

export default function PlanetPage() {
  const params = useParams<{ opinionId: string }>();
  const search = useSearchParams();
  const opinionId = decodeURIComponent(params.opinionId);

  // Anything entered from a galaxy — including the authored demo — uses the
  // same product grammar: viewpoint -> cross-domain explanatory model ->
  // structural mapping -> human evidence. This keeps the demo and live path
  // visually consistent.
  if (search.has("galaxy")) {
    return <DynamicPlanetLawV2 opinionId={opinionId} />;
  }

  // Keep the original hand-authored saddle-node story available as a direct
  // reference route, but do not let it override the actual planet experience.
  if (LAW_MVP_OPINIONS.has(opinionId)) {
    return <PlanetLawMvp opinionId={opinionId} />;
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
