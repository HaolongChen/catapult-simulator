import { VISUAL_CONSTANTS } from "../physics/constants";
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
    <Canvas camera={VISUAL_CONSTANTS.CAMERA_DEFAULT}>
      <ambientLight intensity={VISUAL_CONSTANTS.LIGHTS.AMBIENT_INTENSITY} />
      <pointLight
        position={VISUAL_CONSTANTS.LIGHTS.POINT_POSITION}
        intensity={VISUAL_CONSTANTS.LIGHTS.POINT_INTENSITY}
      />

      <Sphere
        position={frameData.projectile.position}
        args={[
          frameData.projectile.radius,
          VISUAL_CONSTANTS.GEOMETRY.SPHERE_SEGMENTS,
          VISUAL_CONSTANTS.GEOMETRY.SPHERE_SEGMENTS,
        ]}
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
        lineWidth={VISUAL_CONSTANTS.GEOMETRY.ARM_LINE_WIDTH}
      />

      <Sphere
        position={frameData.counterweight.position}
        args={[
          frameData.counterweight.radius,
          VISUAL_CONSTANTS.GEOMETRY.SPHERE_SEGMENTS,
          VISUAL_CONSTANTS.GEOMETRY.SPHERE_SEGMENTS,
        ]}
      >
        <meshStandardMaterial color="blue" />
      </Sphere>

      {frameData.sling.isAttached && (
        <Line
          points={[frameData.sling.startPoint, frameData.sling.endPoint]}
          color="brown"
          lineWidth={VISUAL_CONSTANTS.GEOMETRY.SLING_LINE_WIDTH}
        />
      )}

      <Plane
        args={[VISUAL_CONSTANTS.GROUND_SIZE, VISUAL_CONSTANTS.GROUND_SIZE]}
        rotation={VISUAL_CONSTANTS.GEOMETRY.GROUND_ROTATION}
        position={VISUAL_CONSTANTS.GEOMETRY.GROUND_POSITION}
      >
        <meshStandardMaterial color="green" />
      </Plane>

      <OrbitControls />
    </Canvas>
  );
}
