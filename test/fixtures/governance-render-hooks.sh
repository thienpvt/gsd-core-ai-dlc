#!/usr/bin/env sh
set -eu

PROJECT_ROOT="${1:-.}"
CONFIG_DIR="${2:-${GSD_CONFIG_DIR:-}}"

if [ -n "${GSD_TOOLS:-}" ]; then
  GSD_BIN="$GSD_TOOLS"
elif [ -f "$HOME/.codex/gsd-core/bin/gsd-tools.cjs" ]; then
  GSD_BIN="$HOME/.codex/gsd-core/bin/gsd-tools.cjs"
elif [ -f "$HOME/.claude/gsd-core/bin/gsd-tools.cjs" ]; then
  GSD_BIN="$HOME/.claude/gsd-core/bin/gsd-tools.cjs"
else
  GSD_BIN="$(command -v gsd-tools)"
fi

run_gsd() {
  case "$GSD_BIN" in
    *.cjs) node "$GSD_BIN" "$@" ;;
    *) "$GSD_BIN" "$@" ;;
  esac
}

if [ -n "$CONFIG_DIR" ]; then
  export GSD_HOME="$CONFIG_DIR"
  export CODEX_HOME="$CONFIG_DIR"
  export GSD_RUNTIME="${GSD_RUNTIME:-codex}"
fi

cd "$PROJECT_ROOT"

printf '%s\n' '== capability list =='
run_gsd capability list --scope project --json

printf '%s\n' '== discuss:pre =='
if [ -n "$CONFIG_DIR" ]; then
  run_gsd loop render-hooks discuss:pre --raw --config-dir "$CONFIG_DIR"
else
  run_gsd loop render-hooks discuss:pre --raw
fi

printf '%s\n' '== execute:pre =='
if [ -n "$CONFIG_DIR" ]; then
  run_gsd loop render-hooks execute:pre --raw --config-dir "$CONFIG_DIR"
else
  run_gsd loop render-hooks execute:pre --raw
fi
