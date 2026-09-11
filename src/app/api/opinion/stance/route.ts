import { type NextRequest, NextResponse } from "next/server";
import { getStanceProfile, setStance } from "@/lib/opinion/store";
import { resolveViewerId } from "@/lib/opinion/viewer";
import type { Stance } from "@/lib/opinion/types";

const VALID: Stance[] = ["agree", "disagree", "neutral"];

// GET /api/opinion/stance — the viewer's stance profile (opinion portrait).
export async function GET(request: NextRequest) {
  const viewerId = resolveViewerId(request);
  return NextResponse.json({ ok: true, profile: await getStanceProfile(viewerId) });
}

// POST /api/opinion/stance { opinionId, stance }
export async function POST(request: NextRequest) {
  const viewerId = resolveViewerId(request);
  let body: { opinionId?: unknown; stance?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }
  const opinionId = typeof body.opinionId === "string" ? body.opinionId : "";
  const stance = body.stance as Stance;
  if (!opinionId || !VALID.includes(stance)) {
    return NextResponse.json({ ok: false, error: "invalid_input" }, { status: 400 });
  }
  const profile = await setStance(viewerId, opinionId, stance);
  if (!profile) {
    return NextResponse.json({ ok: false, error: "opinion_not_found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true, profile });
}
