import type { FormDef, Item } from "./types";

const yna = (no: string, label: string): Item => ({ kind: "yna", id: no, no, label });

/** [CSM] Concrete Pre Pour - Grout Update R2 — "Inspection: RCS Concrete Pre-Pour", all 8 sections. */
export const PRE_POUR: FormDef = {
  key: "pre_pour",
  title: "Inspection: RCS Concrete Pre-Pour",
  short: "Concrete Pre-Pour",
  attest: "I have completed this Concrete Pre-Pour inspection and its answers are true to the best of my knowledge.",
  sections: [
    { id: "loc", title: "Location of Inspection", items: [
      { kind: "long", id: "area", label: "Describe the area being poured today:" },
    ] },
    { id: "s1", title: "Planning", items: [
      yna("1.1", "Are shoring/reshoring drawings for applicable work signed, sealed & available on site?"),
      yna("1.2", "Have you reviewed the formwork drawings for areas being poured?"),
      yna("1.3", "Has survey been confirmed, agreed on and accepted for axis lines and 0,0 points?"),
      yna("1.4", "Have all elevations been confirmed to comply with approved contract documents, plans and specs?"),
      yna("1.5", "Is concrete washout procedure created and in place?"),
      yna("1.6", "Are all embeds delivered and installed in the correct locations per drawings?"),
      yna("1.7", "Have all stair opening locations been confirmed?"),
      yna("1.8", "Are all slab depressions, openings and concrete voids properly located?"),
      yna("1.9", "Are tower crane inserts installed per approved shop drawings, plans and specs?"),
      yna("1.10", "Have lighting arrangements been made?"),
      yna("1.11", "Is / was an electrician present during pour to protect conduits?"),
      yna("1.12", "Is / was a plumber present during pour to protect sleeves?"),
      { kind: "checks", id: "1.13", no: "1.13", label: "Placement Method (check all that apply)", other: true,
        options: ["Concrete Pump Truck", "Concrete Placing Boom", "Line Pump", "Pump Buckets", "Tail End / Buggy"] },
      { kind: "checks", id: "1.14", no: "1.14", label: "Concrete Finish Type (circle all that apply)", other: true,
        options: ["Float Finish", "Broom Finish", "None"] },
      yna("1.15", "Have all plant tickets for each truck / concrete load been provided to CCE?"),
      { kind: "text", id: "1.16", no: "1.16", label: "Enter concrete pour rate from approved drawings" },
    ] },
    { id: "s2", title: "Forms", items: [
      yna("2.1", "Is the formwork erected in accordance with the approved drawings?"),
      yna("2.2", "Has the formwork been inspected periodically for signs of distressed formwork during concrete pour?"),
      yna("2.3", "Is an experienced supervisor available at site during formwork installation and concrete placement? Formwork inspectors are required to sign this inspection report below."),
      yna("2.4", "Are forms in proper location (grade & alignment?)"),
      yna("2.5", "Have forms been braced and installed in accordance with any accepted shop plans?"),
      yna("2.6", "Have all form cracks been sealed?"),
      yna("2.7", "Are forms clean and free of debris (dirt, wood chips, trash, etc.?)"),
      yna("2.8", "Is formwork restrained from movement in all directions?"),
      yna("2.9", "Is formwork correctly aligned & leveled?"),
      yna("2.10", "Are all the props plum, and at the right spacing?"),
      yna("2.11", "Are bolts & wedges secure against any possible loosening?"),
      yna("2.12", "Has the correct number of ties been used? Are they in the right place and properly tightened?"),
      yna("2.13", "Are all inserts and cast-in place fixings in the right position and secure?"),
      yna("2.14", "Have all stop ends been properly secured?"),
      yna("2.15", "Have all joints been sealed to stop concrete loss (especially where the formwork is against the kicker?)"),
      yna("2.16", "Have any and all construction / cold joint locations been located?"),
      yna("2.17", "Can the formwork be struck without damaging the concrete?"),
      yna("2.18", "Has the release agent been applied is it the correct one?"),
      yna("2.19", "Are all projecting bars straight and correctly positioned?"),
      yna("2.20", "Is there proper access for placing the concrete and compacting?"),
      yna("2.21", "Have all the toe-boards and guard rails been provided?"),
      yna("2.22", "Verify walers, strongbacks, form aligner, tie rod, sleepers, etc. are in accordance with formwork drawings (spacing & anchorage.)"),
      yna("2.23", "Verify alignment, camber, level, and plumb (vertically) is maintained during concrete pour"),
      yna("2.24", "Has mold oil been applied evenly and thoroughly to forms?"),
      yna("2.25", "Are the forms clean and free from rubbish such as tie wire cuttings, and odd bits of timber or metal?"),
      yna("2.26", "Has extra reinforcing been placed round penetration?"),
      { kind: "long", id: "2.27", no: "2.27", label: "Comments regarding forms:" },
    ] },
    { id: "s3", title: "Reinforcing Steel", items: [
      yna("3.1", "Has reinforcing steel been sampled and approved? (DO NOT allow pour until rebar approval is received?)"),
      yna("3.2", "Is all reinforcing steel clean (free of rust scale, pitting, no cracks in bends, breaks in epoxy or galvanized coatings?)"),
      yna("3.3", "Has the reinforcing steel been placed as per plans (size and location?)"),
      yna("3.4", "Is there proper clearance between reinforcing steel and forms? Does all the reinforcing steel meet the specified cover?"),
      yna("3.5", "Has reinforcing steel been tied and supported (chairs) as per plans?"),
      yna("3.6", "Are rebar chairs installed and proper height?"),
      yna("3.7", "Have dowels / stub ups for shear walls and columns been confirmed?"),
      { kind: "long", id: "3.8", no: "3.8", label: "Comments regarding Reinforcing Steel:" },
    ] },
    { id: "s4", title: "Deck Shoring", items: [
      yna("4.1", "Have shoring posts been located and installed in accordance with the signed and sealed drawing set?"),
      yna("4.2", "Are shoring posts sized (correct model number) and braced in accordance with the signed and sealed drawings?"),
      yna("4.3", "Are girders and joists sized (correct model/correct materials, weight and dimensions) in accordance with signed and sealed drawings set?"),
      yna("4.4", "Are all connections secure, tight and installed in accordance with signed and sealed drawings set?"),
      yna("4.5", "Are there any outstanding issues which need to be addressed prior to loading the system?"),
      { kind: "long", id: "4.6", no: "4.6", label: "Comments regarding deck shoring:" },
    ] },
    { id: "s5", title: "Blind-Sided Formwork", items: [
      yna("5.1", "Has proper lap between stay-form been followed? Has rebar tire wire been installed correctly?"),
      yna("5.2", "Verify vertical rebar spacing for blindside wall support is in accordance with formwork drawings."),
      yna("5.3", "Verify blind-side loop ties spacing is in accordance with formwork drawings."),
      yna("5.4", "Verify blind-side loop ties are secured to panels with wedge bolts."),
      { kind: "long", id: "5.5", no: "5.5", label: "Comments regarding blind-sided formwork:" },
    ] },
    { id: "s6", title: "Concrete", items: [
      yna("6.1", "Is the DOB stamped TR3 on site?"),
      { kind: "text", id: "6.2", no: "6.2", label: "Identify the correct design mix:" },
      yna("6.3", "Is the correct design mix being delivered to the site?"),
      yna("6.4", "Have the concrete curing boxes been turned on and has it been verified that they are in good working order?"),
      yna("6.5", "Are adequate curing and concrete protection materials on hand and placed ASAP (wet mats such as burlene, insulated blankets, external heaters with tarps, ice, etc.)?"),
      yna("6.6", "Has slump and air test been performed on each truck and have test cylinders been made?"),
      yna("6.7", "Is the concrete being vibrated properly? DO NOT use vibrator to move concrete from one place to another."),
      yna("6.8", "Has the hot or cold weather concrete batching and placement plans been accepted?"),
      yna("6.9", "Is the concrete temperature being monitored?"),
      { kind: "long", id: "6.10", no: "6.10", label: "Comments regarding concrete:" },
    ] },
    { id: "s7", title: "Grout", items: [
      yna("7.1", "Was grout delivered to site?"),
      { kind: "text", id: "7.2", no: "7.2", label: "If yes, what quantity was delivered?" },
      { kind: "long", id: "7.3", no: "7.3", label: "What is the procedure for disposing of the grout after it is used to lubricated the pump lines?" },
      { kind: "text", id: "7.4", no: "7.4", label: "What is the total capacity of the grout discharge boxes?" },
      { kind: "text", id: "7.5", no: "7.5", label: "Who is responsible for verifying that the grout is fully discharged from the line, and that the design concrete mix specified is not contaminated before concrete is discharged into the structure?" },
      { kind: "long", id: "7.6", no: "7.6", label: "Comments regarding grout:" },
    ] },
    { id: "s8", title: "Concrete Post Pour Inspection", items: [
      yna("8.1", "Are cold weather methods and procedures established and being adhered to?"),
      yna("8.2", "Has all vertical protection of slab edges and openings been fully installed? Has all other necessary protection been installed?"),
      yna("8.3", "Has the floor been stripped after proper cure time?"),
      yna("8.4", "Is concrete free of honeycombs, spalding cracks, etc?"),
      yna("8.5", "Has the elevation been surveyed?"),
      yna("8.6", "Is the bottom of slab elevation correct?"),
      yna("8.7", "Is structural remediation required?"),
      yna("8.8", "Is touch up required to complete work?"),
      yna("8.9", "Have re-shores been placed with proper spacing?"),
      { kind: "checks", id: "8.10", no: "8.10", label: "Has concrete been surveyed for: (check all that apply)",
        options: ["Elevations", "Levelness", "Deflections", "Slab Edge Tolerances"] },
    ] },
    { id: "sig", title: "Signature of Formwork Inspector", items: [
      { kind: "person", id: "formwork_inspector", label: "Formwork Inspector — Print Name" },
    ] },
  ],
};

/** [CSM] High Wind Action Plan — "High Wind Preparedness Plan / Site Shutdown Plan" (DOB Bulletin 2015-029). */
export const HIGH_WIND: FormDef = {
  key: "high_wind",
  title: "High Wind Preparedness Plan / Site Shutdown Plan",
  short: "High Wind Action Plan",
  attest: "I have verified that floors under RCS Possession have been secured for all items listed above as detailed per plan.",
  sections: [
    { id: "plan", title: "The plan (Ref: DOB Bulletin 2015-029)",
      note: "On the floors that are still under RC Structures control and not yet turned over to the GC, the following steps will be taken to ensure the safety of workers, the public, and/or damage of property in the event of high winds.",
      items: [
        { kind: "info", id: "p1", label: "1) All materials will be moved inward away from slab edge 10’ and covered with netting or tarps and secured. Materials will be removed from setbacks and loading platforms." },
        { kind: "info", id: "p2", label: "2) Material and debris will be banded and tied down." },
        { kind: "info", id: "p3", label: "3) Rebar cover boxes will be tied down with tie wire or bands. Individual rebar caps will be replaced with rebar cover boxes." },
        { kind: "info", id: "p4", label: "4) Hole-covers on floors that have not been released to GC will be fastened and secured by RC Structures personnel." },
        { kind: "info", id: "p5", label: "5) Horizontal netting will be cleaned of debris, pulled in, and secured." },
        { kind: "info", id: "p6", label: "6) Building deck, girders, and lumber within 10’ of perimeter will be nailed, banded, tie wired or secured by any method that would secure it to the formwork support system to prevent deck uplift. Plywood deck can be secured by weighing it down with the slab rebar installation or tie down plywood with band straps if rebar is not installed. Alternative option is to remove the plywood sheets along building perimeter." },
        { kind: "info", id: "p7", label: "7) An inspection of all reshores within 10’ of building perimeter will be made to ensure that they have been tied back and secured." },
        { kind: "info", id: "p8", label: "8) Vertical netting will be inspected to verify it is installed per P.E. details and no tears in the nets are present on floors not released to GC. The bottom cable will be secured tight to slab with no gap permitted. Sag cable ties on vertical nets if called out on P.E. details for storm condition." },
        { kind: "info", id: "p9", label: "Tower Crane: When winds exceed 30 MPH, crane is to be taken out of service and allowed to weathervane. See DOB approved crane drawings for further details." },
        { kind: "info", id: "p10", label: "Mobile Crane: Review approved crane drawings for max allowable working wind speed for crane configuration. When winds exceed 30 MPH, crane must be taken out of service. Refer to approved drawings for drawings for stowage/parking." },
        { kind: "info", id: "p11", label: "Concrete Placing Boom: When winds exceed 30 MPH, concrete placing boom is to be taken out of service & stored into its out of service position." },
        { kind: "info", id: "p12", label: "Cocoon/Climbing Formwork: During high wind conditions, additional bracing will be added to the cocoon panels and climbing formwork as shown in the DOB Filed drawings. A competent person will install & inspect the bracing. RC Structures competent persons are identified in RCS- Competent Persons letter." },
      ] },
    { id: "floors", title: "Floors", items: [
      { kind: "text", id: "floors_rcs", label: "Floors in RCS Possession:" },
      { kind: "text", id: "floors_gc", label: "Floors turned over to GC:" },
    ] },
    { id: "secured", title: "The following areas have been secured as per high wind preparedness plan / site shutdown plan:", items: [
      { kind: "checks", id: "secured", label: "Secured",
        options: ["All material cleared within 10’ from slab edge perimeter each floor", "Material & Debris tied down", "Secure Rebar Covers",
          "Secure Hole-Covers", "Secure Horizontal Nets", "Secure Placing Boom (If Applicable)", "Secure Building Deck", "Secure Reshores",
          "Secure Vertical Nets", "Crane Stowage", "Secure Cocoon and/or Climbing Formwork (If Applicable)"] },
    ] },
    { id: "more", title: "Additional Concrete Safety Managers", note: "The form has room for three signatures; the second and third sign on paper or are named here.", items: [
      { kind: "person", id: "csm2", label: "Concrete Safety Manager — Print Name" },
      { kind: "person", id: "csm3", label: "Concrete Safety Manager — Print Name" },
    ] },
    { id: "ert", title: "Emergency Response Team (After Hours)", items: [
      { kind: "rows", id: "ert", label: "Emergency Response Team", rowLabel: "Member", addLabel: "Add a team member",
        fields: [{ kind: "text", id: "name", label: "Name" }, { kind: "text", id: "phone", label: "Phone Number" }] },
    ] },
  ],
};

/** Vertical Netting Log — one row per floor level. */
export const VERTICAL_NETTING: FormDef = {
  key: "vertical_netting",
  title: "Vertical Netting Log",
  short: "Vertical Netting Log",
  attest: "I have inspected the vertical netting listed above and recorded what I found.",
  sections: [
    { id: "floors", title: "Vertical Netting Log",
      note: "*Note- RC Structures is not responsible for Maintenance & Inspections of Vertical Net Installations on floors signed over to GC.",
      items: [
        { kind: "rows", id: "floors", label: "Floors", rowLabel: "Floor level", addLabel: "Add a floor",
          fields: [
            { kind: "text", id: "floor", label: "FLOOR LEVEL:" },
            { kind: "net", id: "installed", label: "Installed Per P.E. Dwgs" },
            { kind: "net", id: "damaged", label: "Damaged Netting" },
          ] },
      ] },
  ],
};

const sides: [string, string, string[]][] = [
  ["north", "North Property Line Nets", ["West", "Mid Portion", "East"]],
  ["east", "East Property Line Nets", ["North", "Mid Portion", "South"]],
  ["south", "South Property Line Nets", ["East", "Mid Portion", "West"]],
  ["west", "West Elevation Property Line Nets", ["South", "Mid Portion", "North"]],
];

/** [HN] Horizontal Netting Log — four elevations, three positions each. */
export const HORIZONTAL_NETTING: FormDef = {
  key: "horizontal_netting",
  title: "Horizontal Netting Log",
  short: "Horizontal Netting Log",
  attest: "I have inspected the horizontal netting listed above and recorded what I found.",
  sections: [
    { id: "floor", title: "Horizontal Netting Log", items: [
      { kind: "text", id: "floor", label: "Horizontal Nets Installed on Floor:" },
    ] },
    ...sides.map(([k, title, spots]) => ({
      id: k, title,
      items: spots.flatMap((spot): Item[] => {
        const s = spot.toLowerCase().replace(/\s+/g, "_");
        return [
          { kind: "net", id: `${k}.${s}.debris`, label: `${spot} — Clear of Debris`, group: spot },
          { kind: "net", id: `${k}.${s}.liners`, label: `${spot} — Damaged Liners`, group: spot },
        ];
      }),
    })),
  ],
};
