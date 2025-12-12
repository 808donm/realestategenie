import { supabaseServer } from "@/lib/supabase/server";
import Link from "next/link";

export default async function ThankYouPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;
  const supabase = await supabaseServer();

  // Get open house event details
  const { data: event } = await supabase
    .from("public_open_house_event")
    .select("id,address,display_name,headshot_url,company_logo_url")
    .eq("id", eventId)
    .single();

  if (!event) {
    return (
      <div style={{ maxWidth: 720, margin: "40px auto", padding: 16 }}>
        <h1>Open House Not Found</h1>
      </div>
    );
  }

  const flyerUrl = `/api/open-houses/${eventId}/flyer`;

  return (
    <div style={{ maxWidth: 720, margin: "40px auto", padding: 16, textAlign: "center" }}>
      {/* Company Logo */}
      {event.company_logo_url && (
        <div style={{ marginBottom: 24 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={event.company_logo_url}
            alt="Company Logo"
            style={{ maxWidth: 200, maxHeight: 60, objectFit: "contain", margin: "0 auto" }}
          />
        </div>
      )}

      {/* Agent Headshot */}
      {event.headshot_url && (
        <div style={{ marginBottom: 24 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={event.headshot_url}
            alt="Agent"
            style={{
              width: 80,
              height: 80,
              borderRadius: "50%",
              objectFit: "cover",
              border: "3px solid #e5e7eb",
              margin: "0 auto"
            }}
          />
        </div>
      )}

      {/* Success Message */}
      <div style={{
        background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
        padding: "40px 30px",
        borderRadius: 16,
        marginBottom: 32,
        color: "white"
      }}>
        <h1 style={{ fontSize: 36, fontWeight: 800, margin: "0 0 12px 0" }}>
          Thank You! ✓
        </h1>
        <p style={{ fontSize: 18, margin: 0, opacity: 0.95 }}>
          You're all checked in for
        </p>
        <p style={{ fontSize: 20, fontWeight: 700, margin: "8px 0 0 0" }}>
          {event.address}
        </p>
      </div>

      {/* Download Flyer Button */}
      <div style={{ marginBottom: 32 }}>
        <a
          href={flyerUrl}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: "inline-block",
            background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
            color: "white",
            padding: "18px 40px",
            borderRadius: 12,
            fontSize: 18,
            fontWeight: 700,
            textDecoration: "none",
            boxShadow: "0 4px 12px rgba(16, 185, 129, 0.3)",
            transition: "transform 0.2s",
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.transform = "translateY(-2px)";
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.transform = "translateY(0)";
          }}
        >
          📄 Download Fact Sheet
        </a>
      </div>

      {/* Info Box */}
      <div style={{
        background: "#f0fdf4",
        border: "2px solid #10b981",
        borderRadius: 12,
        padding: 24,
        marginBottom: 32,
        textAlign: "left"
      }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, margin: "0 0 12px 0", color: "#059669" }}>
          What's Next?
        </h2>
        <ul style={{ margin: 0, paddingLeft: 20, color: "#047857" }}>
          <li style={{ marginBottom: 8 }}>
            Check your <strong>email and phone</strong> for a confirmation message
          </li>
          <li style={{ marginBottom: 8 }}>
            The message includes a link to <strong>download the property fact sheet</strong>
          </li>
          <li style={{ marginBottom: 8 }}>
            {event.display_name || "Your agent"} will follow up with you soon
          </li>
          <li>
            Feel free to explore the property and ask questions!
          </li>
        </ul>
      </div>

      {/* Back Link */}
      <Link
        href={`/oh/${eventId}`}
        style={{
          display: "inline-block",
          color: "#6b7280",
          fontSize: 14,
          textDecoration: "underline",
          marginTop: 16
        }}
      >
        ← Back to Open House Page
      </Link>
    </div>
  );
}
