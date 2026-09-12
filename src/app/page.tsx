"use client";

import { useState } from "react";
import { CosmosApp } from "@/components/cosmos/cosmos-app";
import { SeekerGateway } from "@/components/cosmos/seeker-gateway";

let enteredUniverseThisSession = false;

export default function Home() {
  const [entered, setEntered] = useState(enteredUniverseThisSession);
  const enterUniverse = () => {
    enteredUniverseThisSession = true;
    setEntered(true);
  };

  return entered
    ? <CosmosApp />
    : <SeekerGateway onEnter={enterUniverse} />;
}
