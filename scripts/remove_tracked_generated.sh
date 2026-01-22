#!/usr/bin/env bash
set -e

# Remove generated artifacts from git index and commit the change
# Run this locally to stop tracking public/trajectory.json and public/simulation_log.csv

git rm --cached public/trajectory.json public/simulation_log.csv || true

if git commit -m "chore(ci): stop tracking generated simulation artifacts; CI will generate them"; then
  echo "Committed removal of generated artifacts."
else
  echo "No commit was necessary (no changes staged)."
fi
