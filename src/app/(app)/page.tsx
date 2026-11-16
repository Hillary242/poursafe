import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { session } from "@/lib/session";
import { fieldDict } from "@/lib/fieldLang";
import { fieldJobs } from "@/lib/fieldJobs";
import { currentSite, pickableSites } from "@/lib/site";

/**
 * HOME — the Concrete Safety Manager's version (her design, 15 Nov): the site
 * at the top, then the three sections, all for that site. The Safety
 * Director's own version comes next; until then a Safety Director also gets
 * the Review tile underneath, so reviewing keeps working.
 */
export default async function FieldHome() {
  const { user } = await session();
  const supabase = await createClient();
  const [{ t }, { data: director }, jobs] = await Promise.all([
    fieldDict(), supabase.rpc("is_safety_director"), fieldJobs(supabase, user!.id),
  ]);
  const sites = pickableSites(jobs);
  const site = await currentSite(jobs);

  const [{ count: open }, { count: sentBack }, { count: waiting }, { count: drawings }] = await Promise.all([
    site ? supabase.from("accidents").select("id", { count: "exact", head: true })
      .eq("reported_by", user!.id).eq("project_id", site.id).in("field_status", ["draft", "returned"])
      : Promise.resolve({ count: 0 }),
    site ? supabase.from("accidents").select("id", { count: "exact", head: true })
      .eq("reported_by", user!.id).eq("project_id", site.id).eq("field_status", "returned")
      : Promise.resolve({ count: 0 }),
    director === true
      ? supabase.from("accidents").select("id", { count: "exact", head: true }).eq("field_status", "submitted")
      : Promise.resolve({ count: 0 }),
    site ? supabase.from("poursafe_drawings").select("id", { count: "exact", head: true })
      .eq("project_id", site.id).is("replaced_by", null).is("retired_at", null)
      : Promise.resolve({ count: 0 }),
  ]);

  return (
    <>
      {/* The site is picked in the header (15 Nov). */}
      {sites.length === 0 ? (
        <div className="fld-card"><h2>{t.notOnJobsTitle}</h2><p className="fld-mut">{t.notOnJobsBody}</p></div>
      ) : !site && (
        <div className="fld-card fld-pick-first">↑ {t.pickSiteFirst}</div>
      )}

      {site && (
        <div className="fld-tiles">
          <Link href="/accidents" className="fld-tile fld-tile-urgent">
            <span className="fld-tile-ic" aria-hidden>✚</span>
            <b>{t.secIncidents}</b>
            <small>
              {open ? t.stillCollecting(open) : t.secIncidentsSub}
              {sentBack ? ` · ${t.sentBackCount(sentBack)}` : ""}
            </small>
            {!!sentBack && <i className="fld-badge">{sentBack}</i>}
          </Link>
          <Link href="/forms" className="fld-tile">
            <span className="fld-tile-ic" aria-hidden>📝</span>
            <b>{t.secForms}</b>
            <small>{t.comingSoon}</small>
          </Link>
          <Link href="/drawings" className="fld-tile">
            <span className="fld-tile-ic" aria-hidden>📐</span>
            <b>{t.secDrawings}</b>
            <small>{drawings ? t.drawingsCount(drawings) : t.drawingsNoneShort}</small>
          </Link>
        </div>
      )}

      {director === true && (
        <>
          <h2 className="fld-h2 fld-home-dir">{t.directorTools}</h2>
          <div className="fld-tiles">
            <Link href="/review" className="fld-tile">
              <span className="fld-tile-ic" aria-hidden>✔</span>
              <b>{t.reviewReports}</b>
              <small>{waiting ? t.waitingForYou(waiting) : t.nothingWaiting}</small>
              {!!waiting && <i className="fld-badge">{waiting}</i>}
            </Link>
          </div>
        </>
      )}
    </>
  );
}
