"use client";

import { useParams } from "next/navigation";
import { PlanetArrivalGuide } from "@/components/world/planet-arrival-guide";
import PlanetRuntimeV2 from "./planet-runtime-v2";

export default function PlanetPage() {
  const params = useParams<{ opinionId: string }>();
  const opinionId = decodeURIComponent(params.opinionId);

  return (
    <>
      <PlanetRuntimeV2 />
      <PlanetArrivalGuide opinionId={opinionId} />
    </>
  );
}
