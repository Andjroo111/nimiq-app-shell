#!/bin/sh
# Wrapper, so `scripts/bump-fleet.sh v0.20.4` works. The real driver is
# bump-fleet.ts, in this repo's own idiom (both other scripts here are bun) and
# for one hard reason: macOS ships /bin/bash 3.2, which has no associative
# arrays. A nineteen-record registry in POSIX sh becomes parallel arrays, and on
# 2026-08-15 exactly that shape printed "committed <hash>" for seven repos while
# committing nothing, because the hash it echoed was the pre-existing HEAD.
#
#   scripts/bump-fleet.sh v0.20.4 --dry-run
#
exec bun run "$(dirname "$0")/bump-fleet.ts" "$@"
