export type Action = "inspect" | "clear" | "escalate" | "defer";
export type Priority = "high" | "medium" | "low";
export type DrainStatus = "urgent" | "reported" | "uncertain" | "clear" | "blocked" | "completed";

export type Drain = {
  id: string;
  name: string;
  x: number;
  z: number;
  severity: number;
  status: DrainStatus;
  access: boolean;
  downstreamIssue?: boolean;
  routeCritical?: boolean;
  serviceMinutes: number;
  reportIds: string[];
  note: string;
};

export type Report = {
  id: string;
  drainId: string;
  time: string;
  text: string;
  kind: "resident" | "crew" | "photo";
};

export type Crew = {
  id: string;
  label: string;
  color: string;
  x: number;
  z: number;
  availableAt: number;
};

export type Job = {
  drainId: string;
  action: Action;
  priority: Priority;
  crewId?: string;
  start: number;
  finish: number;
  travel: number;
  reason: string;
  feasible: boolean;
};

export type Plan = {
  id: "nearest" | "risk" | "ai";
  label: string;
  mode: "Baseline" | "Heuristic fallback" | "Recorded example";
  jobs: Job[];
  deferred: { drainId: string; reason: string }[];
  changes?: string[];
};

export type Metrics = {
  completed: number;
  priorityCompleted: number;
  travel: number;
  failedVisits: number;
  ponding: number;
};
