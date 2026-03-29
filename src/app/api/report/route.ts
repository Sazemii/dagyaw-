import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { getCategoryById } from "@/components/categories";
import { generateMunicipalityReport } from "@/lib/insights/engine";
import type { MunicipalityReportInput } from "@/lib/insights/types";

export async function POST(req: NextRequest) {
  try {
    const { municipality } = await req.json();

    if (!municipality || typeof municipality !== "string") {
      return NextResponse.json(
        { error: "municipality is required" },
        { status: 400 }
      );
    }

    // Fetch all pins for this municipality
    const { data: pins, error } = await supabase
      .from("pins")
      .select("category_id, description, status, lat, lng, created_at, municipality")
      .ilike("municipality", `%${municipality}%`)
      .order("created_at", { ascending: false })
      .limit(200);

    if (error) {
      return NextResponse.json(
        { error: `Database error: ${error.message}` },
        { status: 500 }
      );
    }

    if (!pins || pins.length === 0) {
      return NextResponse.json(
        { error: "No reports found for this municipality" },
        { status: 404 }
      );
    }

    // Compute stats
    const total = pins.length;
    const active = pins.filter((p) => p.status === "active").length;
    const resolved = pins.filter((p) => p.status === "resolved").length;
    const resolutionRate = total > 0 ? Math.round((resolved / total) * 100) : 0;

    // Category breakdown
    const catMap = new Map<string, number>();
    for (const pin of pins) {
      catMap.set(pin.category_id, (catMap.get(pin.category_id) ?? 0) + 1);
    }
    const categoryBreakdown = [...catMap.entries()]
      .map(([categoryId, count]) => {
        const cat = getCategoryById(categoryId);
        return {
          categoryId,
          label: cat?.label ?? categoryId,
          count,
          percentage: Math.round((count / total) * 100),
        };
      })
      .sort((a, b) => b.count - a.count);

    // Location clustering — group by rough grid (0.01 degree ~ 1km)
    const gridMap = new Map<
      string,
      { count: number; categories: Map<string, number>; lat: number; lng: number }
    >();
    for (const pin of pins) {
      const gridKey = `${(pin.lat * 100).toFixed(0)},${(pin.lng * 100).toFixed(0)}`;
      const existing = gridMap.get(gridKey);
      if (existing) {
        existing.count++;
        existing.categories.set(
          pin.category_id,
          (existing.categories.get(pin.category_id) ?? 0) + 1
        );
      } else {
        const cats = new Map<string, number>();
        cats.set(pin.category_id, 1);
        gridMap.set(gridKey, { count: 1, categories: cats, lat: pin.lat, lng: pin.lng });
      }
    }

    const topGridClusters = [...gridMap.values()]
      .filter((g) => g.count >= 2)
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // Reverse-geocode cluster centers to street/area names
    const locationClusters = await Promise.all(
      topGridClusters.map(async (g) => {
        const topCats = [...g.categories.entries()]
          .sort((a, b) => b[1] - a[1])
          .slice(0, 3)
          .map(([catId]) => getCategoryById(catId)?.label ?? catId);

        let areaName = `Near ${g.lat.toFixed(4)}, ${g.lng.toFixed(4)}`;
        try {
          const geoRes = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${g.lat}&lon=${g.lng}&format=json&zoom=16&addressdetails=1`,
            { headers: { "User-Agent": "Bayanihan-App/1.0" } }
          );
          if (geoRes.ok) {
            const geoData = await geoRes.json();
            const addr = geoData.address || {};
            const street = addr.road || addr.pedestrian || addr.footway || addr.street || "";
            const area = addr.suburb || addr.neighbourhood || addr.village || addr.quarter || "";
            const barangay = addr.city_district || "";
            const parts = [street, barangay, area].filter(Boolean);
            if (parts.length > 0) {
              areaName = `Near ${parts.join(", ")}`;
            }
          }
        } catch {
          // keep coordinate fallback
        }

        return {
          area: areaName,
          count: g.count,
          topCategories: topCats,
        };
      })
    );

    // Recent descriptions for context
    const recentDescriptions = pins.slice(0, 20).map((p) => ({
      category: getCategoryById(p.category_id)?.label ?? p.category_id,
      description: p.description?.slice(0, 200) ?? "",
      status: p.status,
      createdAt: p.created_at,
    }));

    const input: MunicipalityReportInput = {
      municipality,
      total,
      active,
      resolved,
      resolutionRate,
      categoryBreakdown,
      recentDescriptions,
      locationClusters,
    };

    const report = await generateMunicipalityReport(input);

    return NextResponse.json({ report });
  } catch (err) {
    console.error("Report generation error:", err);
    return NextResponse.json(
      { error: "Failed to generate report", details: String(err) },
      { status: 500 }
    );
  }
}
