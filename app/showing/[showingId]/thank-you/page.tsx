export default async function ShowingThankYouPage() {
  return (
    <div style={{ maxWidth: 720, margin: "60px auto", padding: 16, textAlign: "center" }}>
      <div style={{ fontSize: 48, marginBottom: 16 }}>✅</div>
      <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 12 }}>
        Application Submitted!
      </h1>
      <p style={{ fontSize: 16, opacity: 0.8, lineHeight: 1.6, marginBottom: 24 }}>
        Thank you for your interest in this property. Your rental application has been received
        and will be reviewed shortly.
      </p>

      <div style={{
        padding: 20,
        background: "#f0f9ff",
        borderRadius: 12,
        border: "1px solid #bfdbfe",
        marginBottom: 24
      }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>What's Next?</h2>
        <p style={{ fontSize: 14, opacity: 0.8, margin: 0 }}>
          The property manager will review your application and contact you via the
          email or phone number you provided. This typically takes 1-2 business days.
        </p>
      </div>

      <p style={{ fontSize: 14, opacity: 0.6 }}>
        You may close this window.
      </p>
    </div>
  );
}
