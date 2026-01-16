import { Canvas } from "@react-three/fiber";
import { Line, Sphere, Plane, OrbitControls } from "@react-three/drei";
import type { FrameData } from "../physics/types";

export function TrebuchetVisualization({
  frameData,
}: {
  frameData?: FrameData;
}) {
  if (!frameData) return null;

  return (
    <Canvas camera={{ position: [0, 5, 20], fov: 50 }}>
      <ambientLight intensity={1.5} />
      <pointLight position={[10, 10, 10]} intensity={100} />

      <Sphere
        position={frameData.projectile.position}
        args={[frameData.projectile.radius, 32, 32]}
      >
        <meshStandardMaterial color="red" />
      </Sphere>

      <Line
        points={[
          frameData.arm.shortArmTip,
          frameData.arm.pivot,
          frameData.arm.longArmTip,
        ]}
        color="gray"
        lineWidth={5}
      />

      <Sphere
        position={frameData.counterweight.position}
        args={[frameData.counterweight.radius, 32, 32]}
      >
        <meshStandardMaterial color="blue" />
      </Sphere>

      {frameData.sling.isAttached && (
        <Line
          points={[frameData.sling.startPoint, frameData.sling.endPoint]}
          color="brown"
          lineWidth={2}
        />
      )}

      <Plane
        args={[100, 100]}
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0, 0]}
      >
        <meshStandardMaterial color="green" />
      </Plane>

      <OrbitControls />
    </Canvas>
  );
}
