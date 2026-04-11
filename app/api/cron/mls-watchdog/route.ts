import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { runWatchdogScan } from "@/lib/mls/watchdog-engine";
import { runMarketMonitorCron } from "@/lib/market-monitor/market-monitor-engine";

/**
 * MLS Watchdog Cron Job
 *
 * Runs daily at 14:00 UTC (4:00 AM HST).
 * Scans all active farm areas with watch rules, compares listings
 * against previous snapshots, and generates alerts.
 *
 * Vercel cron schedule: "0 14 * * *"
 * Required header: Authorization: Bearer [CRON_SECRET]
 */

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: { persistSession: false },
});

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log("Starting MLS Watchdog scan...");

    const scanResults = await runWatchdogScan();

    console.log("MLS Watchdog scan complete:", scanResults);

    // Send notifications for new alerts
    if (scanResults.alertsCreated > 0) {
      await sendAlertNotifications();
    }

    // Run Market Monitor profiles (client alerts)
    let monitorResults = { processed: 0, totalAlerts: 0 };
    try {
      monitorResults = await runMarketMonitorCron();
      console.log("Market Monitor:", monitorResults);
    } catch (monitorErr: any) {
      console.error("Market Monitor cron error:", monitorErr.message);
    }

    // Clean up old snapshots (> 90 days)
    await supabase
      .from("mls_listing_snapshots")
      .delete()
      .lt("snapshot_date", new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]);

    return NextResponse.json({
      success: true,
      ...scanResults,
      marketMonitor: monitorResults,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("MLS Watchdog cron error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  return POST(request);
}

/**
 * Send notifications for unsent alerts.
 */
async function sendAlertNotifications() {
  // Get alerts that haven't been notified yet
  const { data: alerts } = await supabase
    .from("mls_watchdog_alerts")
    .select("*, mls_watch_rules(notify_push, notify_email, notify_sms)")
    .eq("status", "new")
    .eq("push_sent", false)
    .eq("email_sent", false)
    .limit(100);

  if (!alerts || alerts.length === 0) return;

  // Group alerts by agent for batch notifications
  const agentAlerts = new Map<string, typeof alerts>();
  for (const alert of alerts) {
    const list = agentAlerts.get(alert.agent_id) || [];
    list.push(alert);
    agentAlerts.set(alert.agent_id, list);
  }

  for (const [agentId, agentAlertList] of agentAlerts) {
    try {
      // Get agent email
      const { data: agent } = await supabase
        .from("agents")
        .select("email, display_name, phone")
        .eq("id", agentId)
        .single();

      if (!agent?.email) continue;

      const rule = agentAlertList[0]?.mls_watch_rules;

      // Email notification (batch all alerts into one email)
      if (rule?.notify_email) {
        try {
          const { Resend } = await import("resend");
          const resend = new Resend(process.env.RESEND_API_KEY!);

          const alertRows = agentAlertList
            .map(
              (a) => `<tr>
              <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;">${a.alert_title}</td>
              <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;">${a.address || ""}, ${a.city || ""}</td>
              <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;">${a.alert_type.replace(/_/g, " ")}</td>
            </tr>`,
            )
            .join("");

          await resend.emails.send({
            from: "Real Estate Genie <support@realestategenie.app>",
            to: [agent.email],
            subject: `MLS Watchdog: ${agentAlertList.length} new alert${agentAlertList.length > 1 ? "s" : ""} in your farm area`,
            html: `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f9fafb;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;padding:40px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;box-shadow:0 1px 3px rgba(0,0,0,0.1);overflow:hidden;">
        <tr><td style="background:linear-gradient(135deg,#6366f1 0%,#8b5cf6 100%);padding:32px 40px;text-align:center;">
          <h1 style="margin:0;color:#fff;font-size:22px;">MLS Watchdog Alert</h1>
          <p style="margin:8px 0 0;color:rgba(255,255,255,0.9);font-size:14px;">${agentAlertList.length} new alert${agentAlertList.length > 1 ? "s" : ""} detected</p>
        </td></tr>
        <tr><td style="padding:24px 40px;">
          <p style="margin:0 0 16px;font-size:15px;color:#374151;">Hi ${agent.display_name?.split(" ")[0] || "there"},</p>
          <p style="margin:0 0 16px;font-size:14px;color:#6b7280;">Your MLS Watchdog found new activity in your farm area:</p>
          <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;font-size:13px;">
            <tr style="background:#f9fafb;">
              <th style="padding:10px 12px;text-align:left;font-weight:600;color:#374151;">Alert</th>
              <th style="padding:10px 12px;text-align:left;font-weight:600;color:#374151;">Location</th>
              <th style="padding:10px 12px;text-align:left;font-weight:600;color:#374151;">Type</th>
            </tr>
            ${alertRows}
          </table>
          <p style="margin:24px 0 0;text-align:center;">
            <a href="${process.env.NEXT_PUBLIC_APP_URL || "https://www.realestategenie.app"}/app/farm" style="display:inline-block;background:#6366f1;color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;">View Alerts</a>
          </p>
        </td></tr>
        <tr><td style="background:#f9fafb;padding:20px 40px;border-top:1px solid #e5e7eb;">
          <p style="margin:0;font-size:12px;color:#9ca3af;text-align:center;">The Real Estate Genie&trade; &middot; MLS Watchdog</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`,
          });

          // Mark emails as sent
          const alertIds = agentAlertList.map((a) => a.id);
          await supabase.from("mls_watchdog_alerts").update({ email_sent: true }).in("id", alertIds);
        } catch (emailErr: any) {
          console.error(`Email notification error for ${agentId}:`, emailErr.message);
        }
      }

      // Push notification
      if (rule?.notify_push) {
        try {
          const { data: subscriptions } = await supabase.from("push_subscriptions").select("*").eq("agent_id", agentId);

          if (subscriptions && subscriptions.length > 0) {
            const webpush = await import("web-push");
            webpush.setVapidDetails(
              `mailto:${process.env.VAPID_EMAIL || "support@realestategenie.app"}`,
              process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
              process.env.VAPID_PRIVATE_KEY!,
            );

            const payload = JSON.stringify({
              title: `MLS Watchdog: ${agentAlertList.length} new alert${agentAlertList.length > 1 ? "s" : ""}`,
              body: agentAlertList[0].alert_title,
              icon: "/logo.png",
              url: "/app/farm",
            });

            for (const sub of subscriptions) {
              try {
                await webpush.sendNotification(
                  { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
                  payload,
                );
              } catch (pushErr: any) {
                // Remove expired subscriptions
                if (pushErr.statusCode === 410 || pushErr.statusCode === 404) {
                  await supabase.from("push_subscriptions").delete().eq("id", sub.id);
                }
              }
            }

            const alertIds = agentAlertList.map((a) => a.id);
            await supabase.from("mls_watchdog_alerts").update({ push_sent: true }).in("id", alertIds);
          }
        } catch (pushErr: any) {
          console.error(`Push notification error for ${agentId}:`, pushErr.message);
        }
      }

      // SMS notification (via GHL)
      if (rule?.notify_sms && agent.phone) {
        try {
          // Get GHL integration
          const { data: ghlIntegration } = await supabase
            .from("integrations")
            .select("config")
            .eq("agent_id", agentId)
            .eq("provider", "ghl")
            .eq("status", "connected")
            .maybeSingle();

          if (ghlIntegration) {
            const ghlConfig =
              typeof ghlIntegration.config === "string" ? JSON.parse(ghlIntegration.config) : ghlIntegration.config;

            const message = `MLS Watchdog: ${agentAlertList.length} new alert${agentAlertList.length > 1 ? "s" : ""} in your farm area. ${agentAlertList[0].alert_title}. View at ${process.env.NEXT_PUBLIC_APP_URL || "https://www.realestategenie.app"}/app/farm`;

            // Use GHL conversations API
            const res = await fetch("https://services.leadconnectorhq.com/conversations/messages", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${ghlConfig.access_token}`,
                Version: "2021-04-15",
              },
              body: JSON.stringify({
                type: "SMS",
                locationId: ghlConfig.location_id,
                contactId: ghlConfig.agent_contact_id, // Agent's own GHL contact
                message,
              }),
            });

            if (res.ok) {
              const alertIds = agentAlertList.map((a) => a.id);
              await supabase.from("mls_watchdog_alerts").update({ sms_sent: true }).in("id", alertIds);
            }
          }
        } catch (smsErr: any) {
          console.error(`SMS notification error for ${agentId}:`, smsErr.message);
        }
      }
    } catch (err: any) {
      console.error(`Notification error for agent ${agentId}:`, err.message);
    }
  }
}
