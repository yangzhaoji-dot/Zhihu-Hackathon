"use client";

import { useState } from "react";
import { CosmosApp } from "@/components/cosmos/cosmos-app";
import { SeekerGateway } from "@/components/cosmos/seeker-gateway";

export default function Home() {
  const [entered, setEntered] = useState(false);
  return entered
    ? <CosmosApp />
    : <SeekerGateway onEnter={() => setEntered(true)} />;
}
