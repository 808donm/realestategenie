/**
 * Trestle API Connection Test
 *
 * Usage: node test-trestle.js CLIENT_ID CLIENT_SECRET
 */

const CLIENT_ID = process.argv[2];
const CLIENT_SECRET = process.argv[3];

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.log("Usage: node test-trestle.js CLIENT_ID CLIENT_SECRET");
  console.log("Example: node test-trestle.js trestle_MyCompany12345 mySecretHere");
  process.exit(1);
}

const TOKEN_URL = "https://api.cotality.com/trestle/oidc/connect/token";
const API_URL = "https://api.cotality.com/trestle/odata";

(async () => {
  console.log("Client ID:", CLIENT_ID);
  console.log("Client Secret length:", CLIENT_SECRET.length);
  console.log("");

  // Test 1: Token with scope=api
  console.log("=== TEST 1: Token request WITH scope=api ===");
  const res1 = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      scope: "api",
    }),
  });
  console.log("HTTP Status:", res1.status, res1.statusText);
  const text1 = await res1.text();
  console.log("Response:", text1);
  console.log("");

  // Test 2: Token without scope
  console.log("=== TEST 2: Token request WITHOUT scope ===");
  const res2 = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
    }),
  });
  console.log("HTTP Status:", res2.status, res2.statusText);
  const text2 = await res2.text();
  console.log("Response:", text2);

  // Use whichever token worked (prefer scope=api)
  let token = null;
  let tokenSource = "";
  try {
    if (res1.status === 200) {
      token = JSON.parse(text1).access_token;
      tokenSource = "scope=api";
    } else {
      const d2 = JSON.parse(text2);
      token = d2.access_token;
      tokenSource = "no-scope (scope=" + (d2.scope || "none") + ")";
    }
  } catch {}

  console.log("Using token from:", tokenSource);
  console.log("");

  if (!token) {
    console.log("No token obtained. Cannot test data access.");
    return;
  }

  // Test 3: OData service root
  console.log("=== TEST 3: OData service root ===");
  const res3 = await fetch(API_URL, {
    headers: {
      Authorization: "Bearer " + token,
      Accept: "application/json",
      "OData-Version": "4.0",
      "OData-MaxVersion": "4.0",
    },
  });
  console.log("HTTP Status:", res3.status, res3.statusText);
  console.log("");

  // Test 4: Property query
  console.log("=== TEST 4: GET /Property?$top=1 ===");
  const res4 = await fetch(
    API_URL +
      "/Property?$top=1&$count=true&$select=ListingKey,ListingId,StandardStatus,City,PostalCode,ListPrice,PropertyType",
    {
      headers: {
        Authorization: "Bearer " + token,
        Accept: "application/json",
        "OData-Version": "4.0",
        "OData-MaxVersion": "4.0",
      },
    },
  );
  console.log("HTTP Status:", res4.status, res4.statusText);
  const text4 = await res4.text();
  console.log("Response:", text4.substring(0, 500));
  console.log("");

  // Summary
  console.log("=== SUMMARY ===");
  console.log("scope=api token:", res1.status === 200 ? "SUCCESS" : "FAILED (" + res1.status + ")");
  console.log("no-scope token:", res2.status === 200 ? "SUCCESS" : "FAILED (" + res2.status + ")");
  console.log("OData root:", res3.status === 200 ? "ACCESSIBLE" : "BLOCKED (" + res3.status + ")");
  console.log("Property data:", res4.status === 200 ? "SUCCESS — MLS IS LIVE!" : "BLOCKED (" + res4.status + ")");
})();
