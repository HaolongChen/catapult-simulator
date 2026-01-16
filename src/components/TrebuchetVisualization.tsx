import { VISUAL_CONSTANTS } from "../physics/constants";
import { Canvas, useGraph, useFrame } from "@react-three/fiber";
import {
  Line,
  Sphere,
  Plane,
  OrbitControls,
  useGLTF,
  Environment,
  ContactShadows,
  SoftShadows,
} from "@react-three/drei";
import type { FrameData } from "../physics/types";
import { Suspense, useEffect, useRef } from "react";
import * as THREE from "three";

function TrebuchetModel({ frameData }: { frameData: FrameData }) {
  const { scene } = useGLTF("/models/trebuchet.glb");
  const { nodes, materials } = useGraph(scene);

  const armRef = useRef<THREE.Object3D | null>(null);
  const cwRef = useRef<THREE.Object3D | null>(null);

  useEffect(() => {
    armRef.current =
      nodes.Arm || nodes.arm || scene.getObjectByName("Arm") || null;
    cwRef.current =
      nodes.Counterweight ||
      nodes.counterweight ||
      scene.getObjectByName("Counterweight") ||
      null;
  }, [nodes, scene]);

  useEffect(() => {
    Object.values(materials).forEach((material) => {
      if (material instanceof THREE.MeshStandardMaterial) {
        material.roughness = 0.6;
        material.metalness = 0.2;
        material.envMapIntensity = 1.0;
      }
    });
  }, [materials]);

  useFrame(() => {
    if (armRef.current) {
      armRef.current.rotation.z = frameData.arm.angle;
      armRef.current.position.set(
        frameData.arm.pivot[0],
        frameData.arm.pivot[1],
        frameData.arm.pivot[2],
      );
    }

    if (cwRef.current) {
      cwRef.current.position.set(
        frameData.counterweight.position[0],
        frameData.counterweight.position[1],
        frameData.counterweight.position[2],
      );
      cwRef.current.rotation.z = frameData.counterweight.angle;
    }
  });

  return <primitive object={scene} castShadow receiveShadow />;
}

export function TrebuchetVisualization({
  frameData,
}: {
  frameData?: FrameData;
}) {
  if (!frameData) return null;

  return (
    <Canvas
      shadows
      camera={{
        position: VISUAL_CONSTANTS.CAMERA_DEFAULT.position,
        fov: VISUAL_CONSTANTS.CAMERA_DEFAULT.fov,
      }}
      gl={{ antialias: true, preserveDrawingBuffer: true }}
    >
      <color attach="background" args={["#050505"]} />
      <SoftShadows size={25} samples={10} focus={0} />

      <ambientLight intensity={0.2} />
      <spotLight
        position={[15, 20, 15]}
        angle={0.3}
        penumbra={1}
        intensity={2}
        castShadow
        shadow-mapSize={[2048, 2048]}
      />

      <Environment preset="city" />

      <Suspense fallback={null}>
        <TrebuchetModel frameData={frameData} />
      </Suspense>

      <Sphere
        position={frameData.projectile.position}
        args={[
          frameData.projectile.radius,
          VISUAL_CONSTANTS.GEOMETRY.SPHERE_SEGMENTS,
          VISUAL_CONSTANTS.GEOMETRY.SPHERE_SEGMENTS,
        ]}
        castShadow
      >
        <meshStandardMaterial
          color="#d4af37"
          roughness={0.1}
          metalness={0.8}
          emissive="#d4af37"
          emissiveIntensity={0.2}
        />
      </Sphere>

      {frameData.sling.isAttached && (
        <Line
          points={[frameData.sling.startPoint, frameData.sling.endPoint]}
          color="#8b4513"
          lineWidth={2}
          transparent
          opacity={0.8}
        />
      )}

      <Plane
        args={[VISUAL_CONSTANTS.GROUND_SIZE, VISUAL_CONSTANTS.GROUND_SIZE]}
        rotation={VISUAL_CONSTANTS.GEOMETRY.GROUND_ROTATION}
        position={VISUAL_CONSTANTS.GEOMETRY.GROUND_POSITION}
        receiveShadow
      >
        <meshStandardMaterial color="#1a1a1a" roughness={0.8} metalness={0.1} />
      </Plane>

      <ContactShadows
        position={[0, 0, 0]}
        opacity={0.4}
        scale={20}
        blur={2}
        far={4.5}
      />

      <OrbitControls
        enableDamping
        dampingFactor={0.05}
        minDistance={5}
        maxDistance={50}
        maxPolarAngle={Math.PI / 2.1}
      />
    </Canvas>
  );
}
