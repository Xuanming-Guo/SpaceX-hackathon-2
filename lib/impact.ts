import { drains } from "@/data/scenario";
import { Plan } from "@/lib/types";

export type ImpactEstimate = {
  baselinePondingCellMinutes: number;
  projectedPondingCellMinutes: number;
  criticalRoutesProtected: number;
  totalCriticalRoutes: number;
  trafficFlowPercent: number;
  delayedVehicleMinutes: number;
  avoidedVehicleMinutes: number;
  baselineDisruptionCostProxy: number;
  disruptionCostProxy: number;
  avoidedDisruptionCostProxy: number;
  completedClearances: number;
};

// Deliberately small and transparent scenario model. It is a comparison tool,
// not a flood forecast, traffic count or financial-savings claim.
const criticalRouteWeight = 2.4;
const pondingMultiplier = 5.4;
const clearanceEffect = 0.67;
const downstreamClearanceEffect = 0.16;
const vehicleDelayAtBaseline = 160;
const vehicleMinuteCostProxy = 1.1;
const criticalRouteDisruptionProxy = 55;

function exposureFor(drain: typeof drains[number]) {
  return drain.severity * (drain.routeCritical ? criticalRouteWeight : 1) * (drain.downstreamIssue ? 1.15 : 1);
}

export function estimateImpact(plan: Plan, asOfMinute = 90, blocked = new Set<string>()): ImpactEstimate {
  const baselinePondingCellMinutes = Math.round(drains.reduce((total, drain) => total + exposureFor(drain), 0) * pondingMultiplier);
  const completedClearances = plan.jobs.filter((job) => job.action === "clear" && job.finish <= asOfMinute && !blocked.has(job.drainId));
  const reduction = completedClearances.reduce((total, job) => {
    const drain = drains.find((item) => item.id === job.drainId);
    if (!drain) return total;
    return total + exposureFor(drain) * pondingMultiplier * (drain.downstreamIssue ? downstreamClearanceEffect : clearanceEffect);
  }, 0);
  const projectedPondingCellMinutes = Math.max(0, Math.round(baselinePondingCellMinutes - reduction));
  const criticalRoutes = drains.filter((drain) => drain.routeCritical);
  const criticalRoutesProtected = criticalRoutes.filter((drain) => completedClearances.some((job) => job.drainId === drain.id)).length;
  const ratio = projectedPondingCellMinutes / baselinePondingCellMinutes;
  const delayedVehicleMinutes = Math.round(vehicleDelayAtBaseline * ratio);
  const baselineCost = Math.round(vehicleDelayAtBaseline * vehicleMinuteCostProxy + criticalRoutes.length * criticalRouteDisruptionProxy);
  const deferredPenalty = asOfMinute >= 90 ? plan.deferred.length * 10 : 0;
  const disruptionCostProxy = Math.round(delayedVehicleMinutes * vehicleMinuteCostProxy + (criticalRoutes.length - criticalRoutesProtected) * criticalRouteDisruptionProxy + deferredPenalty);
  return {
    baselinePondingCellMinutes,
    projectedPondingCellMinutes,
    criticalRoutesProtected,
    totalCriticalRoutes: criticalRoutes.length,
    trafficFlowPercent: Math.round(100 - ratio * 45),
    delayedVehicleMinutes,
    avoidedVehicleMinutes: vehicleDelayAtBaseline - delayedVehicleMinutes,
    baselineDisruptionCostProxy: baselineCost,
    disruptionCostProxy,
    avoidedDisruptionCostProxy: Math.max(0, baselineCost - disruptionCostProxy),
    completedClearances: completedClearances.length,
  };
}

export const impactAssumptionLabel = "Scenario assumptions: 90-minute preparation window, 160 vehicle-minutes of baseline delay, and £1.10 illustrative disruption proxy per delayed vehicle-minute. Not an estimate of real savings or throughput.";
