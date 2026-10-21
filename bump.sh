#!/bin/sh
# bump.sh NEWVER : stamp a new cache-busting build version everywhere (game.js AV, imports, index.html, version.json)
set -e; cd "$(dirname "$0")/squads"; OLD=$(sed -n "s/.*const AV = '?v=\([0-9a-z]*\)'.*/\1/p" game.js)
grep -rl "$OLD" . | xargs sed -i "s/$OLD/$1/g"; printf '{"av":"%s"}\n' "$1" > version.json; echo "$OLD -> $1"
