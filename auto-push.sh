#!/bin/bash

while true; do
  git add .

  if ! git diff --cached --quiet; then
    git commit -m "Auto update"
    git push
  fi

  sleep 10
done
