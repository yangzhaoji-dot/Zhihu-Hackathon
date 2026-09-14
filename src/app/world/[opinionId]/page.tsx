"use client";

import { useEffect } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import "@/components/world/planet-synthesis-extra.module.css";
import { DynamicPlanetStoryV5 } from "@/components/world/dynamic-planet-story-v5";
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
  const router = useRouter();
  const opinionId = decodeURIComponent(params.opinionId);
  const galaxyId = search.get("galaxy");
  const originId = search.get("origin") ?? opinionId;

  const exitPlanet = () => {
    if (!galaxyId) {
      router.back();
      return;
    }
    const query = new URLSearchParams();
    const cluster = search.get("cluster");
    if (cluster) query.set("cluster", cluster);
    query.set("opinion", originId);
    router.push(`/galaxy/${encodeURIComponent(galaxyId)}?${query.toString()}`);
  };

  useEffect(() => {
    if (!galaxyId) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") exitPlanet();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  // Every planet entered from a galaxy uses the same paced six-page story:
  // viewpoint -> human scientific legacy -> property -> structural echo ->
  // boundary -> real evidence/archive.
  if (galaxyId) {
    return <>
      <button
        type="button"
        onClick={exitPlanet}
        data-el="exit-planet"
        style={{
          position:"fixed", zIndex:100, top:18, right:22,
          display:"inline-flex", alignItems:"center", gap:8,
          minHeight:42, padding:"0 15px", borderRadius:999,
          border:"1px solid rgba(226,202,149,.28)",
          background:"rgba(5,8,14,.82)", color:"rgba(246,239,222,.92)",
          backdropFilter:"blur(14px)", fontSize:13, cursor:"pointer",
        }}
      ><ArrowLeft size={15}/>退出星球</button>
      <DynamicPlanetStoryV5 key={`${galaxyId}:${opinionId}`} opinionId={opinionId} />
    </>;
  }

  // Keep the original authored saddle-node reference available by direct URL.
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
