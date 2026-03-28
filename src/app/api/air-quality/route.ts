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
