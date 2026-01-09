// Email templates and sending for usage alerts

import { supabaseAdmin } from "@/lib/supabase/admin";
import { markAlertEmailSent } from "@/lib/subscriptions/utils";
import type { UsageAlert, SubscriptionPlan } from "@/lib/subscriptions/types";

/**
 * Generate HTML email for 70% warning
 */
function generateWarningEmail(
  agentName: string,
  resourceType: string,
  usage: number,
  limit: number,
  percentage: number,
  suggestedPlan?: SubscriptionPlan
): string {
  const resourceLabel = resourceType === 'agents' ? 'agent' :
                        resourceType === 'properties' ? 'property' : 'tenant';

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Approaching Plan Limit</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
    <h1 style="color: white; margin: 0; font-size: 24px;">⚠️ Approaching Your Plan Limit</h1>
  </div>

  <div style="background: white; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
    <p style="font-size: 16px; margin-top: 0;">Hi ${agentName},</p>

    <p style="font-size: 16px;">
      You're currently using <strong>${usage} of ${limit} ${resourceLabel}s</strong> (${Math.round(percentage)}%) on your current plan.
    </p>

    <p style="font-size: 16px;">
      Teams with more ${resourceLabel}s typically upgrade to ensure they have room to grow without interruption.
    </p>

    ${suggestedPlan ? `
    <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
      <h3 style="margin-top: 0; color: #1f2937;">Recommended: ${suggestedPlan.name}</h3>
      <ul style="margin: 10px 0; padding-left: 20px;">
        <li>Up to ${suggestedPlan.max_agents === 999999 ? 'unlimited' : suggestedPlan.max_agents} agents</li>
        <li>Up to ${suggestedPlan.max_properties === 999999 ? 'unlimited' : suggestedPlan.max_properties} properties</li>
        <li>Up to ${suggestedPlan.max_tenants === 999999 ? 'unlimited' : suggestedPlan.max_tenants} tenants</li>
      </ul>
      <p style="font-size: 18px; font-weight: bold; color: #1f2937; margin: 15px 0;">
        $${suggestedPlan.monthly_price}/month
      </p>
    </div>
    ` : ''}

    <div style="text-align: center; margin: 30px 0;">
      <a href="https://www.realestategenie.app/app/billing" style="display: inline-block; background: #3b82f6; color: white; padding: 12px 30px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px;">
        View Upgrade Options
      </a>
    </div>

    <p style="font-size: 14px; color: #6b7280; margin-bottom: 0;">
      Questions? Reply to this email or contact us at <a href="mailto:support@realestategenie.app" style="color: #3b82f6;">support@realestategenie.app</a>
    </p>
  </div>

  <div style="text-align: center; margin-top: 20px; color: #9ca3af; font-size: 12px;">
    <p>The Real Estate Genie</p>
    <p>You're receiving this because your account is approaching plan limits.</p>
  </div>
</body>
</html>
  `;
}

/**
 * Generate HTML email for 100% critical alert
 */
function generateCriticalEmail(
  agentName: string,
  exceededResources: Array<{ type: string; usage: number; limit: number }>,
  currentPlan: SubscriptionPlan,
  suggestedPlan?: SubscriptionPlan
): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Plan Limit Exceeded</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
    <h1 style="color: white; margin: 0; font-size: 24px;">🚨 Plan Limit Exceeded</h1>
  </div>

  <div style="background: white; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
    <p style="font-size: 16px; margin-top: 0;">Hi ${agentName},</p>

    <p style="font-size: 16px;">
      Your account has exceeded the limits for your <strong>${currentPlan.name}</strong> plan:
    </p>

    <div style="background: #fef2f2; border-left: 4px solid #ef4444; padding: 15px; margin: 20px 0;">
      <ul style="margin: 0; padding-left: 20px;">
        ${exceededResources.map(resource => `
          <li style="margin: 8px 0;">
            <strong>${resource.type.charAt(0).toUpperCase() + resource.type.slice(1)}:</strong>
            ${resource.usage} of ${resource.limit} (${Math.round((resource.usage / resource.limit) * 100)}%)
          </li>
        `).join('')}
      </ul>
    </div>

    <p style="font-size: 16px; font-weight: 600; color: #1f2937;">
      Don't worry - nothing will stop working!
    </p>

    <p style="font-size: 16px;">
      We believe in fair-use limits, so your service continues uninterrupted. However, to stay compliant with your subscription terms, let's get you moved to the right plan.
    </p>

    ${suggestedPlan ? `
    <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
      <h3 style="margin-top: 0; color: #1f2937;">Recommended: ${suggestedPlan.name}</h3>
      <ul style="margin: 10px 0; padding-left: 20px;">
        <li>Up to ${suggestedPlan.max_agents === 999999 ? 'unlimited' : suggestedPlan.max_agents} agents</li>
        <li>Up to ${suggestedPlan.max_properties === 999999 ? 'unlimited' : suggestedPlan.max_properties} properties</li>
        <li>Up to ${suggestedPlan.max_tenants === 999999 ? 'unlimited' : suggestedPlan.max_tenants} tenants</li>
      </ul>
      <p style="font-size: 18px; font-weight: bold; color: #1f2937; margin: 15px 0;">
        $${suggestedPlan.monthly_price}/month
      </p>
    </div>
    ` : ''}

    <div style="text-align: center; margin: 30px 0;">
      <a href="https://www.realestategenie.app/app/billing" style="display: inline-block; background: #ef4444; color: white; padding: 12px 30px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px; margin-right: 10px;">
        Upgrade Now
      </a>
      <a href="mailto:sales@realestategenie.app?subject=Plan Upgrade Needed" style="display: inline-block; background: white; color: #374151; border: 2px solid #d1d5db; padding: 12px 30px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px;">
        Contact Sales
      </a>
    </div>

    <p style="font-size: 14px; color: #6b7280; margin-bottom: 0;">
      Need help choosing the right plan? Our team is here to help at <a href="mailto:sales@realestategenie.app" style="color: #3b82f6;">sales@realestategenie.app</a>
    </p>
  </div>

  <div style="text-align: center; margin-top: 20px; color: #9ca3af; font-size: 12px;">
    <p>The Real Estate Genie</p>
    <p>You're receiving this because your account has exceeded plan limits.</p>
  </div>
</body>
</html>
  `;
}

/**
 * Send usage alert email
 */
export async function sendUsageAlertEmail(
  alert: UsageAlert,
  agent: { email: string; display_name: string | null },
  plan: SubscriptionPlan,
  suggestedPlan?: SubscriptionPlan | null
): Promise<boolean> {
  try {
    const agentName = agent.display_name || agent.email;

    let subject = '';
    let html = '';

    if (alert.alert_type === 'warning_70') {
      const resourceLabel = alert.resource_type === 'agents' ? 'agent' :
                           alert.resource_type === 'properties' ? 'property' : 'tenant';

      subject = `⚠️ Approaching ${resourceLabel} limit on your Real Estate Genie plan`;
      html = generateWarningEmail(
        agentName,
        alert.resource_type,
        alert.usage_count,
        alert.limit_count,
        alert.usage_percentage,
        suggestedPlan || undefined
      );
    } else if (alert.alert_type === 'critical_100') {
      subject = '🚨 Plan limit exceeded - Let\'s get you upgraded';

      // For critical alerts, we might have multiple resources exceeded
      // For now, send for the single resource
      html = generateCriticalEmail(
        agentName,
        [{
          type: alert.resource_type,
          usage: alert.usage_count,
          limit: alert.limit_count
        }],
        plan,
        suggestedPlan || undefined
      );
    } else {
      return false;
    }

    // TODO: Integrate with your email service (SendGrid, Resend, AWS SES, etc.)
    // For now, we'll just log
    console.log(`Would send email to ${agent.email}:`);
    console.log(`Subject: ${subject}`);
    console.log(`Alert Type: ${alert.alert_type}`);

    // Example with Resend (uncomment when ready):
    /*
    const resend = new Resend(process.env.RESEND_API_KEY);
    await resend.emails.send({
      from: 'Real Estate Genie <notifications@realestategenie.app>',
      to: agent.email,
      subject,
      html
    });
    */

    // Mark email as sent
    await markAlertEmailSent(alert.id);

    return true;
  } catch (error) {
    console.error('Error sending usage alert email:', error);
    return false;
  }
}

/**
 * Process all pending usage alert emails
 */
export async function processPendingUsageAlerts(): Promise<{
  processed: number;
  sent: number;
  errors: number;
}> {
  // Get all unresolved alerts that haven't had emails sent
  const { data: pendingAlerts } = await supabaseAdmin
    .from("usage_alerts")
    .select(`
      *,
      agents (
        email,
        display_name,
        agent_subscriptions!inner (
          subscription_plan_id,
          subscription_plans:subscription_plan_id (*)
        )
      )
    `)
    .eq("is_resolved", false)
    .eq("email_sent", false)
    .order("created_at", { ascending: true })
    .limit(50); // Process in batches

  const results = {
    processed: 0,
    sent: 0,
    errors: 0
  };

  for (const alert of pendingAlerts || []) {
    results.processed++;

    try {
      const agent = alert.agents;
      const plan = agent?.agent_subscriptions?.[0]?.subscription_plans;

      if (!agent || !plan) {
        console.error(`Missing agent or plan for alert ${alert.id}`);
        results.errors++;
        continue;
      }

      // Get suggested upgrade plan
      let suggestedPlan = null;
      if (plan.tier_level < 5) {
        const { data: nextPlan } = await supabaseAdmin
          .from("subscription_plans")
          .select("*")
          .eq("is_active", true)
          .eq("is_custom", false)
          .gt("tier_level", plan.tier_level)
          .order("tier_level", { ascending: true })
          .limit(1)
          .single();

        suggestedPlan = nextPlan;
      }

      const sent = await sendUsageAlertEmail(
        alert,
        { email: agent.email, display_name: agent.display_name },
        plan,
        suggestedPlan
      );

      if (sent) {
        results.sent++;
      } else {
        results.errors++;
      }
    } catch (error) {
      console.error(`Error processing alert ${alert.id}:`, error);
      results.errors++;
    }
  }

  return results;
}
