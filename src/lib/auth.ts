import { supabase } from "./supabase";

export interface UserProfile {
  id: string;
  displayName: string;
  role: "regular" | "institutional" | "admin";
  roleStatus: "active" | "pending_approval" | "rejected";
  municipality: string | null;
  institutionName: string | null;
  notificationMunicipality: string | null;
  notificationInterests: string[];
}

/** Sign up with email/password + optional display name */
export async function signUp(email: string, password: string, displayName: string) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { display_name: displayName } },
  });
  if (error) throw error;
  return data;
}

/** Sign in with email/password */
export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (error) throw error;
  return data;
}

/** Sign out */
export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

/** Fetch the current user's profile from user_profiles table */
export async function fetchProfile(userId: string): Promise<UserProfile | null> {
  const { data, error } = await supabase
    .from("user_profiles")
    .select("*")
    .eq("id", userId)
    .single();

  if (error || !data) return null;

  return {
    id: data.id,
    displayName: data.display_name,
    role: data.role,
    roleStatus: data.role_status,
    municipality: data.municipality,
    institutionName: data.institution_name,
    notificationMunicipality: data.notification_municipality,
    notificationInterests: data.notification_interests ?? [],
  };
}

/** Update profile fields */
export async function updateProfile(
  userId: string,
  fields: Partial<{
    displayName: string;
    notificationMunicipality: string | null;
    notificationInterests: string[];
  }>
) {
  const update: Record<string, unknown> = {};
  if (fields.displayName !== undefined) update.display_name = fields.displayName;
  if (fields.notificationMunicipality !== undefined) update.notification_municipality = fields.notificationMunicipality;
  if (fields.notificationInterests !== undefined) update.notification_interests = fields.notificationInterests;

  const { error } = await supabase
    .from("user_profiles")
    .update(update)
    .eq("id", userId);

  if (error) throw error;
}

/** Request institutional role */
export async function requestInstitutionalRole(
  userId: string,
  municipality: string,
  institutionName: string
) {
  const { error } = await supabase
    .from("user_profiles")
    .update({
      role: "institutional",
      role_status: "pending_approval",
      municipality,
      institution_name: institutionName,
    })
    .eq("id", userId);

  if (error) throw error;
}
