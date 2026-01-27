# Quick Start Guide - Leva Panel

## 🚀 Get Started in 3 Steps

### 1. Start the App
```bash
npm run dev
```

### 2. Open Browser
Navigate to: `http://localhost:5173/`

### 3. Play with Physics!
- **Adjust sliders** in the Leva panel (top-right corner)
- **Watch trajectory update** automatically (after 300ms)
- **Click "Export Trajectory"** to download data

## 🎮 What You Can Control

### Trebuchet Settings
- **Counterweight Mass** (1000-30000 kg) - Heavier = more power
- **Sling Length** (0.1-10 m) - Longer = higher arc
- **Release Angle** (30-150°) - Optimal around 120°
- **Arm Lengths** - Balance between power and control

### Projectile Settings
- **Mass** (10-500 kg) - Heavier = shorter distance
- **Radius** (0.05-0.5 m) - Affects air resistance
- **Drag Coefficient** (0-2) - Higher = more air resistance
- **Spin** (-100 to 100 rad/s) - Magnus effect (curve)

### Physics Tuning
- **Joint Friction** (0-1) - Energy loss at pivot
- **Angular Damping** (0-20) - Rotational resistance

## 🎯 Try These Experiments

### Maximum Distance
- Set counterweight to 25000 kg
- Sling length to 6 m
- Release angle to 120°
- Projectile mass to 60 kg

### High Arc
- Increase sling length to 8 m
- Release angle to 140°
- Watch it fly!

### Heavy Payload
- Projectile mass to 300 kg
- Increase counterweight to compensate
- See how trajectory changes

### Spin Effects
- Set spin to 50 rad/s
- Enable Magnus coefficient (0.5)
- Watch the curve!

## 📊 Understanding the UI

### Loading Indicator
Blue "Simulating..." badge appears while computing (1-2 seconds)

### Export Button
- Located top-right corner
- Downloads JSON file with all trajectory data
- Disabled during simulation

### Animation Controls
- **Play/Pause** - Control playback
- **Scrub bar** - Jump to any frame
- **Speed selector** - Adjust playback speed (0.25x - 2x)

### Debug Overlay
- Shows live telemetry (left side)
- Real-time forces, velocities, constraints
- Expand sections to see details

## ⚠️ Tips & Warnings

### Performance
- Simulation takes ~1 second per update
- 300ms debounce prevents lag during slider drag
- Extreme values may cause slower computation

### Stability
- Very long slings (>7m) may cause instability
- Very heavy counterweights (>8000kg) may stuck simulation
- Safe ranges are pre-configured in sliders

### Best Practices
- Make small adjustments to see effects
- Watch the telemetry for insights
- Export interesting configurations for later

## 🐛 Troubleshooting

### "Simulation stuck" warning
- Reduce counterweight mass
- Shorten sling length
- Reset to defaults (reload page)

### Slow performance
- Close other browser tabs
- Reduce friction/damping values
- Check browser console for errors

### Trajectory looks weird
- Check for extreme parameter values
- Verify physical constraints (e.g., sling not too long)
- Try resetting parameters

## 📦 Exporting Data

The exported JSON contains:
- 2000+ frames of simulation data
- Projectile position, velocity, orientation
- Arm angle and angular velocity
- Counterweight position and forces
- Sling tension and attachment points
- Ground contact information
- Phase indicators (swinging/released)

Use exported data for:
- External analysis
- Comparison between configurations
- Machine learning training
- Scientific visualization

## 🔧 Advanced Usage

### Keyboard Shortcuts (Animation)
- **Space** - Play/Pause
- **Left/Right Arrows** - Scrub frames (when paused)
- **Mouse Wheel** - Zoom canvas (on visualization)

### Developer Tools
- Open browser DevTools (F12)
- Check Console for simulation warnings
- Monitor Network tab for performance
- Use React DevTools to inspect state

---

**Enjoy experimenting with medieval siege engineering! 🏰**
