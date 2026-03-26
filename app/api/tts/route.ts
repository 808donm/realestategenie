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
 * Spell a street number the way people say it:
 *   725 → "seven twenty-five"
 *   1725 → "seventeen twenty-five"
 *   829 → "eight twenty-nine"
 *   94 → "ninety-four"
 *   6615 → "sixty-six fifteen"
 */
const ONES = ["", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine",
  "ten", "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen", "seventeen", "eighteen", "nineteen"];
const TENS = ["", "", "twenty", "thirty", "forty", "fifty", "sixty", "seventy", "eighty", "ninety"];

function spellTwoDigit(n: number): string {
  if (n < 20) return ONES[n];
  const t = TENS[Math.floor(n / 10)];
  const o = n % 10;
  return o ? `${t}-${ONES[o]}` : t;
}

function spellStreetNumber(n: number): string {
  if (n < 1) return String(n);
  if (n < 100) return spellTwoDigit(n);
  if (n < 1000) {
    // 725 → "seven twenty-five"
    const hi = Math.floor(n / 100);
    const lo = n % 100;
    if (lo === 0) return `${ONES[hi]} hundred`;
    return `${ONES[hi]} ${spellTwoDigit(lo)}`;
  }
  // 1725 → "seventeen twenty-five", 6615 → "sixty-six fifteen"
  const hi = Math.floor(n / 100);
  const lo = n % 100;
  if (lo === 0) return `${spellTwoDigit(hi)} hundred`;
  return `${spellTwoDigit(hi)} ${spellTwoDigit(lo)}`;
}

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
      // AVM cleanup — remove "(AVM)" since context already says estimated value
      .replace(/\(AVM\)/gi, "")
      .replace(/\bAVM\b/g, "A V M")
      .replace(/\bLTV\b/g, "loan to value")
      .replace(/\bHOA\b/g, "H O A")
      .replace(/\bMLS\b/g, "M L S")
      .replace(/\bSFR\b/g, "single family")
      // State abbreviation: "HI" → "Hawaii" (must come before general abbreviations)
      .replace(/,\s*HI\s+(\d{5})\b/g, ", Hawaii $1")
      .replace(/,\s*HI\b/g, ", Hawaii")
      .replace(/\bHI\s+(\d{5})\b/g, "Hawaii $1")
      // Bathroom counts: "1.5 ba" → "one and a half bathrooms"
      .replace(/\b1\.5\s*ba(?:th(?:room)?s?)?\b/gi, "one and a half bathrooms")
      .replace(/\b2\.5\s*ba(?:th(?:room)?s?)?\b/gi, "two and a half bathrooms")
      .replace(/\b3\.5\s*ba(?:th(?:room)?s?)?\b/gi, "three and a half bathrooms")
      // General X.5 pattern for any number of baths
      .replace(/\b(\d+)\.5\s*ba(?:th(?:room)?s?)?\b/gi, (_, n) => `${n} and a half bathrooms`)
      .replace(/\bTMK\b/g, "T M K")
      // Ranges: "$1,600 - $3,000" → "$1,600 to $3,000"
      .replace(/(\$[\d,]+(?:\.\d+)?)\s*[-–—]\s*(\$[\d,]+(?:\.\d+)?)/g, "$1 to $2")
      // Also handle non-dollar ranges: "462,000 - 519,000" → "462,000 to 519,000"
      .replace(/([\d,]+)\s*[-–—]\s*([\d,]+)/g, "$1 to $2")
      // Scores: "15/15" → "15 out of 15"
      .replace(/(\d+)\/(\d+)/g, "$1 out of $2")
      // Hawaiian hyphenated street numbers FIRST: "94-829" → "ninety-four dash eight twenty-nine"
      // Must come before general street number handling
      .replace(/\b(\d{2,3})-(\d{2,4})\b/g, (_, prefix, suffix) => {
        return `${spellStreetNumber(parseInt(prefix))} dash ${spellStreetNumber(parseInt(suffix))}`;
      })
      // Street numbers 3-4 digits: "725" → "seven twenty-five", "1725" → "seventeen twenty-five"
      .replace(/^(\d{3,4})\s/gm, (_, num) => {
        return spellStreetNumber(parseInt(num)) + " ";
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
