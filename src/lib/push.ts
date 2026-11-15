import "server-only";
import webpush from "web-push";
import { createClient } from "@/lib/supabase/server";
import { FIELD_DICT, isFieldLang } from "@/lib/fieldI18n";

/**
 * PHONE NOTIFICATIONS (Web Push, 0265) — her events, 15 Nov:
 *   started, submitted → every Safety Director
 *   sent_back, signed_off → the foreman who filed it
 *
 * Standard Web Push, so the same code reaches Android (Chrome) and iPhone
 * (Safari, iOS 16.4+, once PourSafe is added to the home screen). The keys are
 * this server's own (VAPID) — set in Vercel as NEXT_PUBLIC_VAPID_PUBLIC_KEY and
 * VAPID_PRIVATE_KEY. Without them nothing is sent and nothing breaks.
 *
 * What a notification says is kept short and names no injured person: it shows
 * on a lock screen.
 */

type Supa = Awaited<ReturnType<typeof createClient>>;
export type PushEvent = "started" | "submitted" | "sent_back" | "signed_off";

export const pushReady = () => !!(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY);

let configured = false;
function configure() {
  if (configured || !pushReady()) return pushReady();
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || "https://www.poursafe.site",
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!,
  );
  configured = true;
  return true;
}

type Target = { endpoint: string; p256dh: string; auth: string; lang: string | null };

/** Send one message to each subscription, written in that phone's language. */
export async function sendTo(supabase: Supa, targets: Target[], message: (t: (typeof FIELD_DICT)["en"]) => { title: string; body: string; url: string }) {
  if (!configure() || !targets.length) return;
  await Promise.all(targets.map(async (s) => {
    const t = FIELD_DICT[isFieldLang(s.lang) ? s.lang : "en"];
    try {
      await webpush.sendNotification(
        { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
        JSON.stringify(message(t)),
        { TTL: 60 * 60 * 24 },
      );
    } catch (e) {
      // 404 / 410: the phone turned it off or the app was removed — forget it.
      const code = (e as { statusCode?: number }).statusCode;
      if (code === 404 || code === 410) await supabase.rpc("field_push_forget", { p_endpoint: s.endpoint });
    }
  }));
}

/** Tell the right people about this report. Never throws — a notification is never worth failing a save over. */
export async function notify(supabase: Supa, accidentId: string, event: PushEvent) {
  try {
    if (!pushReady()) return;
    const { data: targets } = await supabase.rpc("field_push_targets", { p_accident: accidentId, p_event: event });
    if (!targets?.length) return;
    const { data: a } = await supabase.from("accidents")
      .select("case_no, supervisor_name, project_id").eq("id", accidentId).maybeSingle();
    let job = "";
    if (a?.project_id) {
      const { data: jobs } = await supabase.rpc("field_job_names");
      job = ((jobs ?? []) as { id: string; name: string }[]).find((j) => j.id === a.project_id)?.name ?? "";
    }
    const who = (a?.supervisor_name ?? "").split(" ")[0] || "A foreman";
    const caseNo = a?.case_no ?? "A report";
    await sendTo(supabase, targets as Target[], (t) => ({
      title: "PourSafe",
      body: event === "started" ? t.pushStarted(who, job)
        : event === "submitted" ? t.pushSubmitted(who, job)
        : event === "sent_back" ? t.pushSentBack(caseNo)
        : t.pushSignedOff(caseNo),
      url: event === "started" || event === "submitted" ? `/review/${accidentId}` : `/accidents/${accidentId}`,
    }));
  } catch {
    /* never fail the save */
  }
}
