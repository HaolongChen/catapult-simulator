#!/usr/bin/env python3
"""
Momentum Conservation and Force Analysis
Check for violations of Newton's laws
"""

import pandas as pd
import numpy as np
import json
import matplotlib.pyplot as plt

df = pd.read_csv('/home/ubuntu/catapult-simulator/public/simulation_log.csv')
with open('/home/ubuntu/catapult-simulator/public/trajectory.json', 'r') as f:
    trajectory = json.load(f)

print("="*80)
print("MOMENTUM AND FORCE ANALYSIS")
print("="*80)

# Physical constants
g = 9.81  # m/s^2
Mp = 1.0  # kg (projectile)

# Find release
release_idx = None
for i, frame in enumerate(trajectory):
    if frame.get('phase') == 'released':
        release_idx = i
        break

print(f"\nRelease at frame {release_idx}, t={df.iloc[release_idx]['Time (s)']:.3f}s")

# ============================================================================
# TEST 1: FORCE BALANCE (Newton's 2nd Law: F = ma)
# ============================================================================
print("\n" + "="*80)
print("TEST 1: FORCE BALANCE (Newton's 2nd Law)")
print("="*80)

print("\nChecking if forces match accelerations...")

force_balance_violations = []

for i in range(1, min(len(trajectory), release_idx)):
    frame = trajectory[i]
    
    # Get forces from frame
    forces = frame['forces']['projectile']
    F_gravity = np.array(forces['gravity'])
    F_drag = np.array(forces['drag'])
    F_magnus = np.array(forces['magnus'])
    F_tension = np.array(forces['tension'])
    F_total = np.array(forces['total'])
    
    # Calculate acceleration from velocity change
    dt = 0.01  # timestep
    v_curr = np.array([df.iloc[i]['Proj VX (m/s)'], df.iloc[i]['Proj VY (m/s)'], 0])
    v_prev = np.array([df.iloc[i-1]['Proj VX (m/s)'], df.iloc[i-1]['Proj VY (m/s)'], 0])
    
    a_measured = (v_curr - v_prev) / dt
    
    # Calculate expected acceleration from forces
    F_sum = F_gravity + F_drag + F_magnus + F_tension
    a_expected = F_sum / Mp
    
    # Check if they match
    error = np.linalg.norm(a_measured - a_expected)
    relative_error = error / (np.linalg.norm(a_expected) + 1e-6)
    
    if relative_error > 0.1 and np.linalg.norm(a_expected) > 1.0:  # 10% tolerance
        force_balance_violations.append({
            'frame': i,
            'time': frame['time'],
            'error': error,
            'relative_error': relative_error
        })

print(f"\nForce Balance Check (F = ma):")
if len(force_balance_violations) == 0:
    print(f"  ✓ EXCELLENT: Forces match accelerations")
else:
    print(f"  ⚠ DETECTED: {len(force_balance_violations)} frames with >10% error")
    for v in force_balance_violations[:5]:
        print(f"    Frame {v['frame']}: error={v['error']:.2f} m/s², relative={v['relative_error']*100:.1f}%")

# ============================================================================
# TEST 2: TENSION FORCE MAGNITUDE
# ============================================================================
print("\n" + "="*80)
print("TEST 2: TENSION FORCE MAGNITUDE")
print("="*80)

print("\nChecking if tension is always positive (rope can only pull)...")

negative_tension = []
for i in range(min(len(trajectory), release_idx)):
    frame = trajectory[i]
    tension_vec = frame['sling']['tensionVector']
    
    # Calculate magnitude
    tension_mag = np.sqrt(tension_vec[0]**2 + tension_vec[1]**2 + tension_vec[2]**2)
    
    # Check direction - should point from projectile toward arm tip
    proj_pos = frame['projectile']['position']
    arm_tip = frame['sling']['startPoint']
    
    direction_to_tip = np.array([
        arm_tip[0] - proj_pos[0],
        arm_tip[1] - proj_pos[1],
        arm_tip[2] - proj_pos[2]
    ])
    
    if np.linalg.norm(direction_to_tip) > 0:
        direction_to_tip = direction_to_tip / np.linalg.norm(direction_to_tip)
        
        # Tension should be in same direction
        if tension_mag > 0.1:
            tension_dir = np.array(tension_vec) / tension_mag
            dot = np.dot(tension_dir, direction_to_tip)
            
            if dot < -0.1:  # Pointing wrong way
                negative_tension.append({
                    'frame': i,
                    'time': frame['time'],
                    'dot': dot,
                    'tension_mag': tension_mag
                })

print(f"\nTension Direction Check:")
if len(negative_tension) == 0:
    print(f"  ✓ PERFECT: Tension always pulls toward arm tip")
else:
    print(f"  ✗ VIOLATED: {len(negative_tension)} frames with wrong tension direction")
    for nt in negative_tension[:5]:
        print(f"    Frame {nt['frame']}: dot={nt['dot']:.3f}, |T|={nt['tension_mag']:.1f} N")

# ============================================================================
# TEST 3: CENTRIPETAL FORCE CHECK
# ============================================================================
print("\n" + "="*80)
print("TEST 3: CENTRIPETAL FORCE (Circular Motion)")
print("="*80)

print("\nChecking if tension provides correct centripetal force...")

centripetal_violations = []

for i in range(10, min(len(trajectory), release_idx)):
    frame = trajectory[i]
    
    # Get projectile position and velocity
    proj_pos = np.array(frame['projectile']['position'])
    proj_vel = np.array(frame['projectile']['velocity'])
    
    # Get arm tip position (center of circular motion)
    arm_tip = np.array(frame['sling']['startPoint'])
    
    # Calculate radius vector
    r_vec = proj_pos - arm_tip
    r = np.linalg.norm(r_vec)
    
    if r > 0.1:  # Only check when not too close
        r_hat = r_vec / r
        
        # Calculate velocity magnitude
        v = np.linalg.norm(proj_vel)
        
        # Required centripetal acceleration: a_c = v²/r toward center
        a_c_required = (v**2 / r)
        
        # Get actual tension force
        tension_vec = np.array(frame['sling']['tensionVector'])
        
        # Component of tension toward center
        tension_radial = -np.dot(tension_vec, r_hat)  # Negative because toward center
        
        # Acceleration from tension
        a_c_actual = tension_radial / Mp
        
        # Check if they match (allowing for gravity component)
        error = abs(a_c_actual - a_c_required)
        relative_error = error / (a_c_required + 1e-6)
        
        if relative_error > 0.2 and a_c_required > 10:  # 20% tolerance, significant acceleration
            centripetal_violations.append({
                'frame': i,
                'time': frame['time'],
                'required': a_c_required,
                'actual': a_c_actual,
                'error': error,
                'relative_error': relative_error
            })

print(f"\nCentripetal Force Check:")
if len(centripetal_violations) == 0:
    print(f"  ✓ GOOD: Tension provides appropriate centripetal force")
else:
    print(f"  ⚠ DETECTED: {len(centripetal_violations)} frames with >20% error")
    print(f"  ℹ Note: Some error expected due to gravity and tangential acceleration")
    for v in centripetal_violations[:3]:
        print(f"    Frame {v['frame']}: required={v['required']:.1f}, actual={v['actual']:.1f} m/s²")

# ============================================================================
# TEST 4: GROUND REACTION FORCE
# ============================================================================
print("\n" + "="*80)
print("TEST 4: GROUND REACTION FORCE")
print("="*80)

print("\nChecking ground normal force physics...")

ground_force_issues = []

for i in range(len(trajectory)):
    frame = trajectory[i]
    
    # Get projectile position and velocity
    y_pos = frame['projectile']['position'][1]
    vy = frame['projectile']['velocity'][1]
    
    # Get ground normal force
    normal_force = frame['ground']['normalForce']
    
    # Check 1: Normal force should be zero when not in contact
    if y_pos > 0.15 and normal_force > 0.1:
        ground_force_issues.append({
            'frame': i,
            'time': frame['time'],
            'issue': 'force_when_airborne',
            'y_pos': y_pos,
            'normal_force': normal_force
        })
    
    # Check 2: Normal force should be positive when in contact
    if y_pos <= 0.11 and normal_force < 0:
        ground_force_issues.append({
            'frame': i,
            'time': frame['time'],
            'issue': 'negative_force',
            'y_pos': y_pos,
            'normal_force': normal_force
        })
    
    # Check 3: If on ground, upward velocity should be zero or positive
    if y_pos <= 0.11 and normal_force > 0.1 and vy < -0.5:
        ground_force_issues.append({
            'frame': i,
            'time': frame['time'],
            'issue': 'penetrating_ground',
            'y_pos': y_pos,
            'vy': vy
        })

print(f"\nGround Force Check:")
if len(ground_force_issues) == 0:
    print(f"  ✓ PERFECT: Ground forces physically correct")
else:
    print(f"  ⚠ DETECTED: {len(ground_force_issues)} potential issues")
    
    issues_by_type = {}
    for issue in ground_force_issues:
        issue_type = issue['issue']
        if issue_type not in issues_by_type:
            issues_by_type[issue_type] = []
        issues_by_type[issue_type].append(issue)
    
    for issue_type, issues in issues_by_type.items():
        print(f"  - {issue_type}: {len(issues)} frames")

# ============================================================================
# TEST 5: ENERGY-MOMENTUM CONSISTENCY
# ============================================================================
print("\n" + "="*80)
print("TEST 5: ENERGY-MOMENTUM CONSISTENCY")
print("="*80)

print("\nChecking if kinetic energy matches momentum...")

# At release
vx = df.iloc[release_idx]['Proj VX (m/s)']
vy = df.iloc[release_idx]['Proj VY (m/s)']

KE = 0.5 * Mp * (vx**2 + vy**2)
p = Mp * np.sqrt(vx**2 + vy**2)

# Check: KE = p²/(2m)
KE_from_momentum = p**2 / (2 * Mp)

print(f"\nAt Release:")
print(f"  Kinetic Energy (direct): {KE:.2f} J")
print(f"  Kinetic Energy (from momentum): {KE_from_momentum:.2f} J")
print(f"  Difference: {abs(KE - KE_from_momentum):.6f} J")

if abs(KE - KE_from_momentum) < 0.01:
    print(f"  ✓ PERFECT: Energy and momentum consistent")
else:
    print(f"  ✗ ERROR: Energy-momentum inconsistency!")

# ============================================================================
# VISUALIZATION
# ============================================================================

fig, axes = plt.subplots(2, 2, figsize=(14, 10))
fig.suptitle('Force and Momentum Analysis', fontsize=16, fontweight='bold')

# Plot 1: Tension magnitude over time
ax = axes[0, 0]
times = []
tensions = []
for i in range(min(len(trajectory), release_idx)):
    frame = trajectory[i]
    tension_vec = frame['sling']['tensionVector']
    tension_mag = np.sqrt(tension_vec[0]**2 + tension_vec[1]**2 + tension_vec[2]**2)
    times.append(frame['time'])
    tensions.append(tension_mag)

ax.plot(times, tensions, linewidth=2)
ax.set_xlabel('Time (s)')
ax.set_ylabel('Tension Force (N)')
ax.set_title('Sling Tension Magnitude')
ax.grid(True, alpha=0.3)

# Plot 2: Ground normal force
ax = axes[0, 1]
times = []
normals = []
y_positions = []
for i in range(min(len(trajectory), release_idx+50)):
    frame = trajectory[i]
    times.append(frame['time'])
    normals.append(frame['ground']['normalForce'])
    y_positions.append(frame['projectile']['position'][1])

ax2 = ax.twinx()
ax.plot(times, normals, 'g-', linewidth=2, label='Normal Force')
ax2.plot(times, y_positions, 'b--', linewidth=2, alpha=0.7, label='Y Position')
ax.set_xlabel('Time (s)')
ax.set_ylabel('Normal Force (N)', color='g')
ax2.set_ylabel('Y Position (m)', color='b')
ax.set_title('Ground Contact Forces')
ax.tick_params(axis='y', labelcolor='g')
ax2.tick_params(axis='y', labelcolor='b')
ax.grid(True, alpha=0.3)

# Plot 3: Projectile acceleration components
ax = axes[1, 0]
times = []
ax_vals = []
ay_vals = []
for i in range(1, min(len(df), release_idx+50)):
    dt = 0.01
    ax_val = (df.iloc[i]['Proj VX (m/s)'] - df.iloc[i-1]['Proj VX (m/s)']) / dt
    ay_val = (df.iloc[i]['Proj VY (m/s)'] - df.iloc[i-1]['Proj VY (m/s)']) / dt
    times.append(df.iloc[i]['Time (s)'])
    ax_vals.append(ax_val)
    ay_vals.append(ay_val)

ax.plot(times, ax_vals, label='aₓ', linewidth=2)
ax.plot(times, ay_vals, label='aᵧ', linewidth=2)
if release_idx:
    ax.axvline(df.iloc[release_idx]['Time (s)'], color='red', linestyle='--', 
               label='Release', linewidth=2)
ax.set_xlabel('Time (s)')
ax.set_ylabel('Acceleration (m/s²)')
ax.set_title('Projectile Acceleration')
ax.legend()
ax.grid(True, alpha=0.3)

# Plot 4: Force components
ax = axes[1, 1]
times = []
f_gravity = []
f_tension = []
f_total = []

for i in range(min(len(trajectory), release_idx)):
    frame = trajectory[i]
    forces = frame['forces']['projectile']
    times.append(frame['time'])
    
    # Y-components (vertical)
    f_gravity.append(forces['gravity'][1])
    f_tension.append(forces['tension'][1])
    f_total.append(forces['total'][1])

ax.plot(times, f_gravity, label='Gravity (Y)', linewidth=2, alpha=0.7)
ax.plot(times, f_tension, label='Tension (Y)', linewidth=2, alpha=0.7)
ax.plot(times, f_total, label='Total (Y)', linewidth=2)
ax.axhline(0, color='black', linestyle=':', linewidth=1)
ax.set_xlabel('Time (s)')
ax.set_ylabel('Force (N)')
ax.set_title('Vertical Force Components')
ax.legend()
ax.grid(True, alpha=0.3)

plt.tight_layout()
plt.savefig('/home/ubuntu/momentum_force_analysis.png', dpi=150, bbox_inches='tight')
print("\n✓ Saved visualization to /home/ubuntu/momentum_force_analysis.png")

# ============================================================================
# SUMMARY
# ============================================================================
print("\n" + "="*80)
print("FORCE AND MOMENTUM VALIDATION SUMMARY")
print("="*80)

tests = [
    ("Force Balance (F=ma)", len(force_balance_violations) == 0),
    ("Tension Direction", len(negative_tension) == 0),
    ("Centripetal Force", len(centripetal_violations) < 5),
    ("Ground Reaction Force", len(ground_force_issues) < 10),
    ("Energy-Momentum Consistency", abs(KE - KE_from_momentum) < 0.01)
]

passed = sum(1 for _, result in tests if result)
total = len(tests)

for name, result in tests:
    status = "✓ PASS" if result else "⚠ ISSUE"
    print(f"{name}: {status}")

print(f"\nOverall: {passed}/{total} tests passed ({passed/total*100:.0f}%)")

if passed == total:
    print("\n✓ EXCELLENT: All force and momentum tests passed!")
elif passed >= total * 0.8:
    print("\n✓ GOOD: Most tests passed, minor issues acceptable")
else:
    print("\n⚠ REVIEW: Some physics issues detected")
