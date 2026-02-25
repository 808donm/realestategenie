import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { openai } from "@ai-sdk/openai";
import { generateText } from "ai";

interface PropertyInput {
  propertyType: string;
  bedrooms: number;
  bathrooms: number;
  sqft: number;
  yearBuilt?: number;
  lotSize?: string;
  architecturalStyle?: string;
  features?: string[];
  additionalNotes?: string;
}

interface DescriptionVariant {
  tone: string;
  label: string;
  description: string;
}

/**
 * Generate AI listing descriptions from property details.
 * POST /api/mls/generate-description
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

    const body: PropertyInput = await request.json();

    if (!body.propertyType || !body.bedrooms || !body.bathrooms || !body.sqft) {
      return NextResponse.json(
        { error: "Property type, bedrooms, bathrooms, and square footage are required." },
        { status: 400 }
      );
    }

    const systemPrompt = getSystemPrompt();
    const userPrompt = buildUserPrompt(body);

    const { text } = await generateText({
      model: openai("gpt-4-turbo-preview"),
      system: systemPrompt,
      prompt: userPrompt,
      temperature: 0.7,
    });

    if (!text) {
      return NextResponse.json(
        { error: "No response from AI model. Please try again." },
        { status: 500 }
      );
    }

    const jsonText = extractJSON(text);
    const result = JSON.parse(jsonText) as { descriptions: DescriptionVariant[] };

    return NextResponse.json({
      success: true,
      descriptions: result.descriptions,
    });
  } catch (error: any) {
    console.error("Error generating listing description:", error);

    if (error.message?.includes("JSON")) {
      return NextResponse.json(
        { error: "AI returned an unexpected format. Please try again." },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { error: error.message || "Failed to generate description" },
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
  return `You are an expert Real Estate Copywriter and Fair Housing Compliance Officer. Your job is to write MLS listing descriptions that are compelling, accurate, and strictly compliant with the Fair Housing Act and NAR advertising guidelines.

**YOUR TASK:** Generate exactly 3 listing description variants from property details provided by the agent. Each variant should be a different tone but all must be fully compliant.

**CRITICAL COMPLIANCE RULES — HARD BLOCKS:**

You MUST NOT use any of the following. Violations are illegal.

1. NEVER use "master bedroom" or "master suite" — ALWAYS use "primary bedroom" or "primary suite"
2. NEVER reference neighborhood demographics, race, ethnicity, religion, or national origin
3. NEVER use: "safe", "low crime", "secure neighborhood", "dangerous"
4. NEVER use: "family-friendly", "great for families", "perfect for kids", "ideal for couples"
5. NEVER use: "young professionals", "retirees", "empty nesters", "singles"
6. NEVER use: "walking distance" — use "nearby", "minutes from", or exact distances
7. NEVER reference school quality ("top-rated", "best schools", "excellent district")
8. NEVER reference proximity to specific houses of worship
9. NEVER use: "exclusive", "prestigious" to describe neighborhoods
10. NEVER use: "bachelor pad", "man cave", "she shed", "mother-in-law suite"
11. NEVER use: "perfect starter home" (implies familial/economic class)
12. NEVER describe who should or would live in the property

**SAFE LANGUAGE PATTERNS:**
- "primary bedroom" / "primary suite" / "owner's suite"
- "bonus room" / "flexible space" / "additional living area"
- Describe FEATURES not PEOPLE: "open layout ideal for entertaining" not "great for families"
- "within [District Name]" for schools — no quality judgment
- "nearby parks include [Name]" — no demographic implication

**DESCRIPTION GUIDELINES:**
- Each description should be 150-250 words
- Lead with the most compelling feature
- Use active, engaging language
- Be specific about features — don't be generic
- Include the property stats naturally (beds/baths/sqft)
- End with a call to action or highlight

**OUTPUT FORMAT:** Return ONLY valid JSON:
{
  "descriptions": [
    {
      "tone": "professional",
      "label": "Professional",
      "description": "..."
    },
    {
      "tone": "warm",
      "label": "Warm & Inviting",
      "description": "..."
    },
    {
      "tone": "luxury",
      "label": "Luxury",
      "description": "..."
    }
  ]
}`;
}

function buildUserPrompt(input: PropertyInput): string {
  const lines: string[] = [
    `Generate 3 compliant MLS listing descriptions for this property:`,
    ``,
    `**Property Details:**`,
    `- Type: ${input.propertyType}`,
    `- Bedrooms: ${input.bedrooms}`,
    `- Bathrooms: ${input.bathrooms}`,
    `- Square Footage: ${input.sqft.toLocaleString()} sq ft`,
  ];

  if (input.yearBuilt) {
    lines.push(`- Year Built: ${input.yearBuilt}`);
  }
  if (input.lotSize) {
    lines.push(`- Lot Size: ${input.lotSize}`);
  }
  if (input.architecturalStyle) {
    lines.push(`- Architectural Style: ${input.architecturalStyle}`);
  }
  if (input.features && input.features.length > 0) {
    lines.push(`- Key Features: ${input.features.join(", ")}`);
  }
  if (input.additionalNotes) {
    lines.push(``, `**Agent Notes:** ${input.additionalNotes}`);
  }

  lines.push(
    ``,
    `Write 3 variants: Professional (clean MLS copy), Warm & Inviting (lifestyle-focused), and Luxury (aspirational). All must comply with Fair Housing rules. Return ONLY the JSON.`
  );

  return lines.join("\n");
}
