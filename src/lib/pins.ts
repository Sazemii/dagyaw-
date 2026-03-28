import { supabase } from "./supabase";
import type { Pin } from "../components/MapView";

/** Upload a base64 data URL to Supabase Storage and return the public URL */
async function uploadPhoto(
  dataUrl: string,
  folder: string
): Promise<string> {
  const res = await fetch(dataUrl);
  const blob = await res.blob();
  const ext = blob.type.split("/")[1] || "jpeg";
  const fileName = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

  const { error } = await supabase.storage
    .from("photos")
    .upload(fileName, blob, { contentType: blob.type, upsert: false });

  if (error) throw new Error(`Photo upload failed: ${error.message}`);

  const { data } = supabase.storage.from("photos").getPublicUrl(fileName);
  return data.publicUrl;
}

/** Reverse geocode lat/lng to get the municipality/city using Nominatim */
async function reverseGeocode(
  lat: number,
  lng: number
): Promise<string | null> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&addressdetails=1&zoom=10`,
      { headers: { "User-Agent": "Bayanihan-App/1.0" } }
    );
    if (!res.ok) return null;

    const data = await res.json();
    const addr = data.address || {};

    return addr.city || addr.municipality || addr.town || addr.county || null;
  } catch {
    console.warn("Reverse geocoding failed");
    return null;
  }
}

/** Fetch all pins from the database */
export async function fetchPins(): Promise<Pin[]> {
  const { data, error } = await supabase
    .from("pins")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw new Error(`Fetch pins failed: ${error.message}`);

  return (data ?? []).map((row) => ({
    id: row.id,
    lat: row.lat,
    lng: row.lng,
    categoryId: row.category_id,
    description: row.description,
    photoUrl: row.photo_url,
    status: row.status,
    resolvedPhotoUrl: row.resolved_photo_url ?? undefined,
    resolvedComment: row.resolved_comment ?? undefined,
    resolvedAt: row.resolved_at ?? undefined,
    createdAt: row.created_at,
    municipality: row.municipality ?? undefined,
    pendingResolvedAt: row.pending_resolved_at ?? undefined,
    pendingResolvedBy: row.pending_resolved_by ?? undefined,
    communityResolveRequested: row.community_resolve_requested ?? false,
    communityResolveBy: row.community_resolve_by ?? undefined,
  }));
}

/** Create a new pin (uploads the photo first, reverse geocodes location) */
export async function createPin(input: {
  lat: number;
  lng: number;
  categoryId: string;
  description: string;
  photoDataUrl: string;
}): Promise<Pin> {
  // Upload photo and reverse geocode in parallel
  const [photoUrl, municipality] = await Promise.all([
    uploadPhoto(input.photoDataUrl, "reports"),
    reverseGeocode(input.lat, input.lng),
  ]);

  const { data, error } = await supabase
    .from("pins")
    .insert({
      lat: input.lat,
      lng: input.lng,
      category_id: input.categoryId,
      description: input.description,
      photo_url: photoUrl,
      status: "active",
      municipality,
    })
    .select()
    .single();

  if (error) throw new Error(`Create pin failed: ${error.message}`);

  return {
    id: data.id,
    lat: data.lat,
    lng: data.lng,
    categoryId: data.category_id,
    description: data.description,
    photoUrl: data.photo_url,
    status: data.status,
    createdAt: data.created_at,
    municipality: data.municipality ?? undefined,
  };
}

/** Resolve a pin — upload proof photo and mark as resolved */
export async function resolvePin(
  pinId: string,
  comment: string,
  proofPhotoDataUrl: string
): Promise<Pin> {
  const resolvedPhotoUrl = await uploadPhoto(proofPhotoDataUrl, "resolved");

  const { data, error } = await supabase
    .from("pins")
    .update({
      status: "resolved",
      resolved_comment: comment,
      resolved_photo_url: resolvedPhotoUrl,
      resolved_at: new Date().toISOString(),
    })
    .eq("id", pinId)
    .select()
    .single();

  if (error) throw new Error(`Resolve pin failed: ${error.message}`);

  return {
    id: data.id,
    lat: data.lat,
    lng: data.lng,
    categoryId: data.category_id,
    description: data.description,
    photoUrl: data.photo_url,
    status: data.status,
    resolvedPhotoUrl: data.resolved_photo_url ?? undefined,
    resolvedComment: data.resolved_comment ?? undefined,
    resolvedAt: data.resolved_at ?? undefined,
    createdAt: data.created_at,
    municipality: data.municipality ?? undefined,
  };
}

/** Get stats for a specific municipality from existing pins */
export interface MunicipalityStats {
  municipality: string;
  active: number;
  resolved: number;
  total: number;
}

export async function getMunicipalityStats(
  municipality: string
): Promise<MunicipalityStats> {
  const { data, error } = await supabase
    .from("pins")
    .select("status")
    .ilike("municipality", `%${municipality}%`);

  if (error) throw new Error(`Municipality stats failed: ${error.message}`);

  const rows = data ?? [];
  return {
    municipality,
    active: rows.filter((p) => p.status === "active").length,
    resolved: rows.filter((p) => p.status === "resolved").length,
    total: rows.length,
  };
}

/** Detailed stats for the city stats overlay */
export interface CityDetailedStats {
  municipality: string;
  active: number;
  resolved: number;
  total: number;
  resolutionRate: number;
  categoryBreakdown: { categoryId: string; count: number }[];
  mostRecentReport: string | null;
}

export async function getCityDetailedStats(
  municipality: string
): Promise<CityDetailedStats> {
  const { data, error } = await supabase
    .from("pins")
    .select("status, category_id, created_at")
    .ilike("municipality", `%${municipality}%`)
    .order("created_at", { ascending: false });

  if (error) throw new Error(`City stats failed: ${error.message}`);

  const rows = data ?? [];
  const active = rows.filter((p) => p.status === "active").length;
  const resolved = rows.filter((p) => p.status === "resolved").length;
  const total = rows.length;

  // Category breakdown — top categories by count
  const catMap = new Map<string, number>();
  for (const row of rows) {
    catMap.set(row.category_id, (catMap.get(row.category_id) ?? 0) + 1);
  }
  const categoryBreakdown = [...catMap.entries()]
    .map(([categoryId, count]) => ({ categoryId, count }))
    .sort((a, b) => b.count - a.count);

  return {
    municipality,
    active,
    resolved,
    total,
    resolutionRate: total > 0 ? Math.round((resolved / total) * 100) : 0,
    categoryBreakdown,
    mostRecentReport: rows[0]?.created_at ?? null,
  };
}
