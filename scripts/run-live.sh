#!/usr/bin/env bash
# run-live.sh: run ubu-orchestrator against YOUR OWN store with Google Calendar
# reachable, for the live rehearsal.
#
# Every other script here runs in mock modes on a throwaway store. This one does
# not. It opens the operator's real store and, once the Google Calendar session
# is enabled in Setup, Approve, Capture and Reconcile in the app reach the real
# calendar. So it says what it is about to open and waits for a typed word.
#
# It changes no default and writes no file of its own. It checks, prints, asks,
# and then runs the orchestrator the operator already has, exactly as
# run-orchestrator.sh does, with the Google variables it was given.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
REPOS_DIR="${REPOS_DIR:-$(cd "$ROOT_DIR/.." && pwd)}"
ORCHESTRATOR_DIR="${ORCHESTRATOR_DIR:-$REPOS_DIR/ubu-orchestrator}"

usage() {
  cat <<'USAGE'
Usage: run-live.sh

Runs ubu-orchestrator against your own store with Google Calendar reachable.
This is for the live rehearsal: your real store, your real calendar.

What it opens
  The store   ubu-orchestrator.db in the ubu-orchestrator checkout, which is
              the orchestrator's own default, or UBU_DB_PATH if you set it.
              This is your real store, not a throwaway. Back it up first.
  The calendar  the Google calendar named by UBU_GOOGLE_CALENDAR_ID, or
              "primary", which is the orchestrator's own default.

What reaches the real calendar
  Nothing does until you enable the Google Calendar session in Setup. After
  that, in the app:
    Capture    READS your calendar and writes Tasks to your store.
    Reconcile  READS your calendar.
    Approve    WRITES to your calendar: it creates, updates and deletes the
               events UbU owns. It never writes to an event UbU does not own.
  Take preview never calls Google.

Required
  UBU_GOOGLE_CREDENTIALS_PATH   absolute path to your Google OAuth application
                                JSON. The file must exist.
  UBU_GOOGLE_TOKEN_CACHE_PATH   absolute path to the token cache. The file must
                                exist, or its directory must exist and be
                                writable so that first consent can create it.

Optional
  UBU_GOOGLE_CALENDAR_ID        the calendar to use (default: primary)
  UBU_PLANNING_HORIZON_SECONDS  how far ahead UbU plans and how much of the
                                calendar it sees (default: 86400, one day;
                                at most 2678400). One day of horizon is one
                                day of calendar: capture takes nothing beyond
                                it. 604800 is one week.
  UBU_DB_PATH                   a store other than the default
  UBU_ORCHESTRATOR_PORT         the port (default: 7878, which the app expects)
  ORCHESTRATOR_DIR, REPOS_DIR   where the ubu-orchestrator checkout is

Before it starts it prints the absolute path of the store, the calendar id and
the horizon, and waits for you to type the word: live

It refuses to start when
  - a required variable is unset, or is not an absolute path;
  - the credentials file does not exist;
  - the token cache does not exist and its directory cannot hold one;
  - UBU_CALENDAR_MOCK_EVENTS is set, because the orchestrator then refuses
    every Live calendar request;
  - something is already listening on the port, such as acceptance.sh or
    another orchestrator;
  - it is not run from a terminal, so nothing can be confirmed.

It changes no default and writes no file of its own. The orchestrator it runs
writes to your store, and Google's consent may write the token cache.

The whole sequence, from the backup to reading what did not fit, is in
docs/LIVE_REHEARSAL.md.
USAGE
}

if [[ "${1:-}" == "-h" || "${1:-}" == "--help" ]]; then
  usage
  exit 0
fi
if [[ $# -gt 0 ]]; then
  echo "error: run-live.sh takes no arguments; see --help" >&2
  exit 2
fi

refuse() {
  echo "REFUSED: $1" >&2
  echo "Nothing was started. See: $0 --help" >&2
  exit 1
}

[[ -f "$ORCHESTRATOR_DIR/Cargo.toml" ]] || refuse "there is no ubu-orchestrator checkout at $ORCHESTRATOR_DIR"

# ---- the Google paths: without them the orchestrator starts and cannot reach the calendar
for name in UBU_GOOGLE_CREDENTIALS_PATH UBU_GOOGLE_TOKEN_CACHE_PATH; do
  value="${!name:-}"
  [[ -n "$value" ]] || refuse "$name is not set"
  [[ "$value" == /* ]] || refuse "$name is not an absolute path: $value"
done
[[ -f "$UBU_GOOGLE_CREDENTIALS_PATH" ]] || refuse "the credentials file does not exist: $UBU_GOOGLE_CREDENTIALS_PATH"
[[ -r "$UBU_GOOGLE_CREDENTIALS_PATH" ]] || refuse "the credentials file cannot be read: $UBU_GOOGLE_CREDENTIALS_PATH"
TOKEN_STATE="exists"
if [[ ! -e "$UBU_GOOGLE_TOKEN_CACHE_PATH" ]]; then
  token_dir="$(dirname "$UBU_GOOGLE_TOKEN_CACHE_PATH")"
  [[ -d "$token_dir" && -w "$token_dir" ]] ||
    refuse "the token cache does not exist and its directory cannot hold one: $UBU_GOOGLE_TOKEN_CACHE_PATH"
  TOKEN_STATE="does not exist yet; your browser will open for consent on the first Live request, and consent creates it"
elif [[ ! -f "$UBU_GOOGLE_TOKEN_CACHE_PATH" ]]; then
  refuse "the token cache path is not a file: $UBU_GOOGLE_TOKEN_CACHE_PATH"
fi

# ---- a mock fixture makes the orchestrator refuse every Live calendar request
[[ -z "${UBU_CALENDAR_MOCK_EVENTS:-}" ]] ||
  refuse "UBU_CALENDAR_MOCK_EVENTS is set to $UBU_CALENDAR_MOCK_EVENTS; unset it, a mock fixture and the live calendar cannot be used together"

# ---- the horizon: named, never defaulted here
HORIZON="${UBU_PLANNING_HORIZON_SECONDS:-}"
if [[ -n "$HORIZON" ]]; then
  [[ "$HORIZON" =~ ^[0-9]+$ ]] && ((HORIZON >= 1 && HORIZON <= 2678400)) ||
    refuse "UBU_PLANNING_HORIZON_SECONDS must be an integer from 1 to 2678400, not $HORIZON"
  HORIZON_TEXT="$HORIZON seconds, from UBU_PLANNING_HORIZON_SECONDS"
else
  HORIZON_TEXT="86400 seconds, one day: the orchestrator's default. Capture will see one day of calendar"
fi

# ---- the store: the path the orchestrator itself will resolve, made absolute for the eye
DB="${UBU_DB_PATH:-ubu-orchestrator.db}"
case "$DB" in
  sqlite:*) STORE_TEXT="$DB (a SQLite URL from UBU_DB_PATH)" ;;
  /*) STORE_TEXT="$DB" ;;
  *) STORE_TEXT="$ORCHESTRATOR_DIR/$DB" ;;
esac
if [[ "$DB" != sqlite:* ]]; then
  if [[ -f "$STORE_TEXT" ]]; then
    STORE_STATE="exists, $(du -h "$STORE_TEXT" | cut -f1), last written $(date -r "$STORE_TEXT" '+%Y-%m-%d %H:%M')"
  else
    STORE_STATE="does not exist; the orchestrator will create an empty store there"
  fi
else
  STORE_STATE="not inspected"
fi

# ---- the port: the app talks to whatever is listening there
PORT="${UBU_ORCHESTRATOR_PORT:-7878}"
if (exec 3<>"/dev/tcp/127.0.0.1/$PORT") 2>/dev/null; then
  refuse "something is already listening on 127.0.0.1:$PORT. Stop acceptance.sh or the other orchestrator first"
fi

cat <<SUMMARY

This is the LIVE run. It is not a rehearsal on a throwaway store.

  store      $STORE_TEXT
             $STORE_STATE
  calendar   ${UBU_GOOGLE_CALENDAR_ID:-primary}${UBU_GOOGLE_CALENDAR_ID:+ (from UBU_GOOGLE_CALENDAR_ID)}
  horizon    $HORIZON_TEXT
  listening  127.0.0.1:$PORT
  credentials  $UBU_GOOGLE_CREDENTIALS_PATH
  token cache  $UBU_GOOGLE_TOKEN_CACHE_PATH
               $TOKEN_STATE

Once you enable the Google Calendar session in Setup:
  Capture and Reconcile READ this calendar. Capture writes Tasks to this store.
  Approve WRITES to this calendar.

Have you backed the store up? If not, stop here and copy it first.

SUMMARY

[[ -t 0 ]] || refuse "this is not a terminal, so nothing can be confirmed"
read -r -p "Type the word live to start, or anything else to stop: " answer
[[ "$answer" == "live" ]] || refuse "you typed something other than live"

cd "$ORCHESTRATOR_DIR"
export HOST="${HOST:-127.0.0.1}"
export BIND_ADDR="${BIND_ADDR:-127.0.0.1}"
echo "run: cargo run --locked in $ORCHESTRATOR_DIR bound to 127.0.0.1"
exec cargo run --locked
