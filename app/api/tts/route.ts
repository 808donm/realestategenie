import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

const GOOGLE_TTS_API_KEY = process.env.GOOGLE_TTS_API_KEY;
const GOOGLE_TTS_URL = "https://texttospeech.googleapis.com/v1/text:synthesize";

// Voice config — standard female voice (1M chars/month free tier)
const DEFAULT_VOICE = {
  languageCode: "en-US",
  name: "en-US-Standard-F", // Standard female voice — free tier eligible
  ssmlGender: "FEMALE",
};

const AUDIO_CONFIG = {
  audioEncoding: "MP3",
  speakingRate: 1.0,
  pitch: 1.0, // slightly warm
};

/**
 * POST /api/tts
 *
 * Converts text to speech using Google Cloud TTS.
 * Returns an MP3 audio buffer.
 *
 * Body: { text: string, voice?: string }
 */
export async function POST(request: NextRequest) {
  try {
    // Auth check
    const supabase = await supabaseServer();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!GOOGLE_TTS_API_KEY) {
      return NextResponse.json({ error: "Google TTS not configured" }, { status: 503 });
    }

    const body = await request.json();
    let { text } = body;

    if (!text || typeof text !== "string") {
      return NextResponse.json({ error: "text is required" }, { status: 400 });
    }

    // Clean text — remove markdown, HTML, execute tags
    text = text
      .replace(/<execute>[\s\S]*?<\/execute>/g, "")
      .replace(/\*\*/g, "")
      .replace(/###?\s*/g, "")
      .replace(/\[object Object\]/g, "")
      .replace(/[#*_~`]/g, "")
      .replace(/<[^>]*>/g, "")
      .trim();

    if (!text) {
      return NextResponse.json({ error: "No speakable text" }, { status: 400 });
    }

    // Limit to 5000 chars (Google TTS limit per request)
    if (text.length > 5000) {
      text = text.substring(0, 5000);
    }

    // Call Google Cloud TTS
    const response = await fetch(`${GOOGLE_TTS_URL}?key=${GOOGLE_TTS_API_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        input: { text },
        voice: DEFAULT_VOICE,
        audioConfig: AUDIO_CONFIG,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error("[TTS] Google API error:", response.status, error);
      return NextResponse.json(
        { error: "TTS generation failed" },
        { status: response.status }
      );
    }

    const data = await response.json();

    if (!data.audioContent) {
      return NextResponse.json({ error: "No audio generated" }, { status: 500 });
    }

    // Return the base64 audio content
    // The client will decode and play it
    return NextResponse.json({
      audio: data.audioContent, // base64 encoded MP3
      format: "mp3",
      chars: text.length,
    });
  } catch (error: any) {
    console.error("[TTS] Error:", error);
    return NextResponse.json({ error: "TTS error" }, { status: 500 });
  }
}
