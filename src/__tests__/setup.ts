import { afterEach, beforeEach, expect, vi } from 'vitest'
import { cleanup } from '@testing-library/react'

// Cleanup React components after each test
afterEach(() => {
  cleanup()
})

// Custom matcher for floating point comparisons with relative tolerance
// Physics simulations require loose comparisons due to numerical precision
expect.extend({
  toBeCloseToPhysics(received: number, expected: number, tolerance = 1e-6) {
    const absExpected = Math.abs(expected)

    // Use relative tolerance for large numbers, absolute for small numbers
    const relativeTolerance = Math.max(tolerance, absExpected * 1e-8)
    const diff = Math.abs(received - expected)
    const pass = diff <= relativeTolerance

    return {
      pass,
      message: () =>
        pass
          ? `Expected ${received} not to be close to ${expected} within tolerance ${relativeTolerance}`
          : `Expected ${received} to be close to ${expected} within tolerance ${relativeTolerance}, got diff ${diff}`,
    }
  },
})

// Custom matcher for floating point comparisons with relative tolerance
// Physics simulations require loose comparisons due to numerical precision
expect.extend({
  toBeCloseToPhysics(received: number, expected: number, tolerance = 1e-6) {
    const absReceived = Math.abs(received)
    const absExpected = Math.abs(expected)

    // Use relative tolerance for large numbers, absolute for small numbers
    const relativeTolerance = Math.max(tolerance, absExpected * 1e-8)
    const diff = Math.abs(received - expected)
    const pass = diff <= relativeTolerance

    return {
      pass,
      message: () =>
        pass
          ? `Expected ${received} not to be close to ${expected} within tolerance ${relativeTolerance}`
          : `Expected ${received} to be close to ${expected} within tolerance ${relativeTolerance}, got diff ${diff}`,
    }
  },
})

// Custom matcher for vector/typed array comparisons
expect.extend({
  toBeCloseToVector(
    received: Float64Array | Float32Array,
    expected: Float64Array | Float32Array,
    tolerance = 1e-6,
  ) {
    if (received.length !== expected.length) {
      return {
        pass: false,
        message: () =>
          `Expected length ${received.length} to equal ${expected.length}`,
      }
    }

    const maxDiff = Math.max(
      ...Array.from({ length: received.length }, (_, i) =>
        Math.abs(received[i] - expected[i]),
      ),
    )

    const pass = maxDiff <= tolerance

    return {
      pass,
      message: () =>
        pass
          ? `Expected vectors to differ by more than ${tolerance}`
          : `Expected max diff ${maxDiff} to be <= tolerance ${tolerance}`,
    }
  },
})

// Mock performance.now() for deterministic timing
let mockTime = 0
beforeEach(() => {
  mockTime = 0
  vi.stubGlobal('performance', {
    now: () => {
      mockTime += 16.67 // Simulate 60 FPS
      return mockTime
    },
  })
})

afterEach(() => {
  vi.unstubAllGlobals()
})
