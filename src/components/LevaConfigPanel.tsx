import { useControls, folder } from 'leva'
import type { SimulationConfig } from '@/physics/types'

export function usePhysicsControls() {
  const controls = useControls({
    Trebuchet: folder({
      counterweightMass: {
        value: 15000,
        min: 1000,
        max: 30000,
        step: 100,
        label: 'Counterweight Mass (kg)',
      },
      longArmLength: {
        value: 4.4,
        min: 2,
        max: 10,
        step: 0.1,
        label: 'Long Arm Length (m)',
      },
      shortArmLength: {
        value: 0.8,
        min: 0.3,
        max: 3,
        step: 0.1,
        label: 'Short Arm Length (m)',
      },
      counterweightRadius: {
        value: 0.8,
        min: 0.3,
        max: 2,
        step: 0.1,
        label: 'CW Radius (m)',
      },
      slingLength: {
        value: 3.5,
        min: 0.1,
        max: 10,
        step: 0.1,
        label: 'Sling Length (m)',
      },
      releaseAngle: {
        value: 120,
        min: 30,
        max: 150,
        step: 1,
        label: 'Release Angle (°)',
      },
      armMass: {
        value: 200,
        min: 50,
        max: 1000,
        step: 10,
        label: 'Arm Mass (kg)',
      },
      pivotHeight: {
        value: 3.0,
        min: 1,
        max: 10,
        step: 0.1,
        label: 'Pivot Height (m)',
      },
    }),

    Projectile: folder({
      mass: {
        value: 60,
        min: 10,
        max: 500,
        step: 1,
        label: 'Mass (kg)',
      },
      radius: {
        value: 0.1,
        min: 0.05,
        max: 0.5,
        step: 0.01,
        label: 'Radius (m)',
      },
      dragCoefficient: {
        value: 0.47,
        min: 0,
        max: 2,
        step: 0.01,
        label: 'Drag Coefficient',
      },
      magnusCoefficient: {
        value: 0.3,
        min: 0,
        max: 1,
        step: 0.01,
        label: 'Magnus Coefficient',
      },
      spin: {
        value: 0,
        min: -100,
        max: 100,
        step: 1,
        label: 'Spin (rad/s)',
      },
    }),

    Physics: folder({
      jointFriction: {
        value: 0.1,
        min: 0,
        max: 1,
        step: 0.01,
        label: 'Joint Friction',
      },
      angularDamping: {
        value: 5.0,
        min: 0,
        max: 20,
        step: 0.5,
        label: 'Angular Damping',
      },
    }),
  })

  const config: SimulationConfig = {
    initialTimestep: 0.005,
    maxSubsteps: 10,
    maxAccumulator: 1.0,
    tolerance: 1e-12,
    minTimestep: 1e-7,
    maxTimestep: 0.01,
    projectile: {
      mass: controls.mass,
      radius: controls.radius,
      area: Math.PI * controls.radius * controls.radius,
      dragCoefficient: controls.dragCoefficient,
      magnusCoefficient: controls.magnusCoefficient,
      momentOfInertia: new Float64Array([0.01, 0.01, 0.01]),
      spin: controls.spin,
    },
    trebuchet: {
      longArmLength: controls.longArmLength,
      shortArmLength: controls.shortArmLength,
      counterweightMass: controls.counterweightMass,
      counterweightRadius: controls.counterweightRadius,
      counterweightInertia: 2000,
      slingLength: controls.slingLength,
      releaseAngle: (controls.releaseAngle * Math.PI) / 180,
      jointFriction: controls.jointFriction,
      angularDamping: controls.angularDamping,
      armMass: controls.armMass,
      pivotHeight: controls.pivotHeight,
    },
  }

  return config
}
