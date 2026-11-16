import { Soon } from "../Soon";

/** DAILY FORMS — the section exists; the forms are designed next (her call, 15 Nov). */
export default function DailyForms() {
  return <Soon title={(t) => t.secForms} body={(t) => t.formsSoon} />;
}
