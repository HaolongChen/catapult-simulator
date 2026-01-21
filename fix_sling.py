import sys

def fix_file(filename):
    with open(filename, 'r') as f:
        lines = f.readlines()

    new_lines = []
    for line in lines:
        if "const active =" in line:
            # Add distance checks for sling
            new_lines.append("  const distL = Math.sqrt(DL[0]**2 + DL[1]**2)\n")
            new_lines.append("  const distR = Math.sqrt(DR[0]**2 + DR[1]**2)\n")
            new_lines.append("  const active = [\n")
            new_lines.append("    true, true, // CW Hinge\n")
            new_lines.append("    distL > trebuchetProps.slingLength || x?.[12] < 0, // Sling L\n")
            new_lines.append("    distR > trebuchetProps.slingLength || x?.[13] < 0, // Sling R\n")
            new_lines.append("    !wasReleased, // Projectile/Bag contact\n")
            new_lines.append("    onRail // Ground\n")
            new_lines.append("  ]\n")
            continue
        if "const active = [true, true, true, true, !wasReleased, onRail]" in line:
            continue # Already handled above
        new_lines.append(line)

    with open(filename, 'w') as f:
        f.writelines(new_lines)

# This script is a bit complex, let's just rewrite the relevant part of computeDerivatives.
