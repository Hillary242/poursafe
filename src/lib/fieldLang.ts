import { cookies, headers } from "next/headers";
import { FIELD_DICT, FIELD_LANG_COOKIE, isFieldLang, type FieldLang } from "@/lib/fieldI18n";

/**
 * The field app's language for this request: the switch's cookie if set,
 * otherwise the phone's own language (Spanish or Portuguese phones start in
 * their language), otherwise English.
 */
export async function fieldLang(): Promise<FieldLang> {
  const c = (await cookies()).get(FIELD_LANG_COOKIE)?.value;
  if (isFieldLang(c)) return c;
  const al = ((await headers()).get("accept-language") ?? "").toLowerCase();
  const first = al.split(",")[0]?.trim().slice(0, 2);
  return first === "es" || first === "pt" ? first : "en";
}

export async function fieldDict() {
  const lang = await fieldLang();
  return { lang, t: FIELD_DICT[lang] };
}
