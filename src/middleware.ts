import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  // Everything but static files: the brand pack, fonts and icons are public.
  // So are the notification worker and the install manifest — a phone fetches
  // them on its own, and a worker script that redirects to sign-in won't load.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|sw\\.js|manifest\\.webmanifest|poursafe/|fonts/|pdfjs/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|ttf|txt)$).*)"],
};
