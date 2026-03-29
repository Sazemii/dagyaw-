/**
 * ==================================================================================
 * Team Smart Dito sa Globe (SDG)
 * BLUE HACKS 2026: GENERATIVE AI DISCLOSURE
 * * This code was created with the assistance of AI tools such as:
 * - Claude 4.6 Opus (Anthropic)
 * - GPT 5.3 - Codex (OpenAI)
 * - Claude Gemini 3.1 Pro (Google)
 * * Purpose: This AI was utilized for code generation (logic and functions), 
 * brainstorming, code refinement (debugging), and performance optimization.
 * ==================================================================================
 */

import { NextRequest, NextResponse } from "next/server";
import { fetchAirQuality, classifyAqi, detectAbnormalEmissions } from "@/lib/insights/external-apis";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const lat = parseFloat(searchParams.get("lat") ?? "");
  const lng = parseFloat(searchParams.get("lng") ?? "");

  if (isNaN(lat) || isNaN(lng)) {
    return NextResponse.json({ error: "lat and lng are required" }, { status: 400 });
  }

  try {
    const aq = await fetchAirQuality(lat, lng);
    const classification = classifyAqi(aq.usAqi);
    const emissions = detectAbnormalEmissions(aq);

    return NextResponse.json({
      ...aq,
      classification,
      emissions,
    });
  } catch (err) {
    console.error("Air quality error:", err);
    return NextResponse.json(
      { error: "Failed to fetch air quality", details: String(err) },
      { status: 500 }
    );
  }
}
