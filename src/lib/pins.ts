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

/**
 * Reverse geocode lat/lng using Nominatim (zoom=18 for max detail).
 * Checks all possible address fields for barangay, then falls back
 * to parsing the display_name which often contains "Barangay X" / "Brgy. X".
 */
async function reverseGeocode(
  lat: number,
  lng: number
): Promise<{ barangay: string | null; municipality: string | null }> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&addressdetails=1&zoom=18`,
      { headers: { "User-Agent": "Bayanihan-App/1.0" } }
    );
    if (!res.ok) return { barangay: null, municipality: null };

    const data = await res.json();
    const addr = data.address || {};

    // Try every field that could hold a barangay name
    let barangay: string | null =
      addr.village ||
      addr.suburb ||
      addr.neighbourhood ||
      addr.quarter ||
      addr.city_district ||
      addr.residential ||
      null;

    // Fallback: parse display_name for "Barangay ..." or "Brgy. ..."
    if (!barangay && data.display_name) {
      const parts: string[] = data.display_name.split(",").map((s: string) => s.trim());
      for (const part of parts) {
        if (/^(Barangay|Brgy\.?)\s+/i.test(part)) {
          barangay = part;
          break;
        }
      }
      // If still nothing, use the second segment (often the barangay in PH addresses)
      // Format: "Street, Barangay, City, Province, Country"
      if (!barangay && parts.length >= 3) {
        barangay = parts[1];
      }
    }

    const municipality: string | null =
      addr.city || addr.municipality || addr.town || addr.county || null;

    return { barangay, municipality };
  } catch {
    console.warn("Reverse geocoding failed, pin will be saved without location classification");
    return { barangay: null, municipality: null };
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
    barangay: row.barangay ?? undefined,
    municipality: row.municipality ?? undefined,
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
  const [photoUrl, geo] = await Promise.all([
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
      barangay: geo.barangay,
      municipality: geo.municipality,
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
    barangay: data.barangay ?? undefined,
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
    barangay: data.barangay ?? undefined,
    municipality: data.municipality ?? undefined,
  };
}

/** Get stats for a specific municipality */
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

/** Search for distinct municipalities matching a query */
export async function searchMunicipalities(
  query: string
): Promise<string[]> {
  const { data, error } = await supabase
    .from("pins")
    .select("municipality")
    .ilike("municipality", `%${query}%`)
    .not("municipality", "is", null);

  if (error) throw new Error(`Municipality search failed: ${error.message}`);

  const unique = [...new Set((data ?? []).map((r) => r.municipality as string))];
  return unique.sort();
}
