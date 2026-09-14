"use client";

import { useParams } from "next/navigation";
import { PlanetObservationArchive } from "@/components/world/planet-observation-archive";

export default function PlanetObservationPage() {
  const params = useParams<{ opinionId: string }>();
  const opinionId = decodeURIComponent(params.opinionId);
  return <PlanetObservationArchive opinionId={opinionId} />;
}
