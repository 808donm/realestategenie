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
  speakingRate: 0.92,  // slightly slower for clarity, especially for older users
  pitch: 1.0,
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

    // Clean text for natural speech
    text = text
      // Remove execute tags and markdown
      .replace(/<execute>[\s\S]*?<\/execute>/g, "")
      .replace(/\*\*/g, "")
      .replace(/###?\s*/g, "")
      .replace(/\[object Object\]/g, "")
      .replace(/[#_~`]/g, "")
      .replace(/<[^>]*>/g, "")
      // Fix zip codes: "96797" → "9 6 7 9 7" so TTS reads digits not "ninety-six thousand"
      .replace(/\b(9[0-9]{4})\b/g, (_, zip) => zip.split("").join(" "))
      // Fix MLS numbers: "202605791" → "2 0 2 6 0 5 7 9 1"
      .replace(/\b(\d{8,})\b/g, (_, num) => num.split("").join(" "))
      // Fix TMK numbers: "1-4-2-018-077" → read as digits
      .replace(/\b(\d{1,2}-\d{1,2}-\d{1,2}-\d{3}-\d{3})\b/g, (_, tmk) => tmk.replace(/[-]/g, ", ").split("").filter((c: string) => c !== ",").join(" ").replace(/  +/g, ", "))
      // Abbreviations → full words (before other transforms)
      .replace(/\bsqft\b/gi, "square feet")
      .replace(/\bsq\s*ft\b/gi, "square feet")
      .replace(/\bbd\b/gi, "bedroom")
      .replace(/\bba\b/gi, "bathroom")
      .replace(/\bbds\b/gi, "bedrooms")
      .replace(/\bbas\b/gi, "bathrooms")
      .replace(/\byr\b/gi, "years")
      .replace(/\bDOM\b/g, "days on market")
      .replace(/\bAVM\b/g, "estimated value")
      .replace(/\bLTV\b/g, "loan to value")
      .replace(/\bHOA\b/g, "H O A")
      .replace(/\bMLS\b/g, "M L S")
      .replace(/\bSFR\b/g, "single family")
      .replace(/\bTMK\b/g, "T M K")
      // Street numbers: "725" → "seven twenty-five" (let TTS handle naturally)
      // But 3-digit numbers at start of address should NOT be read as "seven hundred"
      // Fix: insert a thin pause between digits for 3-4 digit street numbers
      .replace(/^(\d{3,4})\s/gm, (_, num) => {
        const n = parseInt(num);
        if (n >= 100 && n <= 9999) {
          // Split into natural speech: 725 → "7 25", 1806 → "18 06"
          if (n < 1000) return `${Math.floor(n / 100)} ${(n % 100).toString().padStart(2, "0")} `;
          return `${Math.floor(n / 100)} ${(n % 100).toString().padStart(2, "0")} `;
        }
        return num + " ";
      })
      // Hawaiian hyphenated street numbers: "94-224" → "94 2 24"
      .replace(/\b(\d{2})-(\d{3,4})\b/g, (_, prefix, num) => {
        const n = parseInt(num);
        if (n < 1000) return `${prefix}, ${Math.floor(n / 100)} ${(n % 100).toString().padStart(2, "0")}`;
        return `${prefix}, ${Math.floor(n / 100)} ${(n % 100).toString().padStart(2, "0")}`;
      })
      // Remove parentheses but keep content
      .replace(/[()]/g, "")
      // Remove bullet points and list markers
      .replace(/^[-•]\s*/gm, "")
      .replace(/^\d+\.\s*/gm, "")
      // Add pauses between facts — replace pipe separators with pauses
      .replace(/\s*\|\s*/g, ". ")
      // Add pauses after colons (label: value patterns)
      .replace(/:\s*/g, ": ... ")
      // Add pause between sections (double newlines → period)
      .replace(/\n\n+/g, ". ... ")
      // Single newlines → slight pause
      .replace(/\n/g, ". ")
      // Dollar amounts: keep natural ("$1,500,000" reads fine, but "$1.51M" → "$1.51 million")
      .replace(/\$(\d+\.?\d*)M\b/g, "$$$1 million")
      .replace(/\$(\d+\.?\d*)K\b/g, "$$$1 thousand")
      // Remove remaining special chars
      .replace(/[*{}[\]]/g, "")
      // Clean up extra spaces and periods
      .replace(/\.\s*\./g, ".")
      .replace(/\s+/g, " ")
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
