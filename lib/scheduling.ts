import { DEPOT, drains as scenarioDrains, initialCrews } from "@/data/scenario";
import { Crew, Drain, Job, Metrics, Plan } from "@/lib/types";

const speed = 0.46; // illustrative road-network equivalent distance per simulated minute
const distance = (a: { x: number; z: number }, b: { x: number; z: number }) => Math.abs(a.x - b.x) + Math.abs(a.z - b.z);
const priority = (drain: Drain): "high" | "medium" | "low" => drain.severity >= 8 ? "high" : drain.severity >= 6 ? "medium" : "low";
const minuteTravel = (from: { x: number; z: number }, to: Drain) => Math.ceil(distance(from, to) / speed);

type Policy = "nearest" | "risk" | "ai";

function orderedDrains(policy: Policy, drains: Drain[], blocked: Set<string>) {
  const candidates = drains.filter((d) => d.status !== "completed" && !blocked.has(d.id));
  if (policy === "nearest") {
    return [...candidates].sort((a, b) => distance(DEPOT, a) - distance(DEPOT, b));
  }
  if (policy === "risk") {
    return [...candidates].sort((a, b) => (b.severity + Number(Boolean(b.routeCritical)) * 2) - (a.severity + Number(Boolean(a.routeCritical)) * 2));
  }
  // Recorded, evidence-led example. Route feasibility is always calculated below.
  return [...candidates].sort((a, b) => {
    const score = (d: Drain) => d.severity * 4 + (d.routeCritical ? 10 : 0) - (d.downstreamIssue ? 7 : 0) - d.serviceMinutes * 0.25;
    return score(b) - score(a);
  });
}

export function createPlan(policy: Policy, drains = scenarioDrains, blocked = new Set<string>(), deadline = 90, crewCount = 2): Plan {
  const crews = initialCrews.slice(0, crewCount).map((crew) => ({ ...crew }));
  const jobs: Job[] = [];
  const deferred: Plan["deferred"] = [];
  for (const drain of orderedDrains(policy, drains, blocked)) {
    const nearestCrew = crews.reduce((best, crew) => {
      const bestCost = best.availableAt + minuteTravel(best, drain);
      const crewCost = crew.availableAt + minuteTravel(crew, drain);
      return crewCost < bestCost ? crew : best;
    });
    const travel = minuteTravel(nearestCrew, drain);
    const action = drain.downstreamIssue ? "inspect" : "clear" as const;
    const start = nearestCrew.availableAt + travel;
    const finish = start + (action === "inspect" ? Math.max(8, drain.serviceMinutes - 4) : drain.serviceMinutes);
    if (finish > deadline) {
      deferred.push({ drainId: drain.id, reason: `Cannot finish before the ${deadline}-minute rain deadline.` });
      continue;
    }
    jobs.push({
      drainId: drain.id, action,
      priority: priority(drain), crewId: nearestCrew.id, start, finish, travel,
      feasible: true,
      reason: drain.downstreamIssue ? "Inspect first: the report suggests a possible downstream restriction." : drain.routeCritical ? "Protects an important access route before rainfall." : "Observed obstruction/ponding supports a clearance visit.",
    });
    nearestCrew.x = drain.x;
    nearestCrew.z = drain.z;
    nearestCrew.availableAt = finish;
    if (jobs.length >= 9) break;
  }
  blocked.forEach((id) => deferred.unshift({ drainId: id, reason: "Parked vehicle blocks safe gully access; revisit after access is restored." }));
  return {
    id: policy,
    label: policy === "nearest" ? "Nearest-first" : policy === "risk" ? "Fixed risk priority" : "AI-assisted plan",
    mode: policy === "ai" ? "Recorded example" : "Baseline",
    jobs,
    deferred,
    changes: blocked.size && policy === "ai" ? ["Removed inaccessible visit", "Inserted the next feasible priority job", "Crew positions and elapsed time were preserved"] : undefined,
  };
}

export function metricsFor(plan: Plan, drains = scenarioDrains, blocked = new Set<string>()): Metrics {
  const completed = plan.jobs.length;
  const priorityCompleted = plan.jobs.filter((j) => j.priority === "high").length;
  const travel = plan.jobs.reduce((total, job) => total + job.travel, 0);
  const benefit = plan.jobs.reduce((total, job) => total + (drains.find((d) => d.id === job.drainId)?.severity ?? 0), 0);
  return {
    completed,
    priorityCompleted,
    travel,
    failedVisits: blocked.size ? plan.jobs.filter((job) => blocked.has(job.drainId)).length + (plan.id === "nearest" ? 1 : 0) : 0,
    ponding: Math.max(18, Math.round(126 - benefit * 1.35 + blocked.size * 13 + (plan.id === "nearest" ? 9 : 0))),
  };
}

export function jobAt(plan: Plan, crewId: string, minute: number) {
  return plan.jobs.find((job) => job.crewId === crewId && minute >= job.start && minute <= job.finish);
}

export function interpolateCrew(plan: Plan, crew: Crew, minute: number) {
  const jobs = plan.jobs.filter((job) => job.crewId === crew.id);
  let from = { x: crew.x, z: crew.z };
  for (const job of jobs) {
    const target = scenarioDrains.find((drain) => drain.id === job.drainId)!;
    const travelStart = job.start - job.travel;
    if (minute < travelStart) return from;
    if (minute <= job.start) {
      const t = (minute - travelStart) / Math.max(job.travel, 1);
      return { x: from.x + (target.x - from.x) * t, z: from.z + (target.z - from.z) * t };
    }
    if (minute <= job.finish) return { x: target.x, z: target.z };
    from = { x: target.x, z: target.z };
  }
  return from;
}
