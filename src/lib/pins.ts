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
  }));
}

/** Create a new pin (uploads the photo first) */
export async function createPin(input: {
  lat: number;
  lng: number;
  categoryId: string;
  description: string;
  photoDataUrl: string;
}): Promise<Pin> {
  const photoUrl = await uploadPhoto(input.photoDataUrl, "reports");

  const { data, error } = await supabase
    .from("pins")
    .insert({
      lat: input.lat,
      lng: input.lng,
      category_id: input.categoryId,
      description: input.description,
      photo_url: photoUrl,
      status: "active",
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
  };
}
