"use client";

import { OrbitControls, Text } from "@react-three/drei";
import { Canvas, ThreeEvent, useFrame, useThree } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { initialCrews, drains } from "@/data/scenario";
import { osmBuildings, osmRoads, OSMBuilding, OSMRoad } from "@/data/preston-map";
import { interpolateCrew, jobAt } from "@/lib/scheduling";
import { Plan } from "@/lib/types";

type Props = { plan: Plan; minute: number; selectedId: string; onSelect: (id: string) => void; blocked: Set<string>; rainIntensity: number; cameraKey: number; followCrewId: string | null };

function roadWidth(kind: string) { if (kind.includes("trunk")) return 0.21; if (kind === "tertiary") return 0.16; if (["unclassified", "residential"].includes(kind)) return 0.115; return 0.052; }

function Road({ road }: { road: OSMRoad }) {
  const geometry = useMemo(() => {
    const points = road.points.map(([x, z]) => new THREE.Vector3(x, 0.065, z));
    const path = new THREE.CurvePath<THREE.Vector3>();
    for (let index = 1; index < points.length; index++) path.add(new THREE.LineCurve3(points[index - 1], points[index]));
    return new THREE.TubeGeometry(path, Math.max(2, points.length * 2), roadWidth(road.kind), 3, false);
  }, [road]);
  const important = road.kind.includes("trunk") || road.kind === "tertiary";
  return <mesh geometry={geometry} receiveShadow><meshStandardMaterial color={important ? "#274455" : "#1d3341"} roughness={0.82} metalness={0.05} /></mesh>;
}

function Building({ building }: { building: OSMBuilding }) {
  const geometry = useMemo(() => {
    const shape = new THREE.Shape(); const points = building.points;
    shape.moveTo(points[0][0], -points[0][1]);
    for (let index = 1; index < points.length; index++) shape.lineTo(points[index][0], -points[index][1]);
    return new THREE.ExtrudeGeometry(shape, { depth: Math.min(3.5, building.height * 0.19), bevelEnabled: true, bevelSegments: 1, bevelSize: 0.018, bevelThickness: 0.018 });
  }, [building]);
  const tint = Number(building.id.slice(-1)) % 3;
  return <mesh geometry={geometry} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.075, 0]} castShadow receiveShadow><meshStandardMaterial color={["#36576a", "#2d4b5d", "#3c6072"][tint]} roughness={0.77} metalness={0.08} /></mesh>;
}

function Rain({ intensity }: { intensity: number }) {
  const ref = useRef<THREE.Points>(null);
  const positions = useMemo(() => { const values = new Float32Array(550 * 3); for (let index = 0; index < 550; index++) { values[index * 3] = ((index * 17) % 260) / 10 - 13; values[index * 3 + 1] = ((index * 47) % 150) / 10; values[index * 3 + 2] = ((index * 29) % 260) / 10 - 13; } return values; }, []);
  useFrame((_, delta) => { if (!ref.current || intensity === 0) return; const attribute = ref.current.geometry.attributes.position as THREE.BufferAttribute; for (let index = 0; index < attribute.count; index++) { const next = attribute.getY(index) - delta * (4.5 + intensity * 2); attribute.setY(index, next < 0 ? 15 : next); } attribute.needsUpdate = true; });
  if (!intensity) return null;
  return <points ref={ref}><bufferGeometry><bufferAttribute attach="attributes-position" args={[positions, 3]} /></bufferGeometry><pointsMaterial size={0.045} color="#8ee7ff" transparent opacity={0.56} /></points>;
}

function RouteLine({ points, color }: { points: [number, number][]; color: string }) {
  const line = useMemo(() => new THREE.Line(new THREE.BufferGeometry().setFromPoints(points.map(([x, z]) => new THREE.Vector3(x, 0.22, z))), new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.92 })), [points, color]);
  return <primitive object={line} />;
}

function Vehicle({ crewId, plan, minute, color }: { crewId: string; plan: Plan; minute: number; color: string }) {
  const crew = initialCrews.find((item) => item.id === crewId)!; const current = interpolateCrew(plan, crew, minute); const job = jobAt(plan, crewId, minute); const next = plan.jobs.find((item) => item.crewId === crewId && item.finish > minute); const target = next && drains.find((item) => item.id === next.drainId);
  return <>{target && <RouteLine color={color} points={[[current.x, current.z], [target.x, target.z]]} />}<group position={[current.x, 0.37, current.z]}><mesh castShadow><boxGeometry args={[0.58, 0.38, 0.9]} /><meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.22} /></mesh><mesh position={[0, 0.27, -0.08]}><boxGeometry args={[0.4, 0.2, 0.37]} /><meshStandardMaterial color="#e6fbff" metalness={0.4} /></mesh>{job && <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.31, 0]}><ringGeometry args={[0.6, 0.76, 32]} /><meshBasicMaterial color="#a7f36b" transparent opacity={0.85} /></mesh>}</group></>;
}

function FollowCamera({ crewId, plan, minute }: { crewId: string | null; plan: Plan; minute: number }) {
  const { camera } = useThree();
  const focus = useRef(new THREE.Vector3());
  const desired = useRef(new THREE.Vector3());
  useFrame((_, delta) => {
    if (!crewId) return;
    const crew = initialCrews.find((item) => item.id === crewId);
    if (!crew) return;
    const position = interpolateCrew(plan, crew, minute);
    focus.current.set(position.x, 0, position.z);
    desired.current.set(position.x + 8.5, 8.2, position.z + 8.5);
    const smoothing = 1 - Math.exp(-delta * 3.3);
    camera.position.lerp(desired.current, smoothing);
    camera.lookAt(focus.current);
  });
  return null;
}

function DrainMarker({ drain, selected, blocked, plan, minute, onSelect }: { drain: typeof drains[number]; selected: boolean; blocked: boolean; plan: Plan; minute: number; onSelect: (event: ThreeEvent<MouseEvent>) => void }) {
  const job = plan.jobs.find((item) => item.drainId === drain.id); const done = Boolean(job && job.finish <= minute && job.action === "clear"); const color = blocked ? "#ffbe55" : done ? "#a7f36b" : drain.severity >= 8 ? "#ff6477" : drain.status === "uncertain" ? "#ffbe55" : "#54d9ff"; const ponding = Math.max(0.35, drain.severity / 6 + (done ? -0.55 : 0));
  return <group position={[drain.x, 0.12, drain.z]}>{drain.severity >= 7 && <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0.33, -0.08, 0.2]} scale={[ponding, ponding * 0.58, 1]}><circleGeometry args={[0.58, 20]} /><meshBasicMaterial color="#2d8eb8" transparent opacity={done ? 0.15 : 0.54} /></mesh>}<mesh rotation={[-Math.PI / 2, 0, 0]} onClick={onSelect}><circleGeometry args={[selected ? 0.42 : 0.28, 24]} /><meshBasicMaterial color={color} /></mesh><mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.025, 0]}><ringGeometry args={[0.4, 0.44, 24]} /><meshBasicMaterial color={selected ? "#f4feff" : "#102330"} /></mesh>{(selected || (job?.priority === "high" && !done)) && <Text position={[0, 0.45, 0]} fontSize={0.27} color="#e9faff" anchorX="center">{job ? `${job.priority === "high" ? "1" : "•"} ${drain.id}` : drain.id}</Text>}</group>;
}

function District({ plan, minute, selectedId, onSelect, blocked, rainIntensity }: Omit<Props, "cameraKey">) {
  return <><color attach="background" args={["#08141d"]} /><fog attach="fog" args={["#08141d", 19, 41]} /><ambientLight intensity={0.74} /><hemisphereLight args={["#9ad5ec", "#0d1720", 1.1]} /><directionalLight position={[8, 20, 10]} intensity={1.7} castShadow shadow-mapSize={[1024, 1024]} /><mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow><planeGeometry args={[29, 29]} /><meshStandardMaterial color="#122b35" roughness={1} /></mesh>{osmRoads.map((road) => <Road key={road.id} road={road} />)}{osmBuildings.map((building) => <Building key={building.id} building={building} />)}<group position={[-10, 0.09, 8]}><mesh><boxGeometry args={[1.2, 0.13, 1]} /><meshStandardMaterial color="#1a4551" /></mesh><Text position={[0, 0.1, 0]} rotation={[-Math.PI / 2, 0, 0]} fontSize={0.22} color="#8ee7ff">DEPOT</Text></group>{drains.map((drain) => <DrainMarker key={drain.id} drain={drain} selected={selectedId === drain.id} blocked={blocked.has(drain.id)} plan={plan} minute={minute} onSelect={(event) => { event.stopPropagation(); onSelect(drain.id); }} />)}{blocked.has("G-05") && <group position={[6.87, 0.42, 0.87]} rotation={[0, 0.5, 0]}><mesh><boxGeometry args={[1.05, 0.58, 0.54]} /><meshStandardMaterial color="#e7a93e" /></mesh><Text position={[0, 0.72, 0]} fontSize={0.2} color="#ffe6a3">BLOCKED</Text></group>}<Vehicle crewId="crew-1" plan={plan} minute={minute} color="#4bdcff" /><Vehicle crewId="crew-2" plan={plan} minute={minute} color="#a7f36b" /><Rain intensity={rainIntensity} /></>;
}

export default function Scene3D(props: Props) { return <Canvas key={props.cameraKey} shadows dpr={[1, 1.5]} camera={{ position: [14, 16, 17], fov: 43 }}><District {...props} /><FollowCamera crewId={props.followCrewId} plan={props.plan} minute={props.minute} /><OrbitControls makeDefault enabled={!props.followCrewId} minDistance={11} maxDistance={34} maxPolarAngle={Math.PI / 2.22} target={[0, 0, 0]} /></Canvas>; }
