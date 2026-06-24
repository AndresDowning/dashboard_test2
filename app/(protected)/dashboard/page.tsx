import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import FilesClient from "./FilesClient";

export const dynamic = "force-dynamic";

const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? "adowning@paytiptap.com";

export default async function Dashboard() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: files } = await supabase
    .from("files")
    .select("*")
    .order("created_at", { ascending: false });

  return (
    <FilesClient
      user={{ id: user.id, email: user.email ?? "" }}
      files={files ?? []}
      isAdmin={user.email === ADMIN_EMAIL}
    />
  );
}
