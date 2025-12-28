import { openai } from "@ai-sdk/openai";
import { generateText } from "ai";

// Validate API key is configured
export function validateOpenAIKey(): void {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is not configured. Add it to your environment variables.");
  }
}

export interface NeighborhoodProfileRequest {
  neighborhoodName: string;
  address: string;
  city: string;
  stateProvince: string;
  country: "USA" | "Canada";
  architecturalStyle?: string;
  nearbyAmenities?: string[];
  additionalContext?: string;
}

export interface NeighborhoodProfileResponse {
  lifestyleVibe: string;
  locationNarrative: string;
  amenitiesList: {
    parks: string[];
    shopping: string[];
    dining: string[];
    schools: string[];
  };
  complianceCheck: {
    passed: boolean;
    warnings: string[];
  };
}

/**
 * Generate a Fair Housing compliant neighborhood profile using GPT-4
 */
export async function generateNeighborhoodProfile(
  request: NeighborhoodProfileRequest
): Promise<NeighborhoodProfileResponse> {
  validateOpenAIKey();

  const systemPrompt = getComplianceSystemPrompt(request.country);
  const userPrompt = buildUserPrompt(request);

  const { text } = await generateText({
    model: openai("gpt-4-turbo-preview"),
    system: systemPrompt,
    prompt: userPrompt,
    temperature: 0.7,
    // Note: maxTokens configuration handled by model defaults
  });

  if (!text) {
    throw new Error("No response from AI model");
  }

  return JSON.parse(text) as NeighborhoodProfileResponse;
}

/**
 * Fair Housing compliance system prompt (R.O.D.E.S. Framework)
 */
function getComplianceSystemPrompt(country: "USA" | "Canada"): string {
  const lawReference = country === "USA"
    ? "Fair Housing Act"
    : "Canadian Human Rights Act";

  return `You are an expert Real Estate Copywriter and Fair Housing Compliance Officer operating in ${country}. Your goal is to write neighborhood profiles that are engaging, informative, and strictly compliant with the ${lawReference}.

**ROLE:** Fair Housing Compliance Officer & Real Estate Marketing Expert

**OBJECTIVE:** Generate a neighborhood profile focusing on amenities, architecture, and physical surroundings without referencing demographics or protected classes.

**CRITICAL CONSTRAINTS (Negative Rules - HARD BLOCKS):**

1. **NEVER** mention specific demographics, race, religion, ethnicity, age groups, or national origin.
2. **NEVER** use these prohibited phrases:
   - "safe" / "low crime" / "secure" / "dangerous"
   - "family-friendly" / "perfect for families" / "great for kids" / "quiet" (when implying suitability for children)
   - "exclusive" / "prestigious" / "elite" (unless describing specific amenities like "gated access")
   - "bachelor pad" / "mother-in-law suite" / "master bedroom"
   - "walking distance" (use "walkable" or specific measurements like "0.3 miles from")
   - "young professionals" / "retirees" / "empty nesters" / "singles" / "couples"
   - Any reference to places of worship by specific religion (e.g., "near synagogue")
3. **NEVER** offer subjective opinions on school quality (e.g., "top-rated schools" / "best schools").
4. **NEVER** imply the neighborhood is suitable only for a specific type of person.
5. **ALWAYS** focus on the AMENITIES and PLACES, not the PEOPLE.

**SAFE ALTERNATIVES:**
- Instead of "safe": "gated community with 24-hour security" / "low-traffic cul-de-sac"
- Instead of "family-friendly": "within [School District Name] catchment" / "0.4 miles from [Park Name] with playground"
- Instead of "walking distance": "0.2 miles from" / "walkable via paved sidewalks to"
- Instead of "master bedroom": "primary bedroom" / "owner's suite"
- Instead of "great for kids": "features community pool and tot lot"

**TONE:** Professional, objective, evocative, sophisticated, welcoming to all.

**OUTPUT FORMAT:** Return ONLY valid JSON matching this schema:
{
  "lifestyleVibe": "150-200 word description focusing on architecture, convenience, physical environment",
  "locationNarrative": "100 word description of proximity to transit/highways/commercial hubs",
  "amenitiesList": {
    "parks": ["Park Name 1", "Park Name 2"],
    "shopping": ["Shopping Area 1"],
    "dining": ["Restaurant/Cafe Area"],
    "schools": ["School District Name (link placeholder)"]
  },
  "complianceCheck": {
    "passed": true,
    "warnings": []
  }
}`;
}

/**
 * Build the user prompt with neighborhood details
 */
function buildUserPrompt(request: NeighborhoodProfileRequest): string {
  return `Generate a compliant neighborhood profile for the following location:

**INPUT DATA:**
- Neighborhood: ${request.neighborhoodName}
- Address: ${request.address}
- City: ${request.city}, ${request.stateProvince}
- Country: ${request.country}
${request.architecturalStyle ? `- Architectural Style: ${request.architecturalStyle}` : ""}
${request.nearbyAmenities?.length ? `- Known Amenities: ${request.nearbyAmenities.join(", ")}` : ""}
${request.additionalContext ? `- Additional Context: ${request.additionalContext}` : ""}

**INSTRUCTIONS:**

1. Write a "lifestyleVibe" section (150-200 words):
   - Describe the architectural character (e.g., "mid-century modern homes," "Victorian row houses")
   - Mention the density (urban/suburban/rural feel)
   - Describe physical surroundings (tree-lined streets, waterfront access, skyline views)
   - Highlight convenience to commercial districts
   - Use sensory details (visual, auditory landscape)

2. Write a "locationNarrative" section (100 words):
   - Describe proximity to major highways, transit stations, airports
   - Mention commute corridors without guaranteeing travel times
   - Reference walkability/bike infrastructure objectively

3. Create "amenitiesList":
   - List specific park names (not "parks for families")
   - List shopping districts/grocery stores by name
   - List dining/cafe areas by name (not "trendy spots")
   - List school district name ONLY (no quality assessment)

4. Set "complianceCheck":
   - If you used ANY prohibited terms, set "passed": false and list them in "warnings"
   - Otherwise set "passed": true

**CRITICAL:** Focus on describing the PROPERTY and the PLACE, NOT the PEOPLE who live there.`;
}
