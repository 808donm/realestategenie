import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

async function updatePipelineConfig() {
  const agentId = "b80d448f-d58a-4cb6-bb13-f5a6d38b30ae";
  const pipelineId = "yGkdoIRAz83GmWQ74HOw";
  const newLeadStageId = "ac0c6f3b-56fa-42aa-951b-79907dbb0c2b";

  console.log("Fetching integration...");
  const { data: integration, error: fetchError } = await supabase
    .from("integrations")
    .select("*")
    .eq("agent_id", agentId)
    .eq("provider", "ghl")
    .single();

  if (fetchError || !integration) {
    console.error("Failed to fetch integration:", fetchError);
    return;
  }

  console.log("Current config:", integration.config);

  const updatedConfig = {
    ...integration.config,
    ghl_pipeline_id: pipelineId,
    ghl_new_lead_stage: newLeadStageId,
  };

  console.log("Updating config...");
  const { error: updateError } = await supabase
    .from("integrations")
    .update({
      config: updatedConfig,
      updated_at: new Date().toISOString(),
    })
    .eq("id", integration.id);

  if (updateError) {
    console.error("Failed to update:", updateError);
    return;
  }

  console.log("✅ Pipeline configuration updated successfully!");
  console.log("Pipeline ID:", pipelineId);
  console.log("New Lead Stage ID:", newLeadStageId);
  console.log("\n🎯 Next registration will create an Opportunity in your pipeline!");
}

updatePipelineConfig();
