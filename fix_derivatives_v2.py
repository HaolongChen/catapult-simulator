import sys

def fix_file(filename):
    with open(filename, 'r') as f:
        lines = f.readlines()

    new_lines = []
    i = 0
    while i < len(lines):
        line = lines[i]
        
        # Hinge and Projectile/Bag constraints (0, 1, 4)
        if "gamma[0] =" in line and "L2 * Math.cos(th)" in line:
            new_lines.append(line)
            i += 1
            # Skip the next 3 lines of assignment and replace
            # gamma[0] = -gamma[0] - 2 * alpha_b ...
            # We want gamma[0] += -2 * alpha_b ...
            new_lines.append("    gamma[0] +=\n")
            new_lines.append("      -2 * alpha_b * (J[0][0] * dth + J[0][2] * q_dot[2] + J[0][4] * dph) -\n")
            new_lines.append("      beta_b * beta_b * pos_C0\n")
            i += 3
            continue
            
        if "gamma[1] =" in line and "L2 * Math.sin(th)" in line:
            new_lines.append(line)
            i += 1
            new_lines.append("    gamma[1] +=\n")
            new_lines.append("      -2 * alpha_b * (J[1][0] * dth + J[1][3] * q_dot[3] + J[1][4] * dph) -\n")
            new_lines.append("      beta_b * beta_b * pos_C1\n")
            i += 3
            continue

        if "gamma[4] =" in line and "dvB[0] * dvB[0]" in line:
            new_lines.append(line)
            i += 1
            new_lines.append("    gamma[4] +=\n")
            new_lines.append("      -2 *\n")
            new_lines.append("        alpha_b *\n")
            new_lines.append("        (J[4][5] * q_dot[5] +\n")
            new_lines.append("          J[4][6] * q_dot[6] +\n")
            new_lines.append("          J[4][8] * q_dot[8] +\n")
            new_lines.append("          J[4][9] * q_dot[9]) -\n")
            new_lines.append("      beta_b * beta_b * (DB[0] ** 2 + DB[1] ** 2 - R_eff * R_eff)\n")
            i += 8
            continue

        # Sling constraints (2, 3)
        if "gamma[2] =" in line and "dvL[0] * dvL[0]" in line:
            # gamma[2] = -2 * |dvL|^2
            new_lines.append(line)
            i += 1
            # Next is centripetal tip
            new_lines.append("    gamma[2] +=\n")
            new_lines.append("      2 *\n") # Correct sign for + 2 d . a_2_cent
            new_lines.append("      (DL[0] *\n")
            new_lines.append("        (-Lf * Math.cos(th) * dth ** 2 -\n")
            new_lines.append("          Lw * Math.cos(th + dl) * (dth + ddl) ** 2) +\n")
            new_lines.append("        DL[1] *\n")
            new_lines.append("          (-Lf * Math.sin(th) * dth ** 2 -\n")
            new_lines.append("            Lw * Math.sin(th + dl) * (dth + ddl) ** 2))\n")
            i += 7
            # Next is centripetal bag
            new_lines.append("    gamma[2] +=\n")
            new_lines.append("      -2 *\n") # Correct sign for - 2 d . a_1_cent
            new_lines.append("      (DL[0] * ((W / 2) * Math.cos(ps) * dps ** 2) +\n")
            new_lines.append("        DL[1] * ((W / 2) * Math.sin(ps) * dps ** 2))\n")
            i += 3
            # Next is Baumgarte
            new_lines.append("    gamma[2] +=\n")
            new_lines.append("      -2 *\n")
            new_lines.append("        alpha_b *\n")
            new_lines.append("        (J[2][0] * dth +\n")
            new_lines.append("          J[2][1] * ddl +\n")
            new_lines.append("          J[2][5] * q_dot[5] +\n")
            new_lines.append("          J[2][6] * q_dot[6] +\n")
            new_lines.append("          J[2][7] * dps) -\n")
            new_lines.append("      beta_b *\n")
            new_lines.append("        beta_b *\n")
            new_lines.append("        (DL[0] ** 2 + DL[1] ** 2 - trebuchetProps.slingLength ** 2)\n")
            i += 11
            continue

        if "gamma[3] =" in line and "dvR[0] * dvR[0]" in line:
            new_lines.append(line)
            i += 1
            new_lines.append("    gamma[3] +=\n")
            new_lines.append("      2 *\n")
            new_lines.append("      (DR[0] *\n")
            new_lines.append("        (-Lf * Math.cos(th) * dth ** 2 -\n")
            new_lines.append("          Lw * Math.cos(th + dl) * (dth + ddl) ** 2) +\n")
            new_lines.append("        DR[1] *\n")
            new_lines.append("          (-Lf * Math.sin(th) * dth ** 2 -\n")
            new_lines.append("            Lw * Math.sin(th + dl) * (dth + ddl) ** 2))\n")
            i += 7
            new_lines.append("    gamma[3] +=\n")
            new_lines.append("      -2 *\n")
            new_lines.append("      (DR[0] * ((-W / 2) * Math.cos(ps) * dps ** 2) +\n")
            new_lines.append("        DR[1] * ((W / 2) * Math.sin(ps) * dps ** 2))\n")
            i += 3
            new_lines.append("    gamma[3] +=\n")
            new_lines.append("      -2 *\n")
            new_lines.append("        alpha_b *\n")
            new_lines.append("        (J[3][0] * dth +\n")
            new_lines.append("          J[3][1] * ddl +\n")
            new_lines.append("          J[3][5] * q_dot[5] +\n")
            new_lines.append("          J[3][6] * q_dot[6] +\n")
            new_lines.append("          J[3][7] * dps) -\n")
            new_lines.append("      beta_b *\n")
            new_lines.append("        beta_b *\n")
            new_lines.append("        (DR[0] ** 2 + DR[1] ** 2 - trebuchetProps.slingLength ** 2)\n")
            i += 11
            continue

        new_lines.append(line)
        i += 1

    with open(filename, 'w') as f:
        f.writelines(new_lines)

fix_file('src/physics/derivatives.ts')
