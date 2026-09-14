"use client";

import { useParams, useSearchParams } from "next/navigation";
import "@/components/world/planet-synthesis-extra.module.css";
import { DynamicPlanetLaw } from "@/components/world/dynamic-planet-law";
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

  // Authored reference planet keeps its hand-crafted saddle-node narrative.
  if (LAW_MVP_OPINIONS.has(opinionId)) {
    return <PlanetLawMvp opinionId={opinionId} />;
  }

  // Every planet entered from a generated galaxy now uses the same
  // "opinion -> curated mathematical law -> archive" product grammar.
  if (search.has("galaxy")) {
    return <DynamicPlanetLaw opinionId={opinionId} />;
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
