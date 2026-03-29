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

import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "GROQ_API_KEY not set" }, { status: 500 });
  }

  const { text } = await req.json();
  if (!text || typeof text !== "string") {
    return NextResponse.json({ error: "Missing text" }, { status: 400 });
  }

  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile",
      messages: [
        {
          role: "system",
          content:
            "You are a translator. Translate the given English text to Filipino (Tagalog). Return ONLY the translated text, nothing else. Preserve any JSON structure exactly as-is — only translate the string values. Keep technical terms as-is if there is no common Filipino equivalent.",
        },
        { role: "user", content: text },
      ],
      temperature: 0.3,
      max_tokens: 2048,
    }),
  });

  if (!res.ok) {
    return NextResponse.json({ error: "Translation failed" }, { status: 502 });
  }

  const data = await res.json();
  const translated = data.choices?.[0]?.message?.content?.trim() ?? "";
  return NextResponse.json({ translated });
}
