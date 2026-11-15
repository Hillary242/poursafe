"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

/**
 * LIVE: redraw this report when anyone changes it — a photo the foreman adds
 * appears on the Safety Director's phone without reopening the report (first
 * field test, 15 Nov).
 *
 * Realtime (0265 publishes accidents, accident_witnesses and accident_files),
 * filtered to this one report; RLS applies to each change exactly as to a
 * query. The socket carries the signed-in user's token — without setAuth it
 * hears nothing and says nothing (the office app learned that the hard way).
 *
 * Belt and braces: a phone that was asleep, or a socket that dropped, catches
 * up when the page is looked at again, and every 30 seconds while it is open.
 */
export function useLiveReport(accidentId: string) {
  const router = useRouter();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const supabase = createClient();
    let channel: ReturnType<typeof supabase.channel> | null = null;
    let cancelled = false;
    const refresh = () => {
      if (timer.current) clearTimeout(timer.current);
      // One save can touch several rows: collapse them into one redraw.
      timer.current = setTimeout(() => { if (document.visibilityState === "visible") router.refresh(); }, 600);
    };

    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (cancelled) return;
      if (session?.access_token) supabase.realtime.setAuth(session.access_token);
      channel = supabase.channel(`report:${accidentId}`)
        .on("postgres_changes", { event: "*", schema: "public", table: "accidents", filter: `id=eq.${accidentId}` }, refresh)
        .on("postgres_changes", { event: "*", schema: "public", table: "accident_witnesses", filter: `accident_id=eq.${accidentId}` }, refresh)
        .on("postgres_changes", { event: "*", schema: "public", table: "accident_files", filter: `accident_id=eq.${accidentId}` }, refresh)
        .subscribe((s, err) => { if (s === "CHANNEL_ERROR" || s === "TIMED_OUT") console.warn("[live]", s, err?.message ?? ""); });
    })();

    const onVisible = () => { if (document.visibilityState === "visible") router.refresh(); };
    document.addEventListener("visibilitychange", onVisible);
    const poll = setInterval(() => { if (document.visibilityState === "visible") router.refresh(); }, 30_000);

    return () => {
      cancelled = true;
      if (timer.current) clearTimeout(timer.current);
      document.removeEventListener("visibilitychange", onVisible);
      clearInterval(poll);
      if (channel) supabase.removeChannel(channel);
    };
  }, [accidentId, router]);
}
