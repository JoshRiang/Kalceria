"use client";
import React, { useRef, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";

// ─── Spinning Globe (Accurate Continent Dot Map) ──────────────────────────────
function SpinningGlobe() {
  const groupRef = useRef();

  // Highly refined continent regions — tighter boxes, many sub-regions to avoid ocean fill
  const dotPositions = useMemo(() => {
    const regions = [
      // ── NORTH AMERICA ──
      [60, 72, -140, -70],  // Canada west/central
      [48, 60, -125, -70],  // Canada south strip
      [25, 50, -125, -65],  // USA main
      [15, 30, -120, -85],  // Mexico
      [5,  16, -90,  -75],  // Central America thin strip
      [55, 72, -130, -100], // Alaska/Yukon
      [60, 80, -95,  -70],  // Baffin/Nunavut coast
      // ── SOUTH AMERICA ──
      [8,  12, -75,  -60],  // Venezuela/Colombia
      [-5, 8,  -78,  -48],  // Brazil north
      [-20, -5,-70,  -40],  // Brazil south
      [-40,-20, -73, -48],  // Argentina/Chile
      [-55,-40, -75, -60],  // Patagonia
      // ── EUROPE ──
      [36, 44, -10, 28],    // Spain/France/Italy
      [44, 55, -5,  25],    // France/Germany/Poland
      [55, 65, 5,   30],    // Scandinavia south
      [60, 70, 15,  30],    // Norway coast
      [55, 60, 22,  28],    // Baltic states
      [35, 42, 28,  36],    // Turkey
      [37, 42, -9,  -5],    // Portugal
      [36, 38, 12,  16],    // Sicily/S. Italy
      // ── AFRICA ──
      [30, 37, -5,  35],    // Morocco/Algeria/Libya/Egypt
      [15, 30, 15,  35],    // Sudan/Chad/Libya strip
      [-5, 15, -18, 45],    // West Africa wide
      [-30,-5, 10,  40],    // Central/East Africa
      [-35,-25,15,  32],    // South Africa
      [-26,-15,30,  36],    // Mozambique/Zimbabwe
      [5,  15, 35,  45],    // Ethiopia/Somalia west
      // ── ASIA ──
      [45, 72, 32,  80],    // Russia west/central
      [50, 72, 80,  130],   // Siberia
      [35, 55, 32,  80],    // Central Asia
      [35, 50, 80,  130],   // China north
      [20, 38, 60,  125],   // China south + India + SEA
      [8,  25, 68,  100],   // India subcontinent
      [8,  22, 98,  110],   // Indochina
      [35, 42, 26,  45],    // Turkey/Caucasus
      [10, 30, 35,  60],    // Arabian peninsula
      [22, 40, 45,  60],    // Iran
      // ── SOUTHEAST ASIA ──
      [0,  7,  100, 120],   // Sumatra/Malay
      [-8, 2,  108, 117],   // Java/Bali
      [-5, 4,  115, 120],   // Borneo east
      [5,  18, 120, 125],   // Philippines core
      // ── JAPAN ──
      [31, 45, 130, 142],
      // ── AUSTRALIA ──
      [-10,-5, 130, 140],   // NT top
      [-35,-10,115, 150],   // Main continent
      [-45,-38,145, 148],   // Tasmania
      // ── NEW ZEALAND ──
      [-47,-34,167, 178],
      // ── GREENLAND ──
      [60, 84, -55, -18],
      // ── ICELAND ──
      [63, 66, -25, -12],
      // ── MADAGASCAR ──
      [-26,-12,43,  51],
      // ── BRITISH ISLES ──
      [50, 60, -8,  2],
      // ── ALASKA ──
      [54, 64, -168,-140],
    ];

    const pts = [];
    // Vary density by region area for even distribution
    for (const [latMin, latMax, lonMin, lonMax] of regions) {
      const area = (latMax - latMin) * (lonMax - lonMin);
      const count = Math.max(40, Math.min(220, Math.floor(area * 0.7)));
      for (let i = 0; i < count; i++) {
        const lat = latMin + Math.random() * (latMax - latMin);
        const lon = lonMin + Math.random() * (lonMax - lonMin);
        const latR = (lat * Math.PI) / 180;
        const lonR = (lon * Math.PI) / 180;
        pts.push(
          Math.cos(latR) * Math.cos(lonR),
          Math.sin(latR),
          Math.cos(latR) * Math.sin(lonR)
        );
      }
    }
    return new Float32Array(pts);
  }, []);

  // Earth's axial tilt is approx 23.5 degrees
  const tiltRad = (23.5 * Math.PI) / 180;

  useFrame((_, delta) => {
    if (groupRef.current) {
      // Local rotation (spinning)
      groupRef.current.rotation.y += delta * 0.15;
    }
  });

  return (
    <group ref={groupRef} rotation={[0, 0, tiltRad]} scale={0.75}>
      {/* Internal Dynamic Strings (Phage style) */}
      <GlobeCoreStrings />

      {/* High-visibility stark white grid */}
      <mesh>
        <sphereGeometry args={[1, 36, 18]} />
        <meshBasicMaterial color="#ffffff" wireframe transparent opacity={0.4} blending={THREE.AdditiveBlending} />
      </mesh>

      {/* Continent dot map — now Orange-Gold and glowing */}
      <points>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" count={dotPositions.length / 3} array={dotPositions} itemSize={3} />
        </bufferGeometry>
        <pointsMaterial 
          size={0.028} 
          color="#ff9900" 
          transparent 
          opacity={1} 
          sizeAttenuation 
          blending={THREE.AdditiveBlending}
        />
      </points>
    </group>
  );
}

// ─── Internal Globe Core Strings (Bacteriophage Style) ────────────────────────
function GlobeCoreStrings() {
  // Create 6 independent winding paths with unique movement data
  const stringData = useMemo(() => {
    const data = [];
    for (let j = 0; j < 6; j++) {
      const pts = [];
      for (let i = 0; i < 10; i++) {
        const r = 0.35 + Math.random() * 0.45;
        const phi = Math.random() * Math.PI * 2;
        const theta = Math.random() * Math.PI;
        pts.push(new THREE.Vector3(
          r * Math.sin(theta) * Math.cos(phi),
          r * Math.sin(theta) * Math.sin(phi),
          r * Math.cos(theta)
        ));
      }
      const curve = new THREE.CatmullRomCurve3(pts, true);
      data.push({
        geometry: new THREE.BufferGeometry().setFromPoints(curve.getPoints(120)),
        color: "#ff00ff", // Pure Magenta
        rotSpeed: [
          (Math.random() - 0.5) * 0.008, // Much slower, "grave" motion
          (Math.random() - 0.5) * 0.008,
          (Math.random() - 0.5) * 0.008
        ],
        ref: React.createRef()
      });
    }
    return data;
  }, []);

  useFrame((state) => {
    stringData.forEach((sd) => {
      if (sd.ref.current) {
        sd.ref.current.rotation.x += sd.rotSpeed[0];
        sd.ref.current.rotation.y += sd.rotSpeed[1];
        sd.ref.current.rotation.z += sd.rotSpeed[2];
        // Dynamic scaling for "pulsing" energy
        const pulse = 1 + Math.sin(state.clock.elapsedTime * 1.5 + stringData.indexOf(sd)) * 0.08;
        sd.ref.current.scale.set(pulse, pulse, pulse);
      }
    });
  });

  return (
    <group>
      {stringData.map((sd, i) => (
        <group key={i} ref={sd.ref}>
          {/* LAYER 1: The core bright magenta filament */}
          <line geometry={sd.geometry}>
            <lineBasicMaterial 
              color="#ffffff" 
              transparent 
              opacity={1.0} 
              linewidth={1} 
              blending={THREE.AdditiveBlending}
              depthWrite={false}
            />
          </line>
          {/* LAYER 2: The vibrant magenta body */}
          <line geometry={sd.geometry} scale={1.01}>
            <lineBasicMaterial 
              color="#ff00ff" 
              transparent 
              opacity={0.6} 
              linewidth={1} 
              blending={THREE.AdditiveBlending}
              depthWrite={false}
            />
          </line>
          {/* LAYER 3: The deep magenta outer glow */}
          <line geometry={sd.geometry} scale={1.025}>
            <lineBasicMaterial 
              color="#ff00ff" 
              transparent 
              opacity={0.25} 
              linewidth={1} 
              blending={THREE.AdditiveBlending}
              depthWrite={false}
            />
          </line>
        </group>
      ))}
    </group>
  );
}

// Default export wrapper containing the Canvas context
export default function SpinningGlobeCanvas() {
  return (
    <Canvas camera={{ position: [0, 0, 4.5], fov: 45 }} style={{ pointerEvents: 'none' }}>
       <ambientLight intensity={0.5} />
       <pointLight position={[10, 10, 10]} />
       <SpinningGlobe />
    </Canvas>
  );
}
