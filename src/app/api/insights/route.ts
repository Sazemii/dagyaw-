import { NextRequest, NextResponse } from "next/server";
import { generateWasteFloodInsight, analyzeAirQuality } from "@/lib/insights/engine";
import type { NearbyReport } from "@/lib/insights/types";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { pinId, categoryId, description, lat, lng, municipality, nearbyReports } = body;

    if (!lat || !lng) {
      return NextResponse.json({ error: "lat and lng are required" }, { status: 400 });
    }

    const reports: NearbyReport[] = nearbyReports ?? [];

    if (categoryId === "carbon-emission" || body.type === "carbon_check") {
      const insight = await analyzeAirQuality(lat, lng, municipality ?? null, reports);
      return NextResponse.json({ insight });
    }

    if (!pinId || !categoryId || !description) {
      return NextResponse.json(
        { error: "pinId, categoryId, and description are required for waste/flood insights" },
        { status: 400 }
      );
    }

    const insight = await generateWasteFloodInsight(
      pinId,
      categoryId,
      description,
      lat,
      lng,
      municipality ?? null,
      reports
    );

    return NextResponse.json({ insight });
  } catch (err) {
    console.error("Insight generation error:", err);
    return NextResponse.json(
      { error: "Failed to generate insight", details: String(err) },
      { status: 500 }
    );
  }
}
