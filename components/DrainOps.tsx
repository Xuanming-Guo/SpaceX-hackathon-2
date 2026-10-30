"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
import { drains, reports, sources } from "@/data/scenario";
import { impactAssumptionLabel, estimateImpact } from "@/lib/impact";
import { createPlan, jobAt, metricsFor } from "@/lib/scheduling";
import { Plan } from "@/lib/types";

const Scene3D = dynamic(() => import("@/components/Scene3D"), {
  ssr: false,
  loading: () => <div className="scene-loading">Loading 3D district…</div>,
});

const names = Object.fromEntries(drains.map((drain) => [drain.id, drain.name]));

function fmtMinute(minute: number) {
  const wholeMinute = Math.floor(minute);
  return `${String(9 + Math.floor(wholeMinute / 60)).padStart(2, "0")}:${String(wholeMinute % 60).padStart(2, "0")}`;
}

export default function DrainOps() {
  const [plan, setPlan] = useState<Plan>(() => createPlan("ai"));
  const [selectedId, setSelectedId] = useState("G-01");
  const [minute, setMinute] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [rain, setRain] = useState(2);
  const [crewCount, setCrewCount] = useState(2);
  const [blocked, setBlocked] = useState<Set<string>>(new Set());
  const [compareOpen, setCompareOpen] = useState(false);
  const [sourceOpen, setSourceOpen] = useState(false);
  const [cameraKey, setCameraKey] = useState(0);
  const [followCrewId, setFollowCrewId] = useState<string | null>(null);
  const [isPlanning, setIsPlanning] = useState(false);
  const [notice, setNotice] = useState("Scenario loaded: 20 demonstration drains, 2 crews, rainfall in 90 minutes.");

  useEffect(() => {
    if (!playing) return;
    let frame = 0;
    let previous = performance.now();
    const tick = (now: number) => {
      const elapsedSeconds = Math.min(0.1, (now - previous) / 1000);
      previous = now;
      setMinute((value) => {
        if (value >= 90) { setPlaying(false); return 90; }
        // At 1×, the 90-minute operational window replays in about two real minutes.
        return Math.min(90, value + elapsedSeconds * 0.75 * speed);
      });
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [playing, speed]);

  const selected = drains.find((drain) => drain.id === selectedId) ?? drains[0];
  const selectedReports = reports.filter((report) => report.drainId === selectedId);
  const metrics = useMemo(() => metricsFor(plan, drains, blocked), [plan, blocked]);
  const nextJob = plan.jobs.find((job) => job.finish > minute);
  const completed = plan.jobs.filter((job) => job.finish <= minute);
  const impact = useMemo(() => estimateImpact(plan, minute, blocked), [plan, minute, blocked]);
  const baselineOutcome = useMemo(() => estimateImpact(plan, 0, blocked), [plan, blocked]);
  const nextDrain = nextJob ? drains.find((drain) => drain.id === nextJob.drainId) : undefined;
  const crewTelemetry = ["crew-1", "crew-2"].slice(0, crewCount).map((crewId) => {
    const active = jobAt(plan, crewId, minute);
    const upcoming = plan.jobs.find((job) => job.crewId === crewId && job.finish > minute);
    const target = active ?? upcoming;
    return { label: crewId === "crew-1" ? "CREW 01" : "CREW 02", value: target ? `${active ? "servicing" : "en route"} ${target.drainId}` : "available" };
  });

  const reset = () => {
    setPlan(createPlan("ai", drains, new Set(), 90, crewCount));
    setBlocked(new Set()); setMinute(0); setPlaying(false); setSelectedId("G-01");
    setNotice("Scenario reset. Bundled example is ready to run.");
  };

  const generatePlan = async () => {
    setIsPlanning(true);
    setNotice("Checking reports, duplicates and crew feasibility…");
    try {
      await fetch("/api/plan", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ scenarioId: "preston-demo", goal: "Keep critical routes accessible before rain.", blockedDrainIds: [...blocked] }) });
    } catch { /* The bundled deterministic plan remains available offline. */ }
    window.setTimeout(() => {
      setPlan(createPlan("ai", drains, blocked, 90, crewCount));
      setIsPlanning(false);
      setNotice(blocked.size ? "Replan ready: inaccessible visit removed and the next feasible priority visit inserted." : "Evidence-led plan ready. Routing and timings were checked locally.");
    }, 550);
  };

  const introduceObstruction = () => {
    setBlocked(new Set(["G-05"]));
    setSelectedId("G-05");
    setNotice("New crew observation at Ringway south: a parked van blocks safe access. Replan required.");
  };

  const comparisons = ["nearest", "risk", "ai"].map((policy) => {
    const result = createPlan(policy as "nearest" | "risk" | "ai", drains, blocked, 90, crewCount);
    return { plan: result, metrics: metricsFor(result, drains, blocked), impact: estimateImpact(result, 90, blocked) };
  });

  return <main className="app-shell">
    <header className="topbar">
      <div className="brand"><span className="brand-mark">◒</span><div><strong>DrainOps</strong><small>Pre-storm maintenance control</small></div></div>
      <div className="scenario-label"><span className="pulse" /> Preston demonstration scenario <i>·</i> illustrative drainage model</div>
      <div className="ai-status"><span className="status-dot" /> {plan.mode}</div>
    </header>

    <section className="workspace">
      <section className="scene-panel">
        <Scene3D plan={plan} minute={minute} selectedId={selectedId} onSelect={setSelectedId} blocked={blocked} rainIntensity={rain} cameraKey={cameraKey} followCrewId={followCrewId} />
        <div className="scene-vignette" />
        <div className="map-hud top-left"><span className="eyebrow">WEATHER WINDOW</span><strong>Heavy rain in {Math.max(0, 90 - minute)} min</strong><span>Rain intensity: {rain === 1 ? "moderate" : rain === 2 ? "heavy" : "severe"}</span></div>
        <div className="impact-hud"><span className="eyebrow">SIMULATED PONDING EXPOSURE</span><div><strong>{impact.baselinePondingCellMinutes}</strong><i>→</i><strong className="impact-after">{impact.projectedPondingCellMinutes}</strong></div><small>cell-minutes · effect applies only when a clearance completes</small><span className="impact-bar"><b style={{ width: `${Math.min(100, (impact.projectedPondingCellMinutes / impact.baselinePondingCellMinutes) * 100)}%` }} /></span><div className="impact-detail"><span>Flow capacity <b>{impact.trafficFlowPercent}%</b></span><span>Cost proxy avoided <b>£{impact.avoidedDisruptionCostProxy}</b></span></div></div>
        <div className="decision-hud"><span className="eyebrow">OPTIMISER&apos;S NEXT MOVE</span><strong>{nextDrain ? `#${nextJob?.priority === "high" ? "1" : "2"} ${nextDrain.id} · ${nextDrain.name}` : "All scheduled work complete"}</strong><small>{nextJob ? `${nextJob.action.toUpperCase()} · Crew ${nextJob.crewId === "crew-1" ? "01" : "02"} · ${nextJob.travel} min travel · ${nextJob.finish} min finish` : "Rain-impact replay is complete."}</small></div>
        <div className="telemetry-hud"><span className="eyebrow">SIMULATED OPERATIONAL TELEMETRY</span><div className="telemetry-grid"><span><i>RAIN</i><b>{rain === 1 ? "MOD" : rain === 2 ? "HEAVY" : "SEVERE"}</b></span><span><i>PONDING</i><b>{impact.projectedPondingCellMinutes}</b></span>{crewTelemetry.map((crew) => <span key={crew.label}><i>{crew.label}</i><b>{crew.value}</b></span>)}</div><small>Demonstration scenario telemetry · not live field sensors</small></div>
        <div className="map-hud bottom-left"><span className="legend"><b className="dot urgent" /> urgent</span><span className="legend"><b className="dot uncertain" /> uncertain</span><span className="legend"><b className="dot complete" /> cleared</span></div>
        <button className="camera-button" onClick={() => setCameraKey((value) => value + 1)}>◎ Reset camera</button>
        <div className="attribution">Central Preston OSM basemap · © OpenStreetMap contributors · scenario drains are illustrative</div>
      </section>

      <aside className="decision-panel">
        <div className="panel-title"><div><span className="eyebrow">SELECTED ASSET</span><h1>{selected.id} <em>{selected.name}</em></h1></div><span className={`severity severity-${selected.severity >= 8 ? "high" : "med"}`}>{selected.severity >= 8 ? "HIGH" : "MED"}</span></div>
        <p className="asset-note">{blocked.has(selected.id) ? "Access blocked by a parked vehicle. Do not dispatch until access is restored." : selected.note}</p>
        <div className="action-card">
          <div className="action-icon">{selected.downstreamIssue ? "?" : "✓"}</div><div><span className="eyebrow">RECOMMENDED ACTION</span><strong>{selected.downstreamIssue ? "Inspect, then escalate if confirmed" : "Clear surface obstruction"}</strong><p>{selected.downstreamIssue ? "Visible evidence cannot establish hidden pipe condition." : "Observed reports support an achievable pre-storm visit."}</p></div>
        </div>
        <div className="evidence-block"><div className="section-row"><span className="eyebrow">EVIDENCE</span><span>{selected.reportIds.length} report{selected.reportIds.length === 1 ? "" : "s"}</span></div>
          {selectedReports.length ? selectedReports.map((report) => <div className="report" key={report.id}><span>{report.kind === "photo" ? "◈" : report.kind === "crew" ? "⌁" : "●"}</span><p><b>{report.time} · {report.kind}</b>{report.text}</p></div>) : <div className="report"><span>●</span><p><b>Demonstration observation</b>{selected.note}</p></div>}
        </div>
        <div className="unknowns"><span>△</span><div><b>Known unknowns</b><p>{selected.downstreamIssue ? "A downstream defect is possible. Clearance alone may not resolve ponding." : "Reports show surface symptoms, not underground capacity."}</p></div></div>
        <div className="decision-chain"><span className="eyebrow">WHY THIS JOB IS IN THE PLAN</span><div><b>1</b><p><strong>Evidence score</strong>{selected.severity}/10 severity {selected.routeCritical ? "· critical access route" : "· local impact"}</p></div><div><b>2</b><p><strong>Feasibility check</strong>{nextJob?.drainId === selected.id ? `${nextJob.travel} min travel + ${selected.serviceMinutes} min service fits before rain.` : "Planner avoids duplicate crews and impossible deadline visits."}</p></div><div><b>3</b><p><strong>Physical effect</strong>{selected.downstreamIssue ? "Inspection reveals uncertainty; no drainage capacity is claimed yet." : "Ponding shrinks only after clearance is complete."}</p></div></div>
        <div className="panel-footer"><span>{completed.length} completed</span><span>·</span><span>{nextJob ? `Next: ${names[nextJob.drainId]}` : "All scheduled work complete"}</span></div>
      </aside>
    </section>

    <section className="control-deck">
      <div className="clock"><span className="eyebrow">SIMULATION TIME</span><strong>{fmtMinute(minute)}</strong><span className="deadline">RAIN {fmtMinute(90)}</span></div>
      <div className="timeline"><div className="timeline-track"><div className="timeline-progress" style={{ width: `${(minute / 90) * 100}%` }} />{plan.jobs.slice(0, 7).map((job) => <button key={job.drainId} className={`job-pip ${job.priority}`} style={{ left: `${(job.finish / 90) * 100}%` }} title={`${names[job.drainId]} · ${job.action}`} onClick={() => setSelectedId(job.drainId)} />)}</div><div className="timeline-labels"><span>09:00</span><span>09:30</span><span>10:00 rain</span><span>10:30</span></div></div>
      <div className="play-controls"><button className="icon-button" onClick={() => setMinute(0)} title="Return to start">↶</button><button className="play-button" onClick={() => setPlaying((value) => !value)}>{playing ? "Ⅱ Pause" : "▶ Play"}</button><label className="speed"><span>{speed}×</span><input aria-label="Simulation speed" type="range" min="1" max="5" value={speed} onChange={(event) => setSpeed(Number(event.target.value))} /></label></div>
    </section>

    <section className="outcome-cards" aria-label="Scenario impact before and after">
      <article><span className="eyebrow">TRAFFIC THROUGHPUT</span><div><b>{baselineOutcome.trafficFlowPercent}%</b><i>→</i><strong>{impact.trafficFlowPercent}%</strong></div><p>Scenario road-flow capacity</p></article>
      <article><span className="eyebrow">VEHICLE DELAY</span><div><b>{baselineOutcome.delayedVehicleMinutes}</b><i>→</i><strong>{impact.delayedVehicleMinutes}</strong></div><p>Illustrative vehicle-minutes</p></article>
      <article><span className="eyebrow">CRITICAL ROUTES KEPT OPEN</span><div><b>0/{impact.totalCriticalRoutes}</b><i>→</i><strong>{impact.criticalRoutesProtected}/{impact.totalCriticalRoutes}</strong></div><p>Completed clearances before rain</p></article>
      <article><span className="eyebrow">DISRUPTION COST PROXY</span><div><b>£{baselineOutcome.disruptionCostProxy}</b><i>→</i><strong>£{impact.disruptionCostProxy}</strong></div><p>Scenario-only operational estimate</p></article>
    </section>

    <section className="operator-bar">
      <div className="notice"><span className="notice-symbol">✦</span>{isPlanning ? "AI request in progress…" : notice}<span className="impact-summary">Ponding {impact.baselinePondingCellMinutes} → {impact.projectedPondingCellMinutes} cell-min · traffic capacity {impact.trafficFlowPercent}% · £{impact.avoidedDisruptionCostProxy} scenario disruption proxy avoided</span></div>
      <div className="operator-controls">
        <label className="compact-control">CREWS <select value={crewCount} onChange={(event) => { const count = Number(event.target.value); setCrewCount(count); setPlan(createPlan(plan.id, drains, blocked, 90, count)); }}><option value={1}>1</option><option value={2}>2</option></select></label>
        <label className="compact-control">RAIN <input aria-label="Rain intensity" type="range" min="1" max="3" value={rain} onChange={(event) => setRain(Number(event.target.value))} /></label>
        <label className="compact-control follow-control">FOLLOW <select aria-label="Follow crew" value={followCrewId ?? "overview"} onChange={(event) => setFollowCrewId(event.target.value === "overview" ? null : event.target.value)}><option value="overview">Overview</option><option value="crew-1">Crew 01</option><option value="crew-2" disabled={crewCount < 2}>Crew 02</option></select></label>
        <button className="secondary" onClick={() => { setMinute(0); setPlaying(true); setNotice("Impact replay running: ponding drops only as crews complete applicable clearances."); }}>▶ Run impact replay</button>
        <button className="secondary" onClick={() => setCompareOpen((value) => !value)}>▥ Compare plans</button>
        <button className="secondary" onClick={() => setSourceOpen((value) => !value)}>⌁ Sources</button>
        <button className="secondary warn" disabled={blocked.has("G-05")} onClick={introduceObstruction}>⚠ Introduce obstruction</button>
        <button className="primary" disabled={isPlanning} onClick={generatePlan}>{blocked.size ? "↻ Replan from observation" : "✦ Generate AI plan"}</button>
        <button className="reset" onClick={reset}>Reset</button>
      </div>
    </section>

    {compareOpen && <section className="drawer comparison"><div className="drawer-heading"><div><span className="eyebrow">CONSISTENT SCENARIO REPLAY</span><h2>Plan comparison</h2></div><button onClick={() => setCompareOpen(false)}>×</button></div><p>Same rain, assets, observations, crews and deadline. The optimiser earns its result only through completed clearances before rainfall.</p><div className="comparison-grid"><div className="compare-head">Policy</div><div className="compare-head">Jobs</div><div className="compare-head">Priority</div><div className="compare-head">Travel</div><div className="compare-head">Ponding exposure</div><div className="compare-head">Traffic flow</div><div className="compare-head">Disruption proxy</div>{comparisons.flatMap(({ plan: item, metrics: value, impact: outcome }) => [<div key={`${item.id}-a`}><b>{item.label}</b><small>{item.mode}</small></div>, <div key={`${item.id}-b`}>{value.completed}</div>, <div key={`${item.id}-c`}>{value.priorityCompleted}</div>, <div key={`${item.id}-d`}>{value.travel} min</div>, <div key={`${item.id}-e`}><span className="ponding">{outcome.projectedPondingCellMinutes}</span></div>, <div key={`${item.id}-f`}>{outcome.trafficFlowPercent}%</div>, <div key={`${item.id}-g`}>£{outcome.disruptionCostProxy}</div>])}</div><p className="drawer-note">{impactAssumptionLabel}</p></section>}
    {sourceOpen && <section className="drawer sources"><div className="drawer-heading"><div><span className="eyebrow">WHY LANCASHIRE?</span><h2>Public context</h2></div><button onClick={() => setSourceOpen(false)}>×</button></div><p>These sourced facts are separate from the illustrative Preston assets and weather scenario.</p>{sources.map((source) => <a key={source.href} href={source.href} target="_blank" rel="noreferrer noopener"><b>{source.title}</b><span>{source.label} ↗</span></a>)}</section>}
    <div className="mobile-fallback">Interactive 3D district unavailable? The decision panel, scheduler and comparison controls remain usable.</div>
  </main>;
}
