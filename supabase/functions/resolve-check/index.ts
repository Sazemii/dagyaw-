/**
 * ==================================================================================
 * Team Smart Dito sa Globe (SDG)
 * BLUE HACKS 2026: GENERATIVE AI DISCLOSURE
 * * This code was created with the assistance of AI tools such as:
 * - Claude 4.6 Opus (Anthropic)
 * - GPT 5.3 - Codex (OpenAI)
 * - Claude Gemini 3.1 Pro (Google)
 * * Purpose: This AI was utilized for code generation (logic and functions), 
 * brainstorming, code refinement (debugging), and performance optimization.
 * ==================================================================================
 */

// @ts-nocheck
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Use service role to bypass RLS
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Find all pending_resolved pins whose 3-day window has expired
    const { data: expiredPins, error: fetchError } = await supabase
      .from("pins")
      .select("id, pending_resolved_by, municipality")
      .eq("status", "pending_resolved")
      .lt("pending_resolved_at", new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString());

    if (fetchError) {
      throw new Error(`Fetch expired pins failed: ${fetchError.message}`);
    }

    if (!expiredPins || expiredPins.length === 0) {
      return new Response(
        JSON.stringify({ message: "No expired pins to process", processed: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let resolvedCount = 0;
    let revertedCount = 0;

    for (const pin of expiredPins) {
      // Get vote tally
      const { data: votes, error: voteError } = await supabase
        .from("votes")
        .select("vote, user_id")
        .eq("pin_id", pin.id);

      if (voteError) {
        console.error(`Vote fetch error for pin ${pin.id}:`, voteError.message);
        continue;
      }

      const upVotes = (votes ?? []).filter((v) => v.vote === "up").length;
      const downVotes = (votes ?? []).filter((v) => v.vote === "down").length;
      const total = upVotes + downVotes;
      const upPercent = total > 0 ? (upVotes / total) * 100 : 100; // No votes = auto-resolve

      // Collect voter IDs + the person who marked it pending for notifications
      const notifyUserIds = [
        ...(votes ?? []).map((v) => v.user_id as string),
        ...(pin.pending_resolved_by ? [pin.pending_resolved_by as string] : []),
      ];
      const uniqueUserIds = [...new Set(notifyUserIds)];

      if (upPercent >= 70 || total === 0) {
        // RESOLVE: 70%+ upvotes or zero votes
        const { error: updateError } = await supabase
          .from("pins")
          .update({
            status: "resolved",
            resolved_at: new Date().toISOString(),
          })
          .eq("id", pin.id);

        if (updateError) {
          console.error(`Resolve pin ${pin.id} failed:`, updateError.message);
          continue;
        }

        // Insert vote_result notifications
        for (const userId of uniqueUserIds) {
          await supabase.from("notifications").insert({
            user_id: userId,
            type: "vote_result",
            pin_id: pin.id,
            title: "Issue confirmed resolved",
            body: "The community confirmed this issue is resolved after the 3-day voting period.",
          });
        }

        resolvedCount++;
      } else {
        // REVERT: Less than 70% upvotes
        const { error: updateError } = await supabase
          .from("pins")
          .update({
            status: "active",
            pending_resolved_at: null,
            pending_resolved_by: null,
            community_resolve_requested: false,
            community_resolve_by: null,
          })
          .eq("id", pin.id);

        if (updateError) {
          console.error(`Revert pin ${pin.id} failed:`, updateError.message);
          continue;
        }

        // Insert vote_result notifications
        for (const userId of uniqueUserIds) {
          await supabase.from("notifications").insert({
            user_id: userId,
            type: "vote_result",
            pin_id: pin.id,
            title: "Issue reopened",
            body: "The community rejected the resolution. The issue has been reopened for action.",
          });
        }

        revertedCount++;
      }
    }

    return new Response(
      JSON.stringify({
        message: "Resolve check complete",
        processed: expiredPins.length,
        resolved: resolvedCount,
        reverted: revertedCount,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("resolve-check error:", err);
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
