// A real 3D object (glTF/GLB, e.g. from Poly Haven via assets/find.mjs --kind model) turning on a board,
// like the dice, mortarboard and hourglass in the reference. Needs @remotion/three, three, @react-three/fiber.
//   <Model3D t={t} at={at(40)} url="assets/dice/dice_2k.gltf" x={240} y={900} w={600} h={600} spin={0.6} />
// The model is centred and scaled to fit; its pose is a function of t (spin turns per second, a drop-in at `at`).
import React, { useEffect, useState } from "react";
import { ThreeCanvas } from "@remotion/three";
import { continueRender, delayRender, interpolate, staticFile, useVideoConfig } from "remotion";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { cl, easeOut } from "./fx";

const useGltf = (url: string) => {
  const [scene, setScene] = useState<THREE.Object3D | null>(null);
  const [handle] = useState(() => delayRender(`gltf ${url}`, { timeoutInMilliseconds: 60000 }));
  useEffect(() => {
    new GLTFLoader().load(/^(https?:|\/)/.test(url) ? url : staticFile(url), (g) => {
      const root = g.scene;
      const box = new THREE.Box3().setFromObject(root), size = box.getSize(new THREE.Vector3()), centre = box.getCenter(new THREE.Vector3());
      root.position.sub(centre);
      const wrap = new THREE.Group(); wrap.add(root); wrap.scale.setScalar(2 / Math.max(size.x, size.y, size.z));
      setScene(wrap); continueRender(handle);
    }, undefined, (e) => { console.error(e); continueRender(handle); });
  }, [url, handle]);
  return scene;
};

export const Model3D: React.FC<{ t: number; at: number; url: string; x: number; y: number; w: number; h: number;
  spin?: number; tilt?: number; yaw0?: number; drop?: boolean; bw?: boolean; zoom?: number }> = ({
  t, at, url, x, y, w, h, spin = 0.35, tilt = 0.35, yaw0 = 0.6, drop = true, bw = false, zoom = 1,
}) => {
  const scene = useGltf(url);
  const { fps } = useVideoConfig();
  if (t < at - 1 / fps) return <div style={{ position: "absolute", left: x, top: y, width: w, height: h }} />;
  const k = interpolate(t, [at, at + 0.55], [0, 1], { ...cl, easing: easeOut });
  const yaw = yaw0 + (t - at) * spin * Math.PI * 2 + (drop ? (1 - k) * 1.4 : 0);
  return (
    <div style={{ position: "absolute", left: x, top: y, width: w, height: h, filter: `${bw ? "grayscale(1) contrast(1.1) " : ""}drop-shadow(0 30px 30px rgba(0,0,0,.22))`, opacity: Math.min(1, k * 2) }}>
      <ThreeCanvas width={w} height={h} camera={{ position: [0, 0.25, 3.2 / zoom], fov: 40 }} gl={{ alpha: true, antialias: true, preserveDrawingBuffer: true }}>
        <ambientLight intensity={0.9} />
        <hemisphereLight args={["#ffffff", "#bbbbbb", 0.8]} />
        <directionalLight position={[3, 4, 5]} intensity={2.2} />
        <directionalLight position={[-4, 2, -2]} intensity={0.6} />
        {scene && <primitive object={scene} rotation={[tilt, yaw, 0]} position={[0, drop ? (1 - k) * 1.6 : 0, 0]} />}
      </ThreeCanvas>
    </div>
  );
};
