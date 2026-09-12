"use client";

import { useParams } from "next/navigation";
import { FirstCarrierCue } from "@/components/world/first-carrier-cue";
import { FirstFragmentCue } from "@/components/world/first-fragment-cue";
import { PlanetArrivalGuide } from "@/components/world/planet-arrival-guide";
import { PlanetBiomeSync } from "@/components/world/planet-biome-sync";
import { PlanetRouteWhisper } from "@/components/world/planet-route-whisper";
import { ResonanceHush } from "@/components/world/resonance-hush";
import PlanetRuntimeV2 from "./planet-runtime-v2";

export default function PlanetPage() {
  const params = useParams<{ opinionId: string }>();
  const opinionId = decodeURIComponent(params.opinionId);

  return (
    <>
      <PlanetRuntimeV2 />
      <PlanetBiomeSync opinionId={opinionId} />
      <PlanetRouteWhisper opinionId={opinionId} />
      <PlanetArrivalGuide opinionId={opinionId} />
      <FirstCarrierCue opinionId={opinionId} />
      <FirstFragmentCue opinionId={opinionId} />
      <ResonanceHush opinionId={opinionId} />
    </>
  );
}
