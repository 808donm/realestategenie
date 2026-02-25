import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

/**
 * Email a calculator report (PDF or XLSX) to a contact.
 * POST /api/email/send-report
 * Body: FormData with fields: file, toEmail, toName, reportTitle, message (optional)
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await supabaseServer();
    const { data: userData } = await supabase.auth.getUser();

    if (!userData.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File;
    const toEmail = formData.get("toEmail") as string;
    const toName = (formData.get("toName") as string) || "";
    const reportTitle = (formData.get("reportTitle") as string) || "Calculator Report";
    const message = (formData.get("message") as string) || "";

    if (!file || !toEmail) {
      return NextResponse.json(
        { error: "File and toEmail are required" },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(toEmail)) {
      return NextResponse.json(
        { error: "Invalid email address" },
        { status: 400 }
      );
    }

    // Validate file type
    const allowedTypes = [
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/vnd.ms-excel",
    ];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: "Only PDF and Excel files are allowed" },
        { status: 400 }
      );
    }

    // Get sender info for the email
    const { data: agent } = await supabase
      .from("agents")
      .select("full_name, email, phone, agency_name")
      .eq("user_id", userData.user.id)
      .single();

    const senderName = agent?.full_name || "Your Agent";
    const senderAgency = agent?.agency_name || "";
    const senderEmail = agent?.email || "";
    const senderPhone = agent?.phone || "";

    // Convert file to Buffer for Resend attachment
    const arrayBuffer = await file.arrayBuffer();
    const fileBuffer = Buffer.from(arrayBuffer);

    const ext = file.type === "application/pdf" ? "pdf" : "xlsx";
    const filename = `${reportTitle.replace(/[^a-zA-Z0-9\s-]/g, "").replace(/\s+/g, "_")}.${ext}`;

    // Lazy-load Resend
    const { Resend } = await import("resend");
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "Email service not configured. RESEND_API_KEY is missing." },
        { status: 500 }
      );
    }

    const resend = new Resend(apiKey);

    const recipientGreeting = toName ? `Hi ${toName},` : "Hi,";
    const customMessage = message
      ? `<p style="margin: 0 0 20px; font-size: 15px; line-height: 1.6; color: #374151; white-space: pre-wrap;">${escapeHtml(message)}</p>`
      : "";

    const contactBlock = [senderEmail, senderPhone]
      .filter(Boolean)
      .map((v) => `<span style="color: #667eea;">${escapeHtml(v!)}</span>`)
      .join(" &bull; ");

    const { data, error } = await resend.emails.send({
      from: "Real Estate Genie <support@realestategenie.app>",
      to: [toEmail],
      subject: `${reportTitle} - from ${senderName}`,
      html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f9fafb;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f9fafb; padding: 40px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); overflow: hidden;">

          <tr>
            <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 40px 30px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 800;">
                ${escapeHtml(reportTitle)}
              </h1>
              ${senderAgency ? `<p style="margin: 10px 0 0; color: rgba(255,255,255,0.9); font-size: 16px;">from ${escapeHtml(senderAgency)}</p>` : ""}
            </td>
          </tr>

          <tr>
            <td style="padding: 40px;">
              <p style="margin: 0 0 20px; font-size: 16px; line-height: 1.6; color: #374151;">
                ${recipientGreeting}
              </p>

              <p style="margin: 0 0 20px; font-size: 16px; line-height: 1.6; color: #374151;">
                <strong>${escapeHtml(senderName)}</strong> has sent you a ${ext.toUpperCase()} report: <strong>${escapeHtml(reportTitle)}</strong>.
              </p>

              ${customMessage}

              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f3f4f6; border-radius: 8px; margin: 30px 0;">
                <tr>
                  <td style="padding: 20px; text-align: center;">
                    <p style="margin: 0 0 8px; font-size: 14px; color: #6b7280;">
                      Attached file
                    </p>
                    <p style="margin: 0; font-size: 16px; font-weight: 600; color: #1f2937;">
                      ${escapeHtml(filename)}
                    </p>
                  </td>
                </tr>
              </table>

              ${contactBlock ? `
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f0fdf4; border-radius: 8px; border-left: 4px solid #10b981; margin: 20px 0;">
                <tr>
                  <td style="padding: 16px 20px;">
                    <p style="margin: 0 0 4px; font-size: 14px; font-weight: 600; color: #065f46;">
                      ${escapeHtml(senderName)}
                    </p>
                    <p style="margin: 0; font-size: 13px; color: #065f46;">
                      ${contactBlock}
                    </p>
                  </td>
                </tr>
              </table>
              ` : ""}

              <p style="margin: 20px 0 0; font-size: 14px; line-height: 1.6; color: #6b7280;">
                If you have any questions about this report, please reach out to your agent directly.
              </p>
            </td>
          </tr>

          <tr>
            <td style="background-color: #f9fafb; padding: 30px 40px; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0; font-size: 12px; color: #6b7280; text-align: center;">
                Sent via Real Estate Genie
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
      `.trim(),
      text: [
        reportTitle,
        "",
        recipientGreeting,
        "",
        `${senderName} has sent you a ${ext.toUpperCase()} report: ${reportTitle}.`,
        message ? `\n${message}` : "",
        "",
        `The ${ext.toUpperCase()} file is attached to this email.`,
        "",
        senderName,
        [senderEmail, senderPhone].filter(Boolean).join(" | "),
        "",
        "Sent via Real Estate Genie",
      ]
        .filter((line) => line !== undefined)
        .join("\n")
        .trim(),
      attachments: [
        {
          filename,
          content: fileBuffer,
        },
      ],
    });

    if (error) {
      console.error("Resend send-report error:", error);
      return NextResponse.json(
        { error: `Failed to send email: ${(error as any).message || "Unknown error"}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      emailId: data?.id,
      toEmail,
      toName,
    });
  } catch (error: any) {
    console.error("Error in send-report route:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
