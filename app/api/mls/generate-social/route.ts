import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { openai } from "@ai-sdk/openai";
import { generateText } from "ai";

interface SocialPostInput {
  postType: "just_listed" | "open_house" | "price_reduced" | "just_sold";
  propertyType: string;
  address?: string;
  city?: string;
  stateOrProvince?: string;
  price?: number;
  bedrooms: number;
  bathrooms: number;
  sqft: number;
  yearBuilt?: number;
  lotSize?: string;
  architecturalStyle?: string;
  features?: string[];
  mlsDescription?: string;
  additionalNotes?: string;
  // Open house specific
  openHouseDate?: string;
  openHouseTime?: string;
}

interface VideoScript {
  concept: string;
  style: "traditional" | "creative";
  hook: string;
  shots: { direction: string; spokenLine: string; textOverlay: string; toneCue: string }[];
  suggestedAudio: string;
  ending: string;
}

interface PlatformContent {
  platform: string;
  caption: string;
  hashtags: string[];
  staticImageText: {
    headline: string;
    subtext: string;
    cta: string;
  };
  videoScripts: VideoScript[];
}

/**
 * Generate AI social media marketing content for a property listing.
 * POST /api/mls/generate-social
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await supabaseServer();
    const { data: userData } = await supabase.auth.getUser();

    if (!userData.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: "AI service not configured. OPENAI_API_KEY is missing." },
        { status: 500 }
      );
    }

    const body: SocialPostInput = await request.json();

    if (!body.postType || !body.bedrooms || !body.bathrooms || !body.sqft) {
      return NextResponse.json(
        { error: "Post type, bedrooms, bathrooms, and square footage are required." },
        { status: 400 }
      );
    }

    const systemPrompt = getSystemPrompt();
    const userPrompt = buildUserPrompt(body);

    const { text } = await generateText({
      model: openai("gpt-4-turbo-preview"),
      system: systemPrompt,
      prompt: userPrompt,
      temperature: 0.8,
    });

    if (!text) {
      return NextResponse.json(
        { error: "No response from AI model. Please try again." },
        { status: 500 }
      );
    }

    const jsonText = extractJSON(text);
    const result = JSON.parse(jsonText) as { platforms: PlatformContent[] };

    return NextResponse.json({
      success: true,
      platforms: result.platforms,
    });
  } catch (error: any) {
    console.error("Error generating social media content:", error);

    if (error.message?.includes("JSON")) {
      return NextResponse.json(
        { error: "AI returned an unexpected format. Please try again." },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { error: error.message || "Failed to generate social content" },
      { status: 500 }
    );
  }
}

function extractJSON(text: string): string {
  const codeBlockMatch = text.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
  if (codeBlockMatch) {
    return codeBlockMatch[1].trim();
  }
  return text.trim();
}

function getSystemPrompt(): string {
  return `You are an expert Real Estate Social Media Strategist, Video Director, and Fair Housing Compliance Officer. You create platform-optimized social media content for real estate agents that drives engagement and leads.

**YOUR TASK:** Generate social media content for 4 platforms (Facebook, Instagram, LinkedIn, TikTok) including captions, hashtags, static image text, and video scripts. For each platform, generate 1 traditional video script AND 2 creative/viral video scripts.

**FAIR HOUSING COMPLIANCE — HARD BLOCKS (applies to ALL content):**
1. NEVER use "master bedroom/suite" — use "primary bedroom/suite"
2. NEVER reference demographics, race, ethnicity, religion, national origin
3. NEVER use: "safe", "low crime", "secure neighborhood"
4. NEVER use: "family-friendly", "great for families", "perfect for kids"
5. NEVER use: "young professionals", "retirees", "empty nesters", "singles"
6. NEVER use: "walking distance" — use "nearby", "minutes from", exact distances
7. NEVER reference school quality ("top-rated", "best schools")
8. NEVER reference specific houses of worship
9. NEVER use: "exclusive", "prestigious" for neighborhoods
10. NEVER use: "bachelor pad", "man cave", "she shed", "mother-in-law suite"
11. NEVER use: "perfect starter home"
12. NEVER describe who should or would live in the property

**PLATFORM GUIDELINES:**

FACEBOOK:
- Captions: 150-200 words, engaging, with clear CTA
- Video: 15-30 seconds, works in-feed and as Reels
- Hashtags: 5-8 relevant local + real estate tags

INSTAGRAM:
- Captions: 100-150 words, punchy, personality-driven
- Video: 15-30 seconds, Reels-first, trending format awareness
- Hashtags: 15-20 mix of local, real estate, and niche tags

LINKEDIN:
- Captions: 200-300 words, market-insight framing, positions agent as expert
- Video: 30-60 seconds, professional but authentic, agent-on-camera preferred
- Hashtags: 3-5 professional/industry tags

TIKTOK:
- Captions: 50-80 words max, hook-first, casual voice
- Video: 15-30 seconds, raw/authentic feel, trending format awareness
- Hashtags: 5-8 trending + niche tags

**CREATIVE VIDEO SCRIPT CONCEPTS (choose 2 per platform that best fit the property):**

1. ASMR/WHISPER WALKTHROUGH — Agent whispers descriptions room to room. Slow camera. Surprise ending (mail slot reveal, key turn, opening a box with the price). Creates intense focus.

2. REVERSE REVEAL — Start with least impressive space, build to the showstopper. Misdirection hook: "This house looks pretty normal from the outside..." then BAM.

3. THE STORYTELLER — Third-person narration like reading a novel. "The morning light hit the counter at 7:14am. Coffee was already brewing..." Property stats as text overlays only.

4. ONE-TAKE CHALLENGE — Single continuous shot, no cuts. Speed-walk the entire property in 30-60 seconds. Energy and urgency. "Don't blink" hook.

5. WHAT I SEE VS WHAT YOU SEE — Agent points at something ordinary, text reveals hidden value. Ceiling → "brand new 50-year roof." Yard → "0.4 acres, R2 zoned."

6. THE COUNTDOWN — "5 things about this house that made my jaw drop." Ranked list, quick cuts, build to #1.

7. SILENT TOUR — Zero talking. Ambient sound only (footsteps, doors, birds). Text overlays carry ALL information. Cinematic feel.

8. THE DOOR KNOCK — Starts outside, agent knocks, door opens to reveal interior. "Knock knock... let me show you what's behind this door."

9. REALTOR REACTS — Agent films "first reaction" walking through. Genuine surprise and excitement. "My client sent me this listing and I—" *cuts to property.*

10. TRANSITION MAGIC — Cover lens with hand or quick pan to "teleport" between rooms. Fast-paced, visually engaging. Easy to film with phone.

**VIDEO SCRIPT FORMAT (for each script):**
Each script must include:
- concept: name of the creative concept (or "Traditional Walkthrough" for the standard one)
- style: "traditional" or "creative"
- hook: the exact first 2 seconds (the make-or-break moment)
- shots: array of shot objects, each with:
  - direction: where to stand, point camera, how to move
  - spokenLine: exact words to say (empty string for silent parts)
  - textOverlay: words that appear on screen (empty string if none)
  - toneCue: delivery instruction like "[whisper]", "[excited]", "[casual]", "[pause 2 beats]"
- suggestedAudio: trending sound style or "original audio"
- ending: the memorable close + CTA

**OUTPUT FORMAT:** Return ONLY valid JSON:
{
  "platforms": [
    {
      "platform": "facebook",
      "caption": "...",
      "hashtags": ["...", "..."],
      "staticImageText": {
        "headline": "short bold headline for graphic",
        "subtext": "supporting line with key stats",
        "cta": "call to action text"
      },
      "videoScripts": [
        {
          "concept": "Traditional Walkthrough",
          "style": "traditional",
          "hook": "...",
          "shots": [
            {
              "direction": "...",
              "spokenLine": "...",
              "textOverlay": "...",
              "toneCue": "..."
            }
          ],
          "suggestedAudio": "...",
          "ending": "..."
        },
        { "concept": "...", "style": "creative", ... },
        { "concept": "...", "style": "creative", ... }
      ]
    },
    { "platform": "instagram", ... },
    { "platform": "linkedin", ... },
    { "platform": "tiktok", ... }
  ]
}`;
}

const POST_TYPE_LABELS: Record<string, string> = {
  just_listed: "Just Listed",
  open_house: "Open House",
  price_reduced: "Price Reduced",
  just_sold: "Just Sold",
};

function buildUserPrompt(input: SocialPostInput): string {
  const postLabel = POST_TYPE_LABELS[input.postType] || input.postType;

  const lines: string[] = [
    `Generate social media content for a **${postLabel}** post.`,
    ``,
    `**Property Details:**`,
    `- Type: ${input.propertyType}`,
    `- Bedrooms: ${input.bedrooms}`,
    `- Bathrooms: ${input.bathrooms}`,
    `- Square Footage: ${input.sqft.toLocaleString()} sq ft`,
  ];

  if (input.address) lines.push(`- Address: ${input.address}`);
  if (input.city && input.stateOrProvince) {
    lines.push(`- Location: ${input.city}, ${input.stateOrProvince}`);
  }
  if (input.price) lines.push(`- List Price: $${input.price.toLocaleString()}`);
  if (input.yearBuilt) lines.push(`- Year Built: ${input.yearBuilt}`);
  if (input.lotSize) lines.push(`- Lot Size: ${input.lotSize}`);
  if (input.architecturalStyle) lines.push(`- Architectural Style: ${input.architecturalStyle}`);
  if (input.features && input.features.length > 0) {
    lines.push(`- Key Features: ${input.features.join(", ")}`);
  }

  if (input.postType === "open_house") {
    if (input.openHouseDate) lines.push(`- Open House Date: ${input.openHouseDate}`);
    if (input.openHouseTime) lines.push(`- Open House Time: ${input.openHouseTime}`);
  }

  if (input.mlsDescription) {
    lines.push(``, `**Existing MLS Description (use as additional context):**`, input.mlsDescription);
  }

  if (input.additionalNotes) {
    lines.push(``, `**Agent Notes:** ${input.additionalNotes}`);
  }

  lines.push(
    ``,
    `Generate content for all 4 platforms (Facebook, Instagram, LinkedIn, TikTok). For each platform include:`,
    `- A platform-optimized caption`,
    `- Relevant hashtags`,
    `- Static image text (headline, subtext, CTA)`,
    `- 3 video scripts: 1 traditional walkthrough + 2 creative concepts that best fit THIS specific property`,
    ``,
    `Pick creative concepts that highlight this property's strongest features. For example, if it has an amazing kitchen, the Reverse Reveal ending in the kitchen would work great. If it's luxury, the ASMR/Whisper or Silent Tour would shine.`,
    ``,
    `Return ONLY the JSON.`
  );

  return lines.join("\n");
}
