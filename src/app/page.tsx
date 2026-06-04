import { redirect } from "next/navigation";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { withTimeout } from "@/lib/fetch-timeout";
import { createClient } from "@/lib/supabase/server";

export default async function Home() {
  try {
    const supabase = await createClient();
    const { data } = await withTimeout(supabase.auth.getUser(), 8_000);
    if (!data.user) {
      redirect("/login");
    }
  } catch {
    redirect("/login");
  }

  return <DashboardShell />;
}
