import Link from "next/link";
import { supabaseServer } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import SignOutButton from "./signout-button";
import TodayView from "./today-view";
import ActivityFeed from "./activity-feed";
import ListingSnapshot from "./listing-snapshot";
import MarketPulse from "./market-pulse";
import QuickActions from "./quick-actions";
import AIBriefingCard from "./ai-briefing-card";
import AIConversationsCard from "./ai-conversations-card";
import PipelineStats from "./pipeline-stats";
import { PIPELINE_STAGES, PIPELINE_STAGE_LABELS } from "@/lib/pipeline-stages";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function DashboardPage() {
  const supabase = await supabaseServer();
  const { data: userData } = await supabase.auth.getUser();

  const user = userData.user;
  if (!user) {
    return <div style={{ padding: 24 }}>Not signed in.</div>;
  }

  // Agent profile (RLS scoped)
  const { data: agent } = await supabase
    .from("agents")
    .select("display_name, phone_e164, license_number, locations_served")
    .eq("id", user.id)
    .single();

  const profile = agent ?? {
    display_name: "",
    phone_e164: null,
    license_number: null,
    locations_served: [],
  };

  const agentName = profile.display_name?.trim() || user.email || "Agent";

  const missing: string[] = [];
  if (!profile.display_name?.trim()) missing.push("name");
  if (!profile.phone_e164) missing.push("phone");
  if (!profile.license_number) missing.push("license");
  if (!profile.locations_served || profile.locations_served.length === 0)
    missing.push("locations");

  // Fetch data in parallel
  const now = new Date();
  const todayStart = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate()
  ).toISOString();
  const todayEnd = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() + 1
  ).toISOString();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 86400000).toISOString();

  const [{ data: todayEvents }, { data: allLeads }, { data: activeListings }] =
    await Promise.all([
      // Today's events
      supabase
        .from("open_house_events")
        .select("id, address, start_at, end_at, status, event_type")
        .eq("agent_id", user.id)
        .gte("start_at", todayStart)
        .lt("start_at", todayEnd)
        .order("start_at", { ascending: true })
        .limit(10),
      // All leads for pipeline + follow-ups
      supabase
        .from("lead_submissions")
        .select(
          "id, event_id, payload, heat_score, pipeline_stage, created_at, updated_at"
        )
        .eq("agent_id", user.id)
        .order("heat_score", { ascending: false })
        .limit(200),
      // Active listings (open houses as proxy)
      supabase
        .from("open_house_events")
        .select("id, address, start_at, created_at, status")
        .eq("agent_id", user.id)
        .eq("status", "published")
        .order("created_at", { ascending: false })
        .limit(50),
    ]);

  // Build pipeline data
  const leads = allLeads || [];
  const totalLeads = leads.length;
  const hotLeads = leads.filter((l) => l.heat_score >= 80).length;

  const pipelineStages = PIPELINE_STAGES.map((key) => ({
    stage: key,
    label: PIPELINE_STAGE_LABELS[key],
    count: leads.filter((l) => l.pipeline_stage === key).length,
  }));

  // Build urgent follow-ups (leads touched 3+ days ago with score >= 50)
  const urgentFollowUps = leads
    .filter((l) => {
      const lastTouched = l.updated_at || l.created_at;
      const daysSince = Math.floor(
        (now.getTime() - new Date(lastTouched).getTime()) / 86400000
      );
      return daysSince >= 3 && l.heat_score >= 50;
    })
    .slice(0, 5)
    .map((l) => ({
      leadId: l.id,
      name: (l.payload as any)?.name || "Unknown",
      heatScore: l.heat_score,
      pipelineStageLabel:
        PIPELINE_STAGE_LABELS[
          l.pipeline_stage as keyof typeof PIPELINE_STAGE_LABELS
        ] || l.pipeline_stage,
      property: l.event_id,
      daysSinceLastTouch: Math.floor(
        (now.getTime() -
          new Date(l.updated_at || l.created_at).getTime()) /
          86400000
      ),
    }));

  // Build listing snapshot
  const listings = activeListings || [];
  const domValues = listings.map((l) =>
    Math.floor(
      (now.getTime() - new Date(l.created_at).getTime()) / 86400000
    )
  );
  const avgDOM =
    domValues.length > 0
      ? Math.round(domValues.reduce((a, b) => a + b, 0) / domValues.length)
      : 0;
  const staleListings = listings
    .map((l, i) => ({
      id: l.id,
      address: l.address,
      dom: domValues[i],
    }))
    .filter((l) => l.dom >= 21)
    .sort((a, b) => b.dom - a.dom);

  const listingStats = {
    totalActive: listings.length,
    avgDOM,
    staleCount: staleListings.length,
    staleListings: staleListings.slice(0, 3),
  };

  // Market pulse — placeholder until ATTOM/MLS integrations feed real data
  const marketStats =
    profile.locations_served?.length
      ? [
          {
            label: "Your Areas",
            value: `${profile.locations_served.length}`,
            trend: "flat" as const,
          },
          {
            label: "Active Leads",
            value: `${totalLeads}`,
            trend: totalLeads > 0 ? ("up" as const) : ("flat" as const),
          },
        ]
      : [];

  // AI Briefing — generate priorities from real data
  let briefingPriorities: {
    title: string;
    description: string;
    leadId?: string;
  }[] | null = null;
  let briefingGeneratedAt: string | null = null;

  if (leads.length > 0) {
    const newLeadCount = leads.filter(
      (l) => new Date(l.created_at) >= new Date(sevenDaysAgo)
    ).length;

    briefingPriorities = [];

    if (urgentFollowUps.length > 0) {
      const top = urgentFollowUps[0];
      briefingPriorities.push({
        title: `Follow up with ${top.name}`,
        description: `This lead has a heat score of ${top.heatScore} and hasn't been contacted in ${top.daysSinceLastTouch} days. Reach out today to keep momentum.`,
        leadId: top.leadId,
      });
    }

    if (hotLeads > 0) {
      briefingPriorities.push({
        title: `${hotLeads} hot lead${hotLeads > 1 ? "s" : ""} in your pipeline`,
        description: `You have ${hotLeads} lead${hotLeads > 1 ? "s" : ""} with a heat score of 80+. Prioritize these for outreach — they're most likely to convert.`,
      });
    }

    if ((todayEvents || []).length > 0) {
      briefingPriorities.push({
        title: `${(todayEvents || []).length} event${(todayEvents || []).length > 1 ? "s" : ""} today`,
        description: `You have ${(todayEvents || []).length} scheduled event${(todayEvents || []).length > 1 ? "s" : ""} today. Review your prep materials and arrive early.`,
      });
    } else if (newLeadCount > 0) {
      briefingPriorities.push({
        title: `${newLeadCount} new lead${newLeadCount > 1 ? "s" : ""} this week`,
        description: `Speed-to-lead matters. Make sure each new lead gets a personal response within the first hour.`,
      });
    }

    if (briefingPriorities.length === 0) briefingPriorities = null;
    briefingGeneratedAt = now.toISOString();
  }

  return (
    <div className="space-y-6">
      {/* Profile completion alert */}
      {missing.length > 0 && (
        <Card className="border-warning bg-warning/5">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Complete Your Profile</CardTitle>
              <Link href="/app/settings/profile">
                <Button variant="outline" size="sm">
                  Update Profile
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm">
              You&apos;re missing: <strong>{missing.join(", ")}</strong>
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              Your attendee pages look more professional when your profile is
              complete.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Today View: Greeting + Schedule + Urgent Follow-ups */}
      <TodayView
        agentName={agentName}
        todayEvents={(todayEvents || []).map((e) => ({
          id: e.id,
          address: e.address,
          start_at: e.start_at,
          end_at: e.end_at,
          status: e.status,
          event_type: e.event_type,
        }))}
        urgentFollowUps={urgentFollowUps}
      />

      {/* AI Briefing */}
      <AIBriefingCard
        priorities={briefingPriorities}
        generatedAt={briefingGeneratedAt}
      />

      {/* Two-column layout for desktop */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Left column */}
        <div className="space-y-6">
          <PipelineStats
            stages={pipelineStages}
            totalLeads={totalLeads}
            hotLeads={hotLeads}
          />
          <ListingSnapshot stats={listingStats} />
          <MarketPulse stats={marketStats} />
        </div>

        {/* Right column */}
        <div className="space-y-6">
          <AIConversationsCard agentId={user.id} />
          <QuickActions />
          <ActivityFeed />
        </div>
      </div>
    </div>
  );
}
