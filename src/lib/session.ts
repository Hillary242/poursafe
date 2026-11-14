import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

/**
 * Who is signed in, and their name — read once per request.
 *
 * PourSafe's own: it does not know about the office app's admins, modules or
 * previews. What a person may do is the database's to decide (the field_*
 * functions and policies); this only says who they are.
 */
export const session = cache(async () => {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { user: null, profile: null as { full_name: string | null; email: string | null } | null };
  const { data: profile } = await supabase.from("profiles").select("full_name, email").eq("id", user.id).maybeSingle();
  return { user, profile: profile as { full_name: string | null; email: string | null } | null };
});
