import sys

def fix_file(filename):
    with open(filename, 'r') as f:
        content = f.read()

    # Disable row equilibration
    content = content.replace(
        "rowScales[i] = max > 1e-20 ? 1.0 / max : 1.0",
        "rowScales[i] = 1.0"
    )
    # Restore ground redo sign
    content = content.replace(
        "if (active[5] && x[15] < 0)",
        "if (active[5] && x[15] > 0)"
    )

    with open(filename, 'w') as f:
        f.write(content)

fix_file('src/physics/derivatives.ts')
