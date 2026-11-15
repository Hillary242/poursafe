import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { FieldFile } from "@/lib/field";

type Supa = Awaited<ReturnType<typeof createClient>>;

/**
 * A file still HELD in private storage (no company yet, 0261) has no link to
 * show it by — on the reviewer's phone it was a bare 📷. Give each one a
 * short-lived signed link so the photo itself shows; storage's own policy
 * (0262) decides whether this person may have it.
 */
export async function withHeldLinks(supabase: Supa, files: (FieldFile & { held_path?: string | null })[]) {
  const held = files.filter((f) => !f.drive_source_url && f.held_path);
  if (!held.length) return files;
  const { data } = await supabase.storage.from("safety-uploads").createSignedUrls(held.map((f) => f.held_path!), 60 * 60);
  const byPath = new Map((data ?? []).map((d) => [d.path, d.signedUrl]));
  return files.map((f) => (!f.drive_source_url && f.held_path && byPath.get(f.held_path) ? { ...f, drive_source_url: byPath.get(f.held_path)! } : f));
}
