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

  return (data ?? []).map(mapRowToPin);
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

  return mapRowToPin(data);
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

  return mapRowToPin(data);
}

/** Watcher marks a pin as pending resolution (triggers 3-day voting) */
export async function markPendingResolution(
  pinId: string,
  proofPhotoDataUrl: string,
  userId: string
): Promise<Pin> {
  const resolvedPhotoUrl = await uploadPhoto(proofPhotoDataUrl, "resolved");

  const { data, error } = await supabase
    .from("pins")
    .update({
      status: "pending_resolved",
      resolved_photo_url: resolvedPhotoUrl,
      pending_resolved_at: new Date().toISOString(),
      pending_resolved_by: userId,
    })
    .eq("id", pinId)
    .select()
    .single();

  if (error) throw new Error(`Mark pending failed: ${error.message}`);

  return mapRowToPin(data);
}

/** Regular user requests community resolution by submitting proof photo */
export async function requestCommunityResolution(
  pinId: string,
  proofPhotoDataUrl: string,
  userId: string
): Promise<Pin> {
  const resolvedPhotoUrl = await uploadPhoto(proofPhotoDataUrl, "resolved");

  const { data, error } = await supabase
    .from("pins")
    .update({
      community_resolve_requested: true,
      community_resolve_by: userId,
      resolved_photo_url: resolvedPhotoUrl,
    })
    .eq("id", pinId)
    .select()
    .single();

  if (error) throw new Error(`Community resolve request failed: ${error.message}`);

  return mapRowToPin(data);
}

/** Watcher approves a community resolution request → starts 3-day voting */
export async function approveCommunityResolution(
  pinId: string,
  watcherId: string
): Promise<Pin> {
  const { data, error } = await supabase
    .from("pins")
    .update({
      status: "pending_resolved",
      pending_resolved_at: new Date().toISOString(),
      pending_resolved_by: watcherId,
    })
    .eq("id", pinId)
    .select()
    .single();

  if (error) throw new Error(`Approve resolution failed: ${error.message}`);

  return mapRowToPin(data);
}

/** Cast or update a vote on a pending pin */
export async function castVote(
  pinId: string,
  userId: string,
  vote: "up" | "down"
): Promise<void> {
  const { error } = await supabase
    .from("votes")
    .upsert(
      { pin_id: pinId, user_id: userId, vote },
      { onConflict: "pin_id,user_id" }
    );

  if (error) throw new Error(`Vote failed: ${error.message}`);
}

export interface VoteTally {
  up: number;
  down: number;
  userVote: "up" | "down" | null;
}

/** Fetch vote counts and the current user's vote for a pin */
export async function fetchVotes(
  pinId: string,
  userId?: string
): Promise<VoteTally> {
  const { data, error } = await supabase
    .from("votes")
    .select("vote, user_id")
    .eq("pin_id", pinId);

  if (error) throw new Error(`Fetch votes failed: ${error.message}`);

  const votes = data ?? [];
  return {
    up: votes.filter((v) => v.vote === "up").length,
    down: votes.filter((v) => v.vote === "down").length,
    userVote: userId
      ? (votes.find((v) => v.user_id === userId)?.vote as "up" | "down") ?? null
      : null,
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

/** Fetch pins for a specific municipality */
export async function fetchPinsByMunicipality(
  municipality: string
): Promise<Pin[]> {
  const { data, error } = await supabase
    .from("pins")
    .select("*")
    .ilike("municipality", `%${municipality}%`)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) throw new Error(`Fetch pins failed: ${error.message}`);

  return (data ?? []).map(mapRowToPin);
}

// ============================================================
// Helpers
// ============================================================

/** Map a Supabase row to a Pin object */
function mapRowToPin(row: Record<string, unknown>): Pin {
  return {
    id: row.id as string,
    lat: row.lat as number,
    lng: row.lng as number,
    categoryId: row.category_id as string,
    description: row.description as string,
    photoUrl: row.photo_url as string,
    status: row.status as Pin["status"],
    resolvedPhotoUrl: (row.resolved_photo_url as string) ?? undefined,
    resolvedComment: (row.resolved_comment as string) ?? undefined,
    resolvedAt: (row.resolved_at as string) ?? undefined,
    createdAt: row.created_at as string,
    municipality: (row.municipality as string) ?? undefined,
    pendingResolvedAt: (row.pending_resolved_at as string) ?? undefined,
    pendingResolvedBy: (row.pending_resolved_by as string) ?? undefined,
    communityResolveRequested: (row.community_resolve_requested as boolean) ?? false,
    communityResolveBy: (row.community_resolve_by as string) ?? undefined,
  };
}

// ============================================================
// Stats
// ============================================================

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
