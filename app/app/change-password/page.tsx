import { supabaseServer } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import ChangePasswordForm from "./change-password-form";

export const dynamic = "force-dynamic";

export default async function ChangePasswordPage() {
  const supabase = await supabaseServer();
  const { data } = await supabase.auth.getUser();

  if (!data.user) {
    redirect("/signin");
  }

  // Check if user actually needs to change password
  const { data: agent } = await supabase
    .from("agents")
    .select("must_change_password")
    .eq("id", data.user.id)
    .single();

  if (!agent?.must_change_password) {
    redirect("/app/dashboard");
  }

  return (
    <div className="max-w-md mx-auto mt-12">
      <h1 className="text-2xl font-bold mb-2">Change Your Password</h1>
      <p className="text-gray-500 mb-6">
        Your account was created with a temporary password. Please set a new password to continue.
      </p>
      <ChangePasswordForm />
    </div>
  );
}
