import { Crew, Drain, Report } from "@/lib/types";

export const DEPOT = { x: -9.8, z: 6.2 };

// Demonstration assets and observations: not a council inventory or live telemetry.
export const drains: Drain[] = [
  { id: "G-01", name: "Fishergate", x: -3.55, z: 3.86, severity: 10, status: "urgent", access: true, routeCritical: true, serviceMinutes: 12, reportIds: ["R01", "R02"], note: "Leaves over grate; ponding crosses the bus corridor." },
  { id: "G-02", name: "Corporation Street", x: -1.37, z: -1.83, severity: 6, status: "reported", access: true, serviceMinutes: 10, reportIds: ["R03"], note: "Resident reports slow drainage after rainfall." },
  { id: "G-03", name: "Chapel Street", x: 5.39, z: 1.33, severity: 8, status: "reported", access: true, routeCritical: true, serviceMinutes: 14, reportIds: ["R04"], note: "Surface obstruction visible at a pedestrian crossing." },
  { id: "G-04", name: "Ring Way", x: -1.03, z: -4.43, severity: 9, status: "uncertain", access: true, downstreamIssue: true, serviceMinutes: 18, reportIds: ["R05"], note: "Water returned shortly after a previous clean; inspection first." },
  { id: "G-05", name: "Fishergate east", x: 6.87, z: 0.87, severity: 9, status: "urgent", access: true, routeCritical: true, serviceMinutes: 16, reportIds: ["R06"], note: "Important access route; debris reported after wind." },
  { id: "G-06", name: "Theatre Street", x: 2.41, z: 6.4, severity: 4, status: "reported", access: true, serviceMinutes: 9, reportIds: ["R07"], note: "Shallow ponding beside the market." },
  { id: "G-07", name: "Winckley Street", x: 8.43, z: 0.97, severity: 5, status: "reported", access: true, serviceMinutes: 12, reportIds: ["R08"], note: "Small debris accumulation." },
  { id: "G-08", name: "Fishergate service lane", x: 5.99, z: 1.18, severity: 7, status: "reported", access: true, serviceMinutes: 11, reportIds: ["R09", "R10"], note: "Duplicate reports of ponding beside the central route." },
  { id: "G-09", name: "Lune Street", x: 5.39, z: -6, severity: 6, status: "reported", access: true, serviceMinutes: 13, reportIds: ["R11"], note: "Silt visible; away from the critical route." },
  { id: "G-10", name: "Fishergate west", x: -5.17, z: 4.31, severity: 5, status: "reported", access: true, serviceMinutes: 12, reportIds: ["R12"], note: "Reported grille obstruction." },
  { id: "G-11", name: "Mount Street", x: 3.66, z: 1.85, severity: 8, status: "urgent", access: true, serviceMinutes: 15, reportIds: ["R13"], note: "Ponding approaching a junction." },
  { id: "G-12", name: "Ring Way south", x: 4.43, z: -9.72, severity: 7, status: "reported", access: true, serviceMinutes: 22, reportIds: ["R14"], note: "High severity but distant: service time makes this unattractive today." },
  { id: "G-13", name: "Chandler Street", x: -4.14, z: -11.04, severity: 5, status: "reported", access: true, serviceMinutes: 11, reportIds: ["R15"], note: "Minor debris by a school route." },
  { id: "G-14", name: "Preston Guild Hall approach", x: 0.13, z: 8.19, severity: 6, status: "reported", access: true, serviceMinutes: 11, reportIds: ["R16"], note: "Standing water at kerb." },
  { id: "G-15", name: "Ring Way east", x: 6, z: -0.5, severity: 8, status: "reported", access: true, routeCritical: true, serviceMinutes: 14, reportIds: ["R17"], note: "Leaves collecting in a low point." },
  { id: "G-16", name: "Pitt Street", x: -6.23, z: -3.49, severity: 3, status: "reported", access: true, serviceMinutes: 10, reportIds: ["R18"], note: "Routine report." },
  { id: "G-17", name: "Corporation Street north", x: 4.58, z: 11.91, severity: 6, status: "reported", access: true, serviceMinutes: 12, reportIds: ["R19"], note: "Gully cover partly obscured." },
  { id: "G-18", name: "Fleet Street", x: 1.39, z: -6.35, severity: 7, status: "reported", access: true, serviceMinutes: 13, reportIds: ["R20"], note: "Runoff reaches an important walking route." },
  { id: "G-19", name: "Winckley Square", x: 9.59, z: 6.38, severity: 4, status: "reported", access: true, serviceMinutes: 12, reportIds: ["R21"], note: "Routine inspection requested." },
  { id: "G-20", name: "Fishergate west approach", x: -9.99, z: 5.76, severity: 8, status: "reported", access: true, routeCritical: true, serviceMinutes: 15, reportIds: ["R22"], note: "Reported ponding on a bus diversion route." },
];

export const reports: Report[] = [
  { id: "R01", drainId: "G-01", time: "08:04", kind: "photo", text: "Photo: wet leaves fully cover the gully grate. Water is spreading into the bus lane." },
  { id: "R02", drainId: "G-01", time: "08:10", kind: "resident", text: "Ponding at Fishergate crossing is getting worse after each shower." },
  { id: "R03", drainId: "G-02", time: "08:16", kind: "resident", text: "Drain by the shops has been slow since yesterday." },
  { id: "R04", drainId: "G-03", time: "08:22", kind: "photo", text: "Visible leaf mat across the grate near the crossing." },
  { id: "R05", drainId: "G-04", time: "08:28", kind: "crew", text: "Recently cleaned but water is returning. Underlying downstream restriction is unknown." },
  { id: "R06", drainId: "G-05", time: "08:33", kind: "resident", text: "Debris at Ringway south; keep access route clear before the rain." },
  { id: "R09", drainId: "G-08", time: "08:43", kind: "resident", text: "Water around Winckley Square kerb." },
  { id: "R10", drainId: "G-08", time: "08:47", kind: "resident", text: "Same gully as earlier report: puddle remains after passing shower." },
  { id: "R13", drainId: "G-11", time: "09:02", kind: "resident", text: "Junction drain backing up; vehicles spray the pavement." },
  { id: "R17", drainId: "G-15", time: "09:17", kind: "photo", text: "Leaves settling in London Road low point." },
  { id: "R22", drainId: "G-20", time: "09:35", kind: "resident", text: "Ponding over the temporary bus diversion route." },
];

export const initialCrews: Crew[] = [
  { id: "crew-1", label: "Crew 01", color: "#47d7ff", x: DEPOT.x, z: DEPOT.z, availableAt: 0 },
  { id: "crew-2", label: "Crew 02", color: "#a7f36b", x: DEPOT.x + 1, z: DEPOT.z - 1, availableAt: 0 },
];

export const sources = [
  { title: "Lancashire highways maintenance transparency report", label: "~294,000 gullies under council responsibility", href: "https://live.lancashire.gov.uk/council/transparency/published-information/roads-parking-and-travel/local-highways-maintenance-transparency-report-september-2026/" },
  { title: "Lancashire winter maintenance update", label: "74,153 gullies cleaned in drainage programme", href: "https://news.lancashire.gov.uk/news/major-maintenance-drive-helps-prepare-lancashire-roads-for-winter" },
  { title: "Lancashire scrutiny minutes", label: "~1,430 drainage improvement schemes, estimated £7.15m", href: "https://council.lancashire.gov.uk/mgAi.aspx?ID=116744" },
];
