import type { FormDef } from "./types";

/**
 * [CSM] Concrete Safety Manager Daily Log — "Daily Log: Concrete Safety
 * Manager Daily General Operations Checklist", all 16 sections, in the
 * paper form's order and wording (the code section is kept for the PDF).
 *
 * The page "Initials" boxes are not asked: the sign-off at the end covers
 * the whole log.
 */
export const DAILY_LOG: FormDef = {
  key: "daily_log",
  title: "Daily Log: Concrete Safety Manager Daily General Operations Checklist",
  short: "CSM Daily Log",
  oncePerDay: true,
  attest: "I have completed this Concrete Safety Manager Daily Log and its answers are true to the best of my knowledge.",
  sections: [
    {
      id: "h", title: "Daily Log",
      note: "All inspections are to be performed by a competent individual with relevant experience designated by the concrete contractor, except as where otherwise noted.",
      items: [
        { kind: "number", id: "stories", label: "Number of Stories:" },
        { kind: "text", id: "weather", label: "Weather & Temperature:" },
        { kind: "text", id: "csm_name", label: "CSM Name:" },
        { kind: "text", id: "csm_reg", label: "Registration Number:" },
        { kind: "text", id: "wind", label: "Windspeed:" },
        { kind: "text", id: "floors_gc", label: "Floors Signed Over to GC:" },
        { kind: "text", id: "floors_rcs", label: "Floors Under RCS Control:" },
        { kind: "text", id: "competent", label: "Name of RCS Competent Person on Site:" },
      ],
    },
    {
      id: "s1", title: "1 General Tasks", items: [
        { kind: "yna", id: "1.1", no: "1.1", code: "3310.9", label: "Photograph the installation of all D-Rings. Submit photos to Office. Inspect all D-Rings under RCS control daily and complete inspection log. Has the daily inspection been completed and logged?", help: "Verify embedded fall-arresting systems have been inspected as it relates to use for concrete installation; shop drawings, Contractor Maintenance Log" },
        { kind: "info", id: "1.2", no: "1.2", label: "Maintain a concrete safety logbook which lists activities that shall be conducted in coordination with the Site Safety Manager or Coordinator", note: "Complete and sign this log. Submit to main office. Print and store this log in CSM binder." },
        { kind: "yna", id: "1.3", no: "1.3", code: "3310.9", label: "Has adequate lighting been provided by the GC? If not, request same via written communication to the GC, Site Safety Manager, and Project Management. Indicate below if such a request has been made.", help: "Adequate lighting" },
        { kind: "yna", id: "1.4", no: "1.4", code: "3310.9", label: "For operations such where air flow is restricted (such as those occurring in a confined space) has adequate ventilation been provided?", help: "Adequate ventilation" },
        { kind: "yna", id: "1.5", no: "1.5", code: "3303.4", label: "On floors under RCS control, is housekeeping up to date?", help: "Housekeeping" },
        { kind: "yna", id: "1.6", no: "1.6", code: "BB2013-011", label: "If a high winds are forecasted (or a prolonged site shutdown is scheduled) was a high wind action plan completed?", help: "Pre-Storm planning, high winds" },
        { kind: "yna", id: "1.7", no: "1.7", code: "3303.15", label: "If today's activity includes a concrete pour, verify that concrete washout bins are on site and adequate to the collect concrete washout water.", help: "Concrete washout water, collection, containment, disposal" },
        { kind: "info", id: "1.8", no: "1.8", label: "Underpinning sequence/detail drawings on site", note: "N/A to RCS Scope" },
      ],
    },
    {
      id: "s2", title: "2 Site Safety Provisions", items: [
        { kind: "yna", id: "2.1", no: "2.1", code: "3308", label: "Have the required fall protection systems been properly installed, inspected, and maintained?", help: "Monitor required fall protection systems are in place" },
        { kind: "yna", id: "2.2", no: "2.2", code: "3310.9", label: "Have you walked the site and monitored that workers have been provided with adequate fall protection systems, are trained in their proper use, and are using them correctly.", help: "Monitor workers using required fall protection systems" },
        { kind: "yna", id: "2.3", no: "2.3", code: "3316", label: "Has the lift director completed their daily log?", help: "Monitor hoisting and rigging operations performed in a safe manner" },
        { kind: "yna", id: "2.4", no: "2.4", code: "3305.3.6.2.1", label: "Have extra shores been set aside for emergency use?", help: "Extra shores or other material and equipment are available in the event of an emergency" },
        { kind: "yna", id: "2.5", no: "2.5", code: "3305.3.6.2.3", label: "Is RCS building material is properly piled, tied/contained at least 10' back from the perimeter of the building.", help: "Building materials properly piled and tied or contained" },
        { kind: "yna", id: "2.6a", no: "2.6", code: "3310.9", label: "Is at least one permanent stair installed within a distance of 40' or 4 floors below the working deck?", help: "Emergency egress maintained" },
        { kind: "yna", id: "2.6b", label: "Are two means of egress from working deck (ladders, external stair tower, pre-cast stairs) maintained from working deck to first available permanent stair?" },
        { kind: "yna", id: "2.7", no: "2.7", code: "3303.6", label: "If heating operations are taking place, is a proper means of escape and fire watch being provided?", help: "Escape hatches" },
        { kind: "yna", id: "2.8", no: "2.8", code: "3310.9", label: "Have handrails, mid-rails, and kickboards been installed and maintained?", help: "Handrails, mid-rails and kickboards in place and secure" },
        { kind: "yna", id: "2.9", no: "2.9", code: "3310.9", label: "Has a CAZ has been established at all stripping and formwork erection areas?", help: "Formwork erection and stripping signage clearly displayed" },
        { kind: "yna", id: "2.10", no: "2.10", code: "3310.9", label: "Have rebar caps been installed at vertical rebar that presents a risk of impalement?", help: "Rebar ends capped to prevent impaling." },
      ],
    },
    {
      id: "s3", title: "3 Installation of Formwork", items: [
        { kind: "yna", id: "3.1", no: "3.1–3.2", code: "3305.3.1.5; 3305.3.2.1", label: "Are signed and sealed design drawings available on site and in use?", help: "Verify formwork drawings are available, including shores, re-shores, foundations; verify formwork drawings are signed and sealed when required by Code" },
        { kind: "yna", id: "3.3", no: "3.3", code: "3305.3.1.2.1", label: "If applicable, the adjacent structure has been inspected and evaluated by a registered design professional for use as a form and signed and sealed design drawings are available and in use.", help: "Verify existing structure adjacent to concrete placement has been inspected and evaluated by a registered design professional prior to use as a form; design drawings prepared" },
        { kind: "yna", id: "3.4", no: "3.4", code: "3305.3.3.1", label: "Has the formwork and shoring been inspected by a competent person?", help: "Verify formwork inspected by a Competent Person and shores are installed as per shop drawings" },
        { kind: "text", id: "3.4_name", label: "Provide the name of the formwork inspector:" },
        { kind: "yna", id: "3.5", no: "3.5", code: "3305.3.3.2; 3305.3.3.2.1", label: "Have you confirmed that the formwork configuration on the next floor is typical?", help: "To be conducted at start of project and every time formwork configuration changes from typical." },
        { kind: "text", id: "3.5_next", label: "If not typical, when is the next inspection scheduled?" },
        { kind: "yna", id: "3.6", no: "3.6", code: "3305.3.3.2.2", label: "Have any observed formwork discrepancies been resolved prior to concrete placement?", help: "Verify any formwork discrepancies have been resolved" },
        { kind: "yna", id: "3.7", no: "3.7", code: "3305.3.4.4", label: "Are all activities on the job site taking place safely? If no, document conditions and corrective measures below.", help: "Unsafe conditions; notify contractor; contact DOB if required" },
        { kind: "yna", id: "3.8", no: "3.8", label: "Are guardrail systems installed at leading edge on working deck?", help: "Monitor the required guardrail systems are in place on the forming and placement floors" },
        { kind: "yna", id: "3.9", no: "3.9", code: "3305.3.1.4", label: "Ramps, runways and platforms comply with code and have been designed by a qualified person when buggies are used.", help: "Ramps, runways and platforms comply with 3315. Designed by qualified person when buggies used" },
        { kind: "yna", id: "3.10", no: "3.10", code: "RCNY 3310-02. e, 9.", label: "Have you, as CSM, inspected the formwork?", help: "Inspection of concrete formwork by Concrete Safety Manager" },
      ],
    },
    {
      id: "s4", title: "4 Placement of Reinforcement", items: [
        { kind: "yna", id: "4.1", no: "4.1", code: "3310.9.1", label: "Are approved rebar shop drawings available and in use?", help: "Verify required shop drawings are available on site" },
        { kind: "yna", id: "4.2", no: "4.2–4.3", code: "3310.9.1", label: "Have you conducted a daily pre-shift meeting regarding rebar operations, and have you walked the site on an on-going basis and have made sure that all employees engaged in rebar operations are doing so safely? If no, document conditions and corrective measures below. Any accidents are to be recorded below.", help: "Monitor that the workers performing reinforcement bending, cutting, welding and reinforcement placement operations on the working deck are working in a safe manner" },
        { kind: "yna", id: "4.4a", no: "4.4", code: "1907.5", label: "Was the rebar inspector present for quality control inspections?", help: "Verify concrete special inspector inspected and signed-off on final reinforcement placement" },
        { kind: "yna", id: "4.4b", label: "If yes, did the rebar pass inspection? (Select N/A if the inspection is ongoing.)" },
      ],
    },
    {
      id: "s5", title: "5 Placement of Concrete", note: "Complete this section if concrete was poured today. If no concrete was poured, select \"N/A\"", items: [
        { kind: "number", id: "5.1_yards", no: "5.1", label: "How many yards of concrete were placed today?", unit: "CY" },
        { kind: "yna", id: "5.1", code: "3310.9.1", label: "Was a concrete special inspector present for concrete placement?", help: "Verify concrete special inspector is present for concrete placement." },
        { kind: "yna", id: "5.2", no: "5.2", code: "3310.9.1", label: "Was a DOB Licensed testing lab was present and collecting samples for duration of the pour?", help: "Verify DOB licensed concrete testing lab is present to sample and test." },
        { kind: "yna", id: "5.3.1", no: "5.3.1", code: "3310.9.1", label: "Was a pre-planning meeting for concrete pumping operations held prior to concrete operations?", help: "Pumping operations. Verify pump operator and placement crew have participated in a preplanning meeting for pumping operations." },
        { kind: "yna", id: "5.3.2.1", no: "5.3.2.1", code: "3310.9.1", label: "Were grout discharge boxes with the capacity to receive 100% of the grout delivered to the site on site and in use?", help: "For concrete pumping operations which involve lubricating grout (e.g. concrete pumped though a placement boom)." },
        { kind: "yna", id: "5.3.2.2", no: "5.3.2.2", code: "3310.9.1", label: "Was the special inspector provided sufficient notice?" },
        { kind: "yna", id: "5.3.2.3", no: "5.3.2.3", code: "3310.9.1", label: "Was a concrete inspector present for quality control inspections?" },
        { kind: "yna", id: "5.3.2.4", no: "5.3.2.4", code: "3310.9.1", label: "Did the special inspector verify that the concrete exiting the hose was free from contamination and of uniform matrix of aggregate before placement?" },
        { kind: "yna", id: "5.3.3", no: "5.3.3", code: "3310.9.1", label: "Has the concrete placing equipment been inspected and the maintenance logs have been updated?" },
        { kind: "yna", id: "5.3.4", no: "5.3.4", code: "3310.9.1", label: "Have the concrete pump hoses and connections been inspected prior to placement?" },
        { kind: "yna", id: "5.3.5", no: "5.3.5", code: "3310.9.1", label: "Have you, as CSM, monitored that pumping operations are being performed in a safe manner?" },
        { kind: "yna", id: "5.4", no: "5.4", code: "3310.9.1", label: "Have the concrete buckets, hoppers, chutes, and buggies been inspected, cleaned, and confirmed to be in good working order?" },
        { kind: "yna", id: "5.5", no: "5.5", code: "3310.9.1", label: "Have you, as CSM, monitored that concrete placement operations are being performed in a safe manner?" },
        { kind: "yna", id: "5.6", no: "5.6", code: "3310.9.1", label: "Have you, as CSM, monitored that power buggies are being used in a safe manner?" },
        { kind: "yna", id: "5.7", no: "5.7", code: "3310.9.1", label: "Is the concrete formwork being inspected on a continuing basis during the concrete pour to monitor for signs of failure?" },
        { kind: "yna", id: "5.8", no: "5.8", code: "3310.9.1", label: "Are designated signalmen in place during crane operations?" },
        { kind: "yna", id: "5.9", no: "5.9", code: "1905.12", label: "Have the approved cold weather requirements been implemented?" },
        { kind: "yna", id: "5.10", no: "5.10", code: "1905.13", label: "Have the approved hot weather requirements been implemented?" },
        { kind: "yna", id: "5.11", no: "5.11", code: "3305.3.2.3", label: "Have you verified that the rate of placement has not been exceeded?" },
      ],
    },
    {
      id: "s6", title: "6 Stripping Operations", items: [
        { kind: "yna", id: "6.1", no: "6.1", code: "3310.9", label: "When the working deck is greater than (6) stories or 75' above the ground or an adjoining roof, is horizontal netting installed, at most, (2) stories or 30' below the stripping floor?", help: "Monitor that the horizontal netting conforms to Code before commencing stripping operations" },
        { kind: "yna", id: "6.2", no: "6.2", code: "3305.3.5.1", label: "Has the formwork removal procedure been reviewed with the stripping crew?" },
        { kind: "yna", id: "6.3", no: "6.3", code: "3305.3.5.1.3", label: "Have the concrete break reports be reviewed and approved to allow for reshore removal? Reshores can only be removed per the reshore schedule and not before the slab has reached an age of 28 days unless noted on P.E. stamped reshore plans" },
        { kind: "yna", id: "6.4", no: "6.4", code: "3305.3.5.5", label: "Have the structural members reached the minimum design strength to allow them to be stripped?" },
        { kind: "yna", id: "6.5", no: "6.5", code: "3305.3.5.4", label: "Are stripping procedures being performed in a safe manner?" },
        { kind: "yna", id: "6.6", no: "6.6", code: "3305.3.6.6", label: "Has debris been removed from the building as necessary?" },
        { kind: "text", id: "6.7_deck", no: "6.7", label: "Working Deck:", help: "Stripping not performed more than three stories below the story being formed" },
        { kind: "text", id: "6.7_lowest", label: "Lowest Stripping Floor:" },
        { kind: "info", id: "6.8", no: "6.8", label: "Special considerations for prestressed members", note: "N/A to RCS Scope" },
      ],
    },
    {
      id: "s7", title: "7 Reshoring Operations", items: [
        { kind: "yna", id: "7.1", no: "7.1", code: "3305.3.6.8", label: "Is a signed and sealed reshore plan available and in use on site?" },
        { kind: "yna", id: "7.2", no: "7.2", code: "3305.3.6.1.2", label: "Are reshores within 10' of the building edge secured, banded, and tied to the structure?" },
        { kind: "yna", id: "7.3", no: "7.3", code: "3305.3.6.1.3", label: "Have you verified that wedges are not being used for reshores within 10' of building edge?" },
        { kind: "yna", id: "7.4", no: "7.4", code: "3305.3.6", label: "Are reshores are installed on the correct amount of floors as required on approved reshore drawings?" },
        { kind: "yna", id: "7.5", no: "7.5", code: "3305.3.3.1", label: "Have reshores been inspected by a competent person?" },
        { kind: "yna", id: "7.6", no: "7.6", code: "3305.3.3.2", label: "Have you confirmed that the formwork configuration for the next floor to be framed is typical?" },
        { kind: "text", id: "7.6_next", label: "If not typical, when is next inspection scheduled?" },
        { kind: "yna", id: "7.7", no: "7.7", code: "3305.3.6.1.4", label: "Are reshores properly located so as to not reverse load the slab or introduce tension to the slab?" },
        { kind: "yna", id: "7.8", no: "7.8", code: "3305.3.6.1.5", label: "Are reshores perpendicular to the surface they are supporting?" },
        { kind: "yna", id: "7.9", no: "7.9", code: "3305.3.6.3", label: "Are reshores braced and plumb?" },
      ],
    },
    {
      id: "s8", title: "8 Material Handling", items: [
        { kind: "yna", id: "8.1", no: "8.1–8.2", code: "3310.9.1", label: "Has the proper handling and storage of shores, reshores, formwork, and reinforcement been observed and enforced?" },
        { kind: "yna", id: "8.3", no: "8.3", code: "3310.9.1", label: "On floors under RCS control, are materials are stored in a way to as not to overload the slab?" },
        { kind: "yna", id: "8.4", no: "8.4", code: "3310.9.1", label: "On floors under RCS control, has fall protection been returned to good working order at locations where it was temporarily removed for hoisting?" },
      ],
    },
    {
      id: "s9", title: "9 Daily Inspections Summary", items: [
        { kind: "checks", id: "9", label: "Select the inspections which were completed today.",
          options: ["Vertical Netting", "Horizontal Netting", "Fall Arrest System", "Cocoon", "PPE", "Pre-Pour/Formwork", "High Wind Action Plan/Site Shut Down Preparedness"] },
      ],
    },
    {
      id: "s10", title: "10 JSA and Toolbox Talks", items: [
        { kind: "yna", id: "10.1", label: "Was the weekly toolbox talk completed today?" },
        { kind: "text", id: "10.1_when", label: "If no, when this week is the toolbox talk scheduled?" },
        { kind: "text", id: "10.1_topic", label: "What topic will be discussed?" },
        { kind: "yna", id: "10.2", label: "Was the daily JSA and Pre-Shift Meeting held today?" },
        { kind: "yna", id: "10.3", label: "Was the daily pre-shift sign in sheet completed?" },
      ],
    },
    {
      id: "s11", title: "11 Compliance", items: [
        { kind: "yn", id: "11.1", label: "Was DOB or OSHA on site today?" },
        { kind: "yn", id: "11.2", label: "Were any violations or Stop Work Orders issued?" },
        { kind: "long", id: "11.2_desc", label: "If yes, provide a description." },
        { kind: "yn", id: "11.3", label: "Did the Site Safety Manager make any recommendations?" },
        { kind: "long", id: "11.3_what", label: "If yes, please specify what they were." },
        { kind: "yn", id: "11.3_comply", label: "If yes, did we comply with the recommendations?" },
      ],
    },
    {
      id: "s12", title: "12 Safety, Accidents, and Incidents", items: [
        { kind: "yn", id: "12.1", label: "Did you notice any unsafe work being performed?" },
        { kind: "long", id: "12.1_what", label: "If yes, what happened and where did it occur?" },
        { kind: "long", id: "12.1_fix", label: "If yes, how was the situation remedied?" },
        { kind: "yn", id: "12.2", label: "Were there any accidents on site today?", help: "Report each one in Incident Reporting too." },
        { kind: "text", id: "12.2_where", label: "If yes, did the worker go to Urgent Care, the Hospital, or any other off-site location for treatment? (Specify where.)" },
        { kind: "yn", id: "12.2_waiver", label: "If no injuries occurred, did worker sign a “Return to Work” waiver?" },
      ],
    },
    {
      id: "s13", title: "13 Operations", note: "On what floor(s) did each of the following operations occur on?", items: [
        { kind: "text", id: "13.rebar", label: "Rebar Tying" },
        { kind: "text", id: "13.stripping", label: "Stripping" },
        { kind: "text", id: "13.forming", label: "Forming" },
        { kind: "text", id: "13.reshoring", label: "Reshoring" },
        { kind: "text", id: "13.punch", label: "Punch List" },
      ],
    },
    {
      id: "s14", title: "14 Please provide further explanation for any items marked unsatisfactory above", items: [
        { kind: "long", id: "14", label: "Explanation" },
      ],
    },
    {
      id: "s15", title: "15 Description of Today’s Operation and Additional Notes", items: [
        { kind: "long", id: "15", label: "Description and notes" },
      ],
    },
  ],
};
