import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { session } from "@/lib/session";
import { fieldDict } from "@/lib/fieldLang";

/**
 * The field app's home: one tile per section. Accident reports are first;
 * the next sections slot in as more tiles here, each behind its own grant.
 */
export default async function FieldHome() {
  const { user } = await session();
  const supabase = await createClient();
  const [{ t }, { data: director }, { count: mineOpen }, { count: sentBack }, { count: waiting }] = await Promise.all([
    fieldDict(),
    supabase.rpc("is_safety_director"),
    supabase.from("accidents").select("id", { count: "exact", head: true })
      .eq("reported_by", user!.id).in("field_status", ["draft", "returned"]),
    supabase.from("accidents").select("id", { count: "exact", head: true })
      .eq("reported_by", user!.id).eq("field_status", "returned"),
    supabase.from("accidents").select("id", { count: "exact", head: true }).eq("field_status", "submitted"),
  ]);

  return (
    <>
      <h1 className="fld-h1">{t.homeTitle}</h1>
      <div className="fld-tiles">
        <Link href="/accidents/new" className="fld-tile fld-tile-urgent">
          <span className="fld-tile-ic" aria-hidden>✚</span>
          <b>{t.reportAccident}</b>
          <small>{t.reportAccidentSub}</small>
        </Link>
        <Link href="/accidents" className="fld-tile">
          <span className="fld-tile-ic" aria-hidden>📋</span>
          <b>{t.myReports}</b>
          <small>
            {mineOpen ? t.stillCollecting(mineOpen) : t.nothingOpen}
            {sentBack ? ` · ${t.sentBackCount(sentBack)}` : ""}
          </small>
          {!!sentBack && <i className="fld-badge">{sentBack}</i>}
        </Link>
        {director === true && (
          <Link href="/review" className="fld-tile">
            <span className="fld-tile-ic" aria-hidden>✔</span>
            <b>{t.reviewReports}</b>
            <small>{waiting ? t.waitingForYou(waiting) : t.nothingWaiting}</small>
            {!!waiting && <i className="fld-badge">{waiting}</i>}
          </Link>
        )}
      </div>
    </>
  );
}
