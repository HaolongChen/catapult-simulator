export const PHYSICS_CONSTANTS = {
  GRAVITY: 9.81,
  KKT_REGULARIZATION: 1e-12,
  MIN_PARTICLE_MASS: 0.001,
  SEA_LEVEL_TEMPERATURE: 288.15,
  NUM_SLING_PARTICLES: 5, // Number of segments in the soft sling
}

export const VISUAL_CONSTANTS = {
  GROUND_SIZE: 100,
  SLING_VIOLATION_THRESHOLD: 0.01,
  PLAYBACK_FPS: 60,
  CAMERA_DEFAULT: {
    position: [0, 5, 20] as [number, number, number],
    fov: 50,
  },
  LIGHTS: {
    AMBIENT_INTENSITY: 1.5,
    POINT_INTENSITY: 100,
    POINT_POSITION: [10, 10, 10] as [number, number, number],
  },
  GEOMETRY: {
    SPHERE_SEGMENTS: 32,
    ARM_LINE_WIDTH: 5,
    SLING_LINE_WIDTH: 2,
    GROUND_ROTATION: [-Math.PI / 2, 0, 0] as [number, number, number],
    GROUND_POSITION: [0, 0, 0] as [number, number, number],
  },
}

export const UI_CONSTANTS = {
  CONTROLS: {
    WIDTH: 1200,
    ICON_SIZE_LARGE: 24,
    ICON_SIZE_MEDIUM: 20,
    RESET_FRAME: 0,
    FPS_CONVERSION: 1000,
    BUTTON_SIZE_MAIN: 12,
    BUTTON_SIZE_SECONDARY: 10,
    PROGRESS_HEIGHT: 2,
    PLAY_ICON_OFFSET: 1,
  },
  OVERLAY: {
    WIDTH: 80,
    PRECISION_TIME: 3,
    PRECISION_COORDS: 2,
    PRECISION_VIOLATION: 2,
    UNIT_MILLIMETERS: 1000,
    GRID_COLS: 3,
    FONT_SIZE_LABEL: 8,
    FONT_SIZE_HEADER: 10,
    PADDING_ITEM: 2,
    TRACKING_WIDE: 0.2,
  },
  LAYOUT: {
    GAP_TINY: 1,
    GAP_SMALL: 2,
    GAP_MEDIUM: 4,
    GAP_LARGE: 6,
    OFFSET_STANDARD: 8,
  },
}

export const APP_METADATA = {
  TITLE: 'TREBUCHET_V1.0',
  SUBTITLE: 'High Fidelity Physics Simulator',
}
