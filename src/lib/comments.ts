import { supabase } from "./supabase";

export interface Comment {
  id: string;
  pinId: string;
  userId: string;
  parentId: string | null;
  body: string;
  isWatcher: boolean;
  watcherDisplay: string | null;
  createdAt: string;
  replies: Comment[];
}

function mapRowToComment(row: Record<string, unknown>): Comment {
  return {
    id: row.id as string,
    pinId: row.pin_id as string,
    userId: row.user_id as string,
    parentId: (row.parent_id as string) ?? null,
    body: row.body as string,
    isWatcher: row.is_watcher as boolean,
    watcherDisplay: (row.watcher_display as string) ?? null,
    createdAt: row.created_at as string,
    replies: [],
  };
}

/** Fetch all comments for a pin, nested into a tree */
export async function fetchComments(pinId: string): Promise<Comment[]> {
  const { data, error } = await supabase
    .from("comments")
    .select("*")
    .eq("pin_id", pinId)
    .order("created_at", { ascending: true });

  if (error) throw new Error(`Fetch comments failed: ${error.message}`);

  const flat = (data ?? []).map(mapRowToComment);
  const byId = new Map<string, Comment>();
  const roots: Comment[] = [];

  for (const c of flat) {
    byId.set(c.id, c);
  }

  for (const c of flat) {
    if (c.parentId) {
      const parent = byId.get(c.parentId);
      if (parent) {
        parent.replies.push(c);
      } else {
        roots.push(c);
      }
    } else {
      roots.push(c);
    }
  }

  return roots;
}

/** Create a comment (or reply if parentId is set) */
export async function createComment(input: {
  pinId: string;
  userId: string;
  body: string;
  parentId?: string;
  isWatcher: boolean;
  watcherDisplay?: string;
}): Promise<Comment> {
  const { data, error } = await supabase
    .from("comments")
    .insert({
      pin_id: input.pinId,
      user_id: input.userId,
      parent_id: input.parentId ?? null,
      body: input.body,
      is_watcher: input.isWatcher,
      watcher_display: input.watcherDisplay ?? null,
    })
    .select()
    .single();

  if (error) throw new Error(`Create comment failed: ${error.message}`);

  return mapRowToComment(data);
}

/** Fetch the display identity for a user (email from user_profiles or auth) */
export async function fetchWatcherIdentity(userId: string): Promise<string> {
  const { data } = await supabase
    .from("user_profiles")
    .select("display_name")
    .eq("id", userId)
    .single();

  if (data?.display_name) return data.display_name;

  return "Community Watcher";
}
