import sys

def fix_file(filename):
    with open(filename, 'r') as f:
        content = f.read()

    # Fix gamma[0]
    content = content.replace(
        "gamma[0] =\n    -gamma[0] -",
        "gamma[0] +="
    )
    # Fix gamma[1]
    content = content.replace(
        "gamma[1] =\n    -gamma[1] -",
        "gamma[1] +="
    )
    # Fix gamma[2]
    content = content.replace(
        "gamma[2] = -2 * (dvL[0] * dvL[0] + dvL[1] * dvL[1])\n  gamma[2] +=\n    -2 *",
        "gamma[2] = -2 * (dvL[0] * dvL[0] + dvL[1] * dvL[1])\n  gamma[2] +=\n    2 *"
    )
    content = content.replace(
        "gamma[2] =\n    -gamma[2] -",
        "gamma[2] +="
    )
    # Fix gamma[3]
    content = content.replace(
        "gamma[3] = -2 * (dvR[0] * dvR[0] + dvR[1] * dvR[1])\n  gamma[3] +=\n    -2 *",
        "gamma[3] = -2 * (dvR[0] * dvR[0] + dvR[1] * dvR[1])\n  gamma[3] +=\n    2 *"
    )
    content = content.replace(
        "gamma[3] =\n    -gamma[3] -",
        "gamma[3] +="
    )
    # Fix gamma[4]
    content = content.replace(
        "gamma[4] =\n    -gamma[4] -",
        "gamma[4] +="
    )

    with open(filename, 'w') as f:
        f.write(content)

fix_file('src/physics/derivatives.ts')
