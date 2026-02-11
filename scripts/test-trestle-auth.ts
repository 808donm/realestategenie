/**
 * Direct Trestle API authentication test
 * Run with: npx tsx scripts/test-trestle-auth.ts
 */

const TOKEN_URL = "https://api.cotality.com/trestle/oidc/connect/token";
const API_URL = "https://api.cotality.com/trestle/odata";
const CLIENT_ID = "trestle_HuliauSoftwareincRealEstateGenie20260206033743";

// Pass secret as CLI arg: npx tsx scripts/test-trestle-auth.ts YOUR_SECRET
const CLIENT_SECRET = process.argv[2];

if (!CLIENT_SECRET) {
  console.error("Usage: npx tsx scripts/test-trestle-auth.ts <client_secret>");
  process.exit(1);
}

async function testAuth() {
  console.log("=== Step 1: Request OAuth2 Token ===");
  console.log(`Token URL: ${TOKEN_URL}`);
  console.log(`Client ID: ${CLIENT_ID}`);
  console.log(`Scope: api`);
  console.log();

  try {
    const tokenResponse = await fetch(TOKEN_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type: "client_credentials",
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        scope: "api",
      }),
    });

    console.log(`Token Response Status: ${tokenResponse.status}`);
    console.log(`Token Response Headers:`, Object.fromEntries(tokenResponse.headers.entries()));

    const tokenText = await tokenResponse.text();
    console.log(`Token Response Body: ${tokenText.substring(0, 500)}`);

    if (!tokenResponse.ok) {
      console.error("\n❌ Token request FAILED. Credentials may be invalid.");
      return;
    }

    const tokenData = JSON.parse(tokenText);
    const accessToken = tokenData.access_token;
    console.log(`\n✅ Token obtained! Type: ${tokenData.token_type}, Expires in: ${tokenData.expires_in}s`);
    console.log(`Token prefix: ${accessToken?.substring(0, 30)}...`);

    console.log("\n=== Step 2: Test API Call ===");
    const apiUrl = `${API_URL}/Property?$top=1&$count=true`;
    console.log(`API URL: ${apiUrl}`);

    const apiResponse = await fetch(apiUrl, {
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Accept": "application/json",
      },
    });

    console.log(`API Response Status: ${apiResponse.status}`);
    console.log(`API Response Headers:`, Object.fromEntries(apiResponse.headers.entries()));

    const apiText = await apiResponse.text();
    console.log(`API Response Body: ${apiText.substring(0, 1000)}`);

    if (apiResponse.ok) {
      console.log("\n✅ API call succeeded!");
    } else {
      console.error(`\n❌ API call FAILED with ${apiResponse.status}`);

      // Try without /odata in case the URL already has it
      console.log("\n=== Step 3: Try alternate URL formats ===");

      const altUrls = [
        `https://api.cotality.com/trestle/odata/Property?$top=1&$count=true`,
        `https://api-prod.corelogic.com/trestle/odata/Property?$top=1&$count=true`,
        `https://api-trestle.corelogic.com/trestle/odata/Property?$top=1&$count=true`,
      ];

      for (const url of altUrls) {
        if (url === apiUrl) continue; // skip the one we already tried
        console.log(`\nTrying: ${url}`);
        const resp = await fetch(url, {
          headers: {
            "Authorization": `Bearer ${accessToken}`,
            "Accept": "application/json",
          },
        });
        const body = await resp.text();
        console.log(`Status: ${resp.status} | Body: ${body.substring(0, 300)}`);
        if (resp.ok) {
          console.log("✅ This URL works!");
          break;
        }
      }
    }
  } catch (error) {
    console.error("Error:", error);
  }
}

testAuth();
