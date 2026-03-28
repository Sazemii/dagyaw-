import { NextRequest, NextResponse } from "next/server";
import { fetchFloodRisk, fetchRainForecast } from "@/lib/insights/external-apis";
import { getFloodZonesForPoint, getFloodZonesNearPoint } from "@/data/flood-zones";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const lat = parseFloat(searchParams.get("lat") ?? "");
  const lng = parseFloat(searchParams.get("lng") ?? "");

  if (isNaN(lat) || isNaN(lng)) {
    return NextResponse.json({ error: "lat and lng are required" }, { status: 400 });
  }

  try {
    const [riverData, rainData] = await Promise.allSettled([
      fetchFloodRisk(lat, lng),
      fetchRainForecast(lat, lng),
    ]);

    const floodZones = getFloodZonesForPoint(lat, lng);
    const nearbyZones = getFloodZonesNearPoint(lat, lng, 0.5);

    return NextResponse.json({
      isInFloodZone: floodZones.length > 0,
      floodZones: floodZones.map((z) => ({
        name: z.name,
        hazardLevel: z.hazardLevel,
      })),
      nearbyFloodZones: nearbyZones
        .filter((z) => !floodZones.some((fz) => fz.id === z.id))
        .map((z) => ({
          name: z.name,
          hazardLevel: z.hazardLevel,
        })),
      riverDischarge: riverData.status === "fulfilled" ? riverData.value : null,
      rainForecast: rainData.status === "fulfilled" ? rainData.value : null,
    });
  } catch (err) {
    console.error("Flood risk error:", err);
    return NextResponse.json(
      { error: "Failed to fetch flood risk", details: String(err) },
      { status: 500 }
    );
  }
}
