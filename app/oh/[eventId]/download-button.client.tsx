"use client";

export default function DownloadButton({ flyerUrl }: { flyerUrl: string }) {
  return (
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
  );
}
