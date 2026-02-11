import { supabaseServer } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import TemplateCustomizer from "./template-customizer";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function TemplatesPage() {
  const supabase = await supabaseServer();
  const { data: userData } = await supabase.auth.getUser();

  if (!userData.user) {
    redirect("/login");
  }

  // Get current template settings
  const { data: settings } = await supabase
    .from("flyer_template_settings")
    .select("*")
    .eq("agent_id", userData.user.id)
    .single();

  // Get agent details for preview
  const { data: agent } = await supabase
    .from("agents")
    .select("display_name, email, phone, company_name")
    .eq("id", userData.user.id)
    .single();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Flyer Templates</h1>
        <p className="text-muted-foreground">
          Customize your open house flyer templates with your brand
        </p>
      </div>

      <TemplateCustomizer initialSettings={settings} agentInfo={agent} />
    </div>
  );
}
