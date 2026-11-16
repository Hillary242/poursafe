import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { session } from "@/lib/session";
import { fieldDict } from "@/lib/fieldLang";
import { fieldJobs } from "@/lib/fieldJobs";
import { currentSite } from "@/lib/site";
import type { FieldDict } from "@/lib/fieldI18n";

/** A section that exists but isn't built yet (Daily Forms, Safety Drawings — 15 Nov). */
export async function Soon({ title, body }: { title: (t: FieldDict) => string; body: (t: FieldDict) => string }) {
  const { user } = await session();
  const supabase = await createClient();
  const [{ t }, jobs] = await Promise.all([fieldDict(), fieldJobs(supabase, user!.id)]);
  const site = await currentSite(jobs);
  if (!site) redirect("/");
  return (
    <>
      <div className="fld-head">
        <Link href="/" className="fld-back" aria-label={t.back}>‹</Link>
        <h1 className="fld-h1">{title(t)}</h1>
      </div>
      <div className="fld-card"><h2>{t.comingSoon}</h2><p className="fld-mut">{body(t)}</p></div>
    </>
  );
}
