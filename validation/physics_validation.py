#!/usr/bin/env python3
"""
Comprehensive Physics Validation for Trebuchet Simulator
Checks for violations of fundamental physics laws
"""

import pandas as pd
import numpy as np
import json
import matplotlib.pyplot as plt

# Load data
df = pd.read_csv('/home/ubuntu/catapult-simulator/public/simulation_log.csv')
with open('/home/ubuntu/catapult-simulator/public/trajectory.json', 'r') as f:
    trajectory = json.load(f)

print("="*80)
print("COMPREHENSIVE PHYSICS VALIDATION")
print("="*80)

# Physical constants
g = 9.81  # m/s^2

# System parameters (from config)
Mcw = 1750.0  # kg (counterweight) - actual from config
Mp = 1.0      # kg (projectile)
Ma = 200.0    # kg (arm)
L1 = 4.4      # m (long arm)
L2 = 0.8      # m (short arm)
Ls = 3.5      # m (sling length)
Rcw = 0.8     # m (counterweight radius)
H = 3.0       # m (pivot height)
Icw = 500.0   # kg⋅m² (counterweight inertia)

print(f"\nSystem Parameters:")
print(f"  Counterweight: {Mcw} kg, radius {Rcw} m, inertia {Icw} kg⋅m²")
print(f"  Projectile: {Mp} kg")
print(f"  Arm: {Ma} kg, long arm {L1} m, short arm {L2} m")
print(f"  Sling: {Ls} m")
print(f"  Pivot height: {H} m")

# Find release frame
release_idx = None
for i, frame in enumerate(trajectory):
    if frame.get('phase') == 'released':
        release_idx = i
        break

print(f"\nRelease at frame {release_idx}, t={df.iloc[release_idx]['Time (s)']:.3f}s")

# ============================================================================
# TEST 1: ENERGY CONSERVATION
# ============================================================================
print("\n" + "="*80)
print("TEST 1: ENERGY CONSERVATION")
print("="*80)

def calculate_total_energy(frame_idx):
    """Calculate total system energy at a given frame"""
    frame = trajectory[frame_idx]
    row = df.iloc[frame_idx]
    
    # Projectile kinetic energy
    vx = row['Proj VX (m/s)']
    vy = row['Proj VY (m/s)']
    v_proj = np.sqrt(vx**2 + vy**2)
    KE_proj = 0.5 * Mp * v_proj**2
    
    # Projectile potential energy
    y_proj = row['Proj Y (m)']
    PE_proj = Mp * g * y_proj
    
    # Arm rotational energy
    arm_omega = np.radians(row['Arm Omega (deg/s)'])
    Ia = (1/3) * (Ma / (L1 + L2)) * (L1**3 + L2**3)
    KE_arm = 0.5 * Ia * arm_omega**2
    
    # Counterweight kinetic energy (translational + rotational)
    cw_pos = frame['counterweight']['position']
    # Estimate CW velocity from position differences
    if frame_idx > 0:
        prev_pos = trajectory[frame_idx-1]['counterweight']['position']
        dt = 0.01  # timestep
        vx_cw = (cw_pos[0] - prev_pos[0]) / dt
        vy_cw = (cw_pos[1] - prev_pos[1]) / dt
    else:
        vx_cw = vy_cw = 0
    
    KE_cw_trans = 0.5 * Mcw * (vx_cw**2 + vy_cw**2)
    
    cw_omega = np.radians(row['Weight Rel Omega (deg/s)'])
    KE_cw_rot = 0.5 * Icw * cw_omega**2
    
    # Counterweight potential energy
    y_cw = cw_pos[1]
    PE_cw = Mcw * g * y_cw
    
    # Arm potential energy (center of mass)
    arm_angle = np.radians(row['Arm Angle (deg)'])
    # Arm COM is at weighted average of long and short arms
    arm_com_dist = (L1**2 - L2**2) / (2 * (L1 + L2))
    y_arm_com = H + arm_com_dist * np.sin(arm_angle)
    PE_arm = Ma * g * y_arm_com
    
    total_KE = KE_proj + KE_arm + KE_cw_trans + KE_cw_rot
    total_PE = PE_proj + PE_cw + PE_arm
    total_E = total_KE + total_PE
    
    return {
        'total': total_E,
        'KE': total_KE,
        'PE': total_PE,
        'KE_proj': KE_proj,
        'PE_proj': PE_proj,
        'KE_arm': KE_arm,
        'PE_arm': PE_arm,
        'KE_cw': KE_cw_trans + KE_cw_rot,
        'PE_cw': PE_cw
    }

# Calculate energy at key points
E_initial = calculate_total_energy(0)
E_release = calculate_total_energy(release_idx)

print(f"\nInitial Energy (t=0):")
print(f"  Total: {E_initial['total']:.1f} J")
print(f"  Kinetic: {E_initial['KE']:.1f} J")
print(f"  Potential: {E_initial['PE']:.1f} J")

print(f"\nEnergy at Release (t={df.iloc[release_idx]['Time (s)']:.3f}s):")
print(f"  Total: {E_release['total']:.1f} J")
print(f"  Kinetic: {E_release['KE']:.1f} J")
print(f"  Potential: {E_release['PE']:.1f} J")

energy_loss = E_initial['total'] - E_release['total']
energy_loss_pct = (energy_loss / E_initial['total']) * 100

print(f"\nEnergy Change:")
print(f"  ΔE = {energy_loss:.1f} J ({energy_loss_pct:.1f}% loss)")

# Calculate energy over time
energy_history = []
for i in range(0, min(len(trajectory), release_idx+50), 5):
    E = calculate_total_energy(i)
    energy_history.append({
        'frame': i,
        'time': df.iloc[i]['Time (s)'],
        'total': E['total'],
        'KE': E['KE'],
        'PE': E['PE']
    })

energy_df = pd.DataFrame(energy_history)
energy_variation = energy_df['total'].std() / energy_df['total'].mean()

print(f"\nEnergy Conservation Quality:")
print(f"  Mean energy: {energy_df['total'].mean():.1f} J")
print(f"  Std deviation: {energy_df['total'].std():.1f} J")
print(f"  Coefficient of variation: {energy_variation:.4f} ({energy_variation*100:.2f}%)")

if energy_variation < 0.01:
    print("  ✓ EXCELLENT: Energy conserved to within 1%")
elif energy_variation < 0.05:
    print("  ✓ GOOD: Energy conserved to within 5%")
elif energy_variation < 0.10:
    print("  ⚠ ACCEPTABLE: Energy conserved to within 10%")
else:
    print("  ✗ POOR: Energy not well conserved (>10% variation)")

# ============================================================================
# TEST 2: CONSTRAINT SATISFACTION
# ============================================================================
print("\n" + "="*80)
print("TEST 2: CONSTRAINT SATISFACTION")
print("="*80)

# Check sling length constraint
sling_violations = []
for i in range(min(len(trajectory), release_idx)):
    frame = trajectory[i]
    if 'constraints' in frame and 'slingLength' in frame['constraints']:
        violation = frame['constraints']['slingLength']['violation']
        if abs(violation) > 0.01:  # 1cm tolerance
            sling_violations.append({
                'frame': i,
                'time': frame['time'],
                'violation': violation * 100  # convert to cm
            })

print(f"\nSling Length Constraint (before release):")
if len(sling_violations) == 0:
    print(f"  ✓ PERFECT: No violations > 1cm")
else:
    print(f"  ✗ VIOLATED: {len(sling_violations)} frames with violations > 1cm")
    max_violation = max(sling_violations, key=lambda x: abs(x['violation']))
    print(f"  Max violation: {max_violation['violation']:.2f} cm at t={max_violation['time']:.3f}s")

# Check counterweight hinge constraint
print(f"\nCounterweight Hinge Constraint:")
cw_violations = []
for i in range(min(len(trajectory), release_idx)):
    frame = trajectory[i]
    cw_pos = frame['counterweight']['position']
    short_tip = frame['arm']['shortArmTip']
    
    # CW should be at distance Rcw from short arm tip
    dx = cw_pos[0] - short_tip[0]
    dy = cw_pos[1] - short_tip[1]
    dist = np.sqrt(dx**2 + dy**2)
    violation = abs(dist - Rcw)
    
    if violation > 0.01:  # 1cm tolerance
        cw_violations.append({
            'frame': i,
            'time': frame['time'],
            'violation': violation * 100
        })

if len(cw_violations) == 0:
    print(f"  ✓ PERFECT: No violations > 1cm")
else:
    print(f"  ✗ VIOLATED: {len(cw_violations)} frames with violations > 1cm")
    max_violation = max(cw_violations, key=lambda x: abs(x['violation']))
    print(f"  Max violation: {max_violation['violation']:.2f} cm at t={max_violation['time']:.3f}s")

# ============================================================================
# TEST 3: VELOCITY CONTINUITY
# ============================================================================
print("\n" + "="*80)
print("TEST 3: VELOCITY CONTINUITY")
print("="*80)

# Check for velocity discontinuities
velocity_jumps = []
for i in range(1, min(len(df), release_idx+10)):
    vx_prev = df.iloc[i-1]['Proj VX (m/s)']
    vy_prev = df.iloc[i-1]['Proj VY (m/s)']
    vx_curr = df.iloc[i]['Proj VX (m/s)']
    vy_curr = df.iloc[i]['Proj VY (m/s)']
    
    v_prev = np.sqrt(vx_prev**2 + vy_prev**2)
    v_curr = np.sqrt(vx_curr**2 + vy_curr**2)
    
    dv = abs(v_curr - v_prev)
    dt = 0.01  # timestep
    acceleration = dv / dt
    
    # Check if acceleration is physically reasonable (< 1000 m/s²)
    if acceleration > 1000 and i != release_idx:
        velocity_jumps.append({
            'frame': i,
            'time': df.iloc[i]['Time (s)'],
            'dv': dv,
            'acceleration': acceleration
        })

print(f"\nVelocity Discontinuities (excluding release):")
if len(velocity_jumps) == 0:
    print(f"  ✓ PERFECT: No unphysical velocity jumps")
else:
    print(f"  ✗ DETECTED: {len(velocity_jumps)} frames with acceleration > 1000 m/s²")
    for jump in velocity_jumps[:5]:
        print(f"    Frame {jump['frame']}: Δv={jump['dv']:.2f} m/s, a={jump['acceleration']:.0f} m/s²")

# Check release continuity specifically
if release_idx and release_idx > 0:
    vx_before = df.iloc[release_idx-1]['Proj VX (m/s)']
    vy_before = df.iloc[release_idx-1]['Proj VY (m/s)']
    vx_at = df.iloc[release_idx]['Proj VX (m/s)']
    vy_at = df.iloc[release_idx]['Proj VY (m/s)']
    
    v_before = np.sqrt(vx_before**2 + vy_before**2)
    v_at = np.sqrt(vx_at**2 + vy_at**2)
    
    dv_release = abs(v_at - v_before)
    
    print(f"\nVelocity Continuity at Release:")
    print(f"  Before: {v_before:.2f} m/s")
    print(f"  At release: {v_at:.2f} m/s")
    print(f"  Jump: {dv_release:.2f} m/s")
    
    if dv_release < 0.5:
        print(f"  ✓ EXCELLENT: Smooth release (Δv < 0.5 m/s)")
    elif dv_release < 1.0:
        print(f"  ✓ GOOD: Acceptable release (Δv < 1.0 m/s)")
    else:
        print(f"  ⚠ WARNING: Noticeable velocity jump at release")

# ============================================================================
# TEST 4: ANGULAR MOMENTUM (for projectile after release)
# ============================================================================
print("\n" + "="*80)
print("TEST 4: ANGULAR MOMENTUM (Post-Release)")
print("="*80)

if release_idx and release_idx < len(trajectory) - 10:
    # After release, projectile angular momentum should be conserved (no external torques)
    L_values = []
    for i in range(release_idx, min(release_idx + 50, len(trajectory))):
        frame = trajectory[i]
        pos = frame['projectile']['position']
        vel = frame['projectile']['velocity']
        
        # Angular momentum about origin: L = r × p = r × mv
        Lz = pos[0] * vel[1] - pos[1] * vel[0]  # z-component
        L_values.append(Lz * Mp)
    
    if len(L_values) > 1:
        L_mean = np.mean(L_values)
        L_std = np.std(L_values)
        L_variation = L_std / abs(L_mean) if L_mean != 0 else 0
        
        print(f"\nAngular Momentum (after release, about origin):")
        print(f"  Mean: {L_mean:.2f} kg⋅m²/s")
        print(f"  Std deviation: {L_std:.2f} kg⋅m²/s")
        print(f"  Variation: {L_variation*100:.2f}%")
        
        # Note: Angular momentum won't be perfectly conserved due to gravity torque
        print(f"  ℹ Note: Some variation expected due to gravity torque")

# ============================================================================
# TEST 5: GROUND PENETRATION
# ============================================================================
print("\n" + "="*80)
print("TEST 5: GROUND PENETRATION")
print("="*80)

penetrations = []
for i in range(len(df)):
    y_proj = df.iloc[i]['Proj Y (m)']
    proj_radius = 0.1  # from config
    
    if y_proj < proj_radius:
        penetration = proj_radius - y_proj
        if penetration > 0.001:  # 1mm tolerance
            penetrations.append({
                'frame': i,
                'time': df.iloc[i]['Time (s)'],
                'penetration': penetration * 100  # cm
            })

print(f"\nGround Penetration Check:")
if len(penetrations) == 0:
    print(f"  ✓ PERFECT: No ground penetration")
else:
    print(f"  ⚠ DETECTED: {len(penetrations)} frames with penetration > 1mm")
    max_pen = max(penetrations, key=lambda x: x['penetration'])
    print(f"  Max penetration: {max_pen['penetration']:.2f} cm at t={max_pen['time']:.3f}s")
    print(f"  ℹ Note: Small penetrations acceptable for contact modeling")

# ============================================================================
# TEST 6: SLING TENSION DIRECTION
# ============================================================================
print("\n" + "="*80)
print("TEST 6: SLING TENSION DIRECTION")
print("="*80)

wrong_direction = []
for i in range(min(len(trajectory), release_idx)):
    frame = trajectory[i]
    
    # Sling should pull projectile toward arm tip
    proj_pos = frame['projectile']['position']
    arm_tip = frame['sling']['startPoint']
    
    # Direction from projectile to arm tip
    dx = arm_tip[0] - proj_pos[0]
    dy = arm_tip[1] - proj_pos[1]
    dist = np.sqrt(dx**2 + dy**2)
    
    if dist > 0:
        expected_dir = np.array([dx/dist, dy/dist, 0])
        
        # Tension vector from frame
        tension = frame['sling']['tensionVector']
        tension_mag = np.sqrt(tension[0]**2 + tension[1]**2 + tension[2]**2)
        
        if tension_mag > 0.1:  # Only check when tension is significant
            tension_dir = np.array([tension[0]/tension_mag, tension[1]/tension_mag, tension[2]/tension_mag])
            
            # Dot product should be positive (same direction)
            dot = np.dot(expected_dir, tension_dir)
            
            if dot < 0:
                wrong_direction.append({
                    'frame': i,
                    'time': frame['time'],
                    'dot': dot
                })

print(f"\nSling Tension Direction (before release):")
if len(wrong_direction) == 0:
    print(f"  ✓ PERFECT: Tension always pulls toward arm tip")
else:
    print(f"  ✗ VIOLATED: {len(wrong_direction)} frames with wrong tension direction")
    for wd in wrong_direction[:5]:
        print(f"    Frame {wd['frame']}: dot product = {wd['dot']:.3f}")

# ============================================================================
# TEST 7: RELEASE ANGLE OPTIMALITY
# ============================================================================
print("\n" + "="*80)
print("TEST 7: RELEASE ANGLE OPTIMALITY")
print("="*80)

if release_idx:
    vx_rel = df.iloc[release_idx]['Proj VX (m/s)']
    vy_rel = df.iloc[release_idx]['Proj VY (m/s)']
    release_angle = np.degrees(np.arctan2(vy_rel, vx_rel))
    
    print(f"\nProjectile Velocity Angle at Release:")
    print(f"  Angle: {release_angle:.1f}°")
    print(f"  Optimal for max range: 45°")
    print(f"  Deviation: {abs(release_angle - 45):.1f}°")
    
    if abs(release_angle - 45) < 5:
        print(f"  ✓ EXCELLENT: Within 5° of optimal")
    elif abs(release_angle - 45) < 10:
        print(f"  ✓ GOOD: Within 10° of optimal")
    elif abs(release_angle - 45) < 20:
        print(f"  ⚠ ACCEPTABLE: Within 20° of optimal")
    else:
        print(f"  ✗ SUBOPTIMAL: More than 20° from optimal")

# ============================================================================
# SUMMARY
# ============================================================================
print("\n" + "="*80)
print("PHYSICS VALIDATION SUMMARY")
print("="*80)

tests_passed = 0
tests_total = 7

print(f"\n1. Energy Conservation: ", end="")
if energy_variation < 0.10:
    print("✓ PASS")
    tests_passed += 1
else:
    print("✗ FAIL")

print(f"2. Sling Length Constraint: ", end="")
if len(sling_violations) == 0:
    print("✓ PASS")
    tests_passed += 1
else:
    print("✗ FAIL")

print(f"3. Counterweight Hinge Constraint: ", end="")
if len(cw_violations) == 0:
    print("✓ PASS")
    tests_passed += 1
else:
    print("✗ FAIL")

print(f"4. Velocity Continuity: ", end="")
if len(velocity_jumps) == 0:
    print("✓ PASS")
    tests_passed += 1
else:
    print("✗ FAIL")

print(f"5. Ground Penetration: ", end="")
if len(penetrations) < 10:  # Allow some for contact modeling
    print("✓ PASS")
    tests_passed += 1
else:
    print("✗ FAIL")

print(f"6. Sling Tension Direction: ", end="")
if len(wrong_direction) == 0:
    print("✓ PASS")
    tests_passed += 1
else:
    print("✗ FAIL")

print(f"7. Release Angle Optimality: ", end="")
if release_idx and abs(release_angle - 45) < 20:
    print("✓ PASS")
    tests_passed += 1
else:
    print("✗ FAIL")

print(f"\n{'='*80}")
print(f"OVERALL: {tests_passed}/{tests_total} tests passed ({tests_passed/tests_total*100:.0f}%)")
print(f"{'='*80}")

if tests_passed == tests_total:
    print("\n🎉 EXCELLENT: All physics tests passed!")
elif tests_passed >= tests_total * 0.8:
    print("\n✓ GOOD: Most physics tests passed, minor issues detected")
elif tests_passed >= tests_total * 0.6:
    print("\n⚠ ACCEPTABLE: Some physics violations detected, review recommended")
else:
    print("\n✗ POOR: Multiple physics violations detected, fixes required")

# Create visualization
fig, axes = plt.subplots(2, 2, figsize=(14, 10))
fig.suptitle('Physics Validation Analysis', fontsize=16, fontweight='bold')

# Plot 1: Energy over time
ax = axes[0, 0]
ax.plot(energy_df['time'], energy_df['total'], label='Total Energy', linewidth=2)
ax.plot(energy_df['time'], energy_df['KE'], label='Kinetic Energy', linewidth=2, alpha=0.7)
ax.plot(energy_df['time'], energy_df['PE'], label='Potential Energy', linewidth=2, alpha=0.7)
if release_idx:
    ax.axvline(df.iloc[release_idx]['Time (s)'], color='red', linestyle='--', label='Release', linewidth=2)
ax.set_xlabel('Time (s)')
ax.set_ylabel('Energy (J)')
ax.set_title('Energy Conservation')
ax.legend()
ax.grid(True, alpha=0.3)

# Plot 2: Constraint violations
ax = axes[0, 1]
if len(sling_violations) > 0:
    times = [v['time'] for v in sling_violations]
    viols = [abs(v['violation']) for v in sling_violations]
    ax.scatter(times, viols, label='Sling Length', alpha=0.6, s=20)
if len(cw_violations) > 0:
    times = [v['time'] for v in cw_violations]
    viols = [abs(v['violation']) for v in cw_violations]
    ax.scatter(times, viols, label='CW Hinge', alpha=0.6, s=20)
ax.set_xlabel('Time (s)')
ax.set_ylabel('Violation (cm)')
ax.set_title('Constraint Violations')
ax.legend()
ax.grid(True, alpha=0.3)
if len(sling_violations) == 0 and len(cw_violations) == 0:
    ax.text(0.5, 0.5, 'No Violations Detected', ha='center', va='center', 
            transform=ax.transAxes, fontsize=14, color='green')

# Plot 3: Velocity magnitude over time
ax = axes[1, 0]
times = df['Time (s)'][:min(len(df), release_idx+100)]
velocities = np.sqrt(df['Proj VX (m/s)'][:len(times)]**2 + df['Proj VY (m/s)'][:len(times)]**2)
ax.plot(times, velocities, linewidth=2)
if release_idx:
    ax.axvline(df.iloc[release_idx]['Time (s)'], color='red', linestyle='--', label='Release', linewidth=2)
if len(velocity_jumps) > 0:
    for jump in velocity_jumps:
        ax.axvline(jump['time'], color='orange', linestyle=':', alpha=0.5, linewidth=1)
ax.set_xlabel('Time (s)')
ax.set_ylabel('Velocity Magnitude (m/s)')
ax.set_title('Velocity Continuity')
ax.legend()
ax.grid(True, alpha=0.3)

# Plot 4: Test results summary
ax = axes[1, 1]
ax.axis('off')
test_names = [
    'Energy Conservation',
    'Sling Constraint',
    'CW Hinge Constraint',
    'Velocity Continuity',
    'Ground Penetration',
    'Tension Direction',
    'Release Angle'
]
test_results = [
    energy_variation < 0.10,
    len(sling_violations) == 0,
    len(cw_violations) == 0,
    len(velocity_jumps) == 0,
    len(penetrations) < 10,
    len(wrong_direction) == 0,
    release_idx and abs(release_angle - 45) < 20
]

y_pos = 0.9
for name, result in zip(test_names, test_results):
    color = 'green' if result else 'red'
    symbol = '✓' if result else '✗'
    ax.text(0.1, y_pos, f"{symbol} {name}", fontsize=12, color=color, 
            verticalalignment='center', fontweight='bold')
    y_pos -= 0.12

# Overall score
ax.text(0.1, 0.15, f"Overall Score: {tests_passed}/{tests_total}", 
        fontsize=14, fontweight='bold', 
        bbox=dict(boxstyle='round', facecolor='lightblue', alpha=0.5))

plt.tight_layout()
plt.savefig('/home/ubuntu/physics_validation.png', dpi=150, bbox_inches='tight')
print("\n✓ Saved visualization to /home/ubuntu/physics_validation.png")
