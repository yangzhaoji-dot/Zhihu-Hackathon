"use client";

import { useEffect, useRef } from "react";

type Tone = { frequency: number; duration: number; delay?: number; gain?: number };

const PATTERNS: Record<string, Tone[]> = {
  "sfx.guide.appear": [
    { frequency: 420, duration: .07, gain: .022 },
    { frequency: 560, duration: .1, delay: .06, gain: .018 },
  ],
  "sfx.fragment.found": [
    { frequency: 520, duration: .08, gain: .026 },
    { frequency: 690, duration: .1, delay: .07, gain: .026 },
    { frequency: 880, duration: .16, delay: .15, gain: .021 },
  ],
  "sfx.source.found": [
    { frequency: 330, duration: .06, gain: .018 },
    { frequency: 440, duration: .08, delay: .05, gain: .017 },
  ],
  "sfx.rocket.land": [
    { frequency: 112, duration: .18, gain: .025 },
    { frequency: 82, duration: .28, delay: .08, gain: .018 },
  ],
  "sfx.rocket.launch": [
    { frequency: 170, duration: .1, gain: .02 },
    { frequency: 260, duration: .13, delay: .08, gain: .021 },
    { frequency: 390, duration: .2, delay: .18, gain: .018 },
  ],
  "sfx.resonance.prepare": [
    { frequency: 196, duration: .42, gain: .014 },
    { frequency: 294, duration: .5, delay: .04, gain: .012 },
    { frequency: 392, duration: .58, delay: .08, gain: .01 },
  ],
  "sfx.resonance.world": [
    { frequency: 220, duration: .36, gain: .018 },
    { frequency: 330, duration: .42, delay: .04, gain: .015 },
    { frequency: 440, duration: .48, delay: .08, gain: .013 },
  ],
  "sfx.blocked": [{ frequency: 96, duration: .05, gain: .015 }],
};

function createTone(context: AudioContext, tone: Tone) {
  const start = context.currentTime + (tone.delay ?? 0);
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  oscillator.type = "sine";
  oscillator.frequency.setValueAtTime(tone.frequency, start);
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(tone.gain ?? .018, start + .018);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + tone.duration);
  oscillator.connect(gain);
  gain.connect(context.destination);
  oscillator.start(start);
  oscillator.stop(start + tone.duration + .03);
}

/**
 * Executes the existing `sfx.*` custom events with tiny synthesized tones.
 * No external audio files, no autoplay: audio is unlocked only after a real
 * pointer/keyboard interaction. This keeps interaction feedback consistent
 * across universe and planet surfaces without adding asset/network cost.
 */
export function InteractionSoundscape() {
  const contextRef = useRef<AudioContext | null>(null);
  const unlockedRef = useRef(false);

  useEffect(() => {
    const unlock = () => {
      if (unlockedRef.current) return;
      unlockedRef.current = true;
      try {
        contextRef.current ??= new AudioContext();
        void contextRef.current.resume();
      } catch {
        contextRef.current = null;
      }
    };

    const onSfx = (event: Event) => {
      if (!unlockedRef.current) return;
      const context = contextRef.current;
      if (!context) return;
      const name = String((event as CustomEvent<unknown>).detail ?? "");
      const tones = PATTERNS[name];
      if (!tones) return;
      if (context.state === "suspended") void context.resume();
      for (const tone of tones) createTone(context, tone);
    };

    window.addEventListener("pointerdown", unlock, { once: true });
    window.addEventListener("keydown", unlock, { once: true });
    window.addEventListener("sfx", onSfx);
    return () => {
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
      window.removeEventListener("sfx", onSfx);
      void contextRef.current?.close();
      contextRef.current = null;
    };
  }, []);

  return null;
}
