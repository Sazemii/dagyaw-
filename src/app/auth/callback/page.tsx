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

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabase";

export default function AuthCallbackPage() {
  const router = useRouter();
  const [status, setStatus] = useState("Confirming your email...");

  useEffect(() => {
    const handleCallback = async () => {
      const params = new URLSearchParams(window.location.search);
      const code = params.get("code");

      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) {
          setStatus("Verification failed. Please try logging in.");
          setTimeout(() => router.replace("/"), 3000);
          return;
        }
      }

      setStatus("Email confirmed! Redirecting...");
      setTimeout(() => router.replace("/"), 1500);
    };

    handleCallback();
  }, [router]);

  return (
    <div className="flex h-screen items-center justify-center bg-[#0a0a0a]">
      <div className="text-center">
        <div className="mb-4 mx-auto h-8 w-8 animate-spin rounded-full border-2 border-[#f5c542] border-t-transparent" />
        <p className="text-sm text-neutral-400">{status}</p>
      </div>
    </div>
  );
}
