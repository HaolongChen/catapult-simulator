# Improve Simulation Precision

## Problem
User reports: "the simulator is not precise enough"

Analysis reveals:
- Timestep sensitivity: 1.045m position variation (POOR)
- Energy conservation: 0.188% drift (ACCEPTABLE but could be better)
- Constraint satisfaction: 0.247mm (EXCELLENT)

## Root Causes
1. `initialTimestep=0.005` is too large for 19-DOF stiff system
2. `tolerance=1e-6` allows too much error accumulation
3. No adaptive timestep refinement during critical phases (release)
4. Fixed RK4 without Richardson extrapolation

## Precision Improvement Plan

### Phase 1: Improved Default Settings
- [ ] Reduce `initialTimestep` from 0.005s to 0.001s
- [ ] Reduce `tolerance` from 1e-6 to 1e-8
- [ ] Increase `maxSubsteps` from 10 to 50
- [ ] Verify energy drift < 0.05%
- [ ] Verify timestep sensitivity < 0.1m

### Phase 2: Adaptive Timestep Refinement  
- [ ] Implement phase-aware timestep scaling
- [ ] Reduce timestep during release phase (±0.1s around release)
- [ ] Reduce timestep during high-acceleration phases
- [ ] Monitor constraint violation and adapt

### Phase 3: Richardson Extrapolation (Optional)
- [ ] Implement Richardson extrapolation for error estimation
- [ ] Use extrapolation to guide adaptive timestep
- [ ] Target < 0.01% energy drift

### Phase 4: Verification
- [ ] Run convergence study (timestep 0.01 → 0.0001)
- [ ] Verify < 0.1m position variation
- [ ] Verify < 0.05% energy drift
- [ ] Verify all 105 tests still pass
- [ ] Update CONFIG_GUIDE.md with precision notes

## Success Criteria
- ✓ Timestep sensitivity < 0.1m (currently 1.045m)
- ✓ Energy conservation < 0.05% (currently 0.188%)
- ✓ All existing tests pass
- ✓ 20s simulation completes without degraded mode
