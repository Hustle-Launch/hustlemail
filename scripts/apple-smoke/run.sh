#!/usr/bin/env bash
set -euo pipefail

if [[ "$(uname -s)" != Darwin ]]; then
  printf '%s\n' 'Apple smoke tests require macOS with Xcode.' >&2
  exit 1
fi
for command in xcodebuild xcrun xcodegen; do
  if ! command -v "$command" >/dev/null 2>&1; then
    printf 'Missing prerequisite: %s\n' "$command" >&2
    exit 1
  fi
done

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
simulator_id="${APPLE_SIMULATOR_ID:-7262E580-B494-4FD9-BE24-91A04282BA0A}"
if [[ -n "${HUSTLEMAIL_APPLE_RESULTS_DIR:-}" ]]; then
  results_dir="$HUSTLEMAIL_APPLE_RESULTS_DIR"
  if [[ "$results_dir" != /* ]]; then
    printf '%s\n' 'HUSTLEMAIL_APPLE_RESULTS_DIR must be an absolute, nonexistent directory.' >&2
    exit 1
  fi
  mkdir "$results_dir"
else
  results_dir="$(mktemp -d "${TMPDIR:-/tmp}/hustlemail-apple-smoke.XXXXXX")"
fi
printf 'Artifacts: %s\n' "$results_dir"

xcrun simctl bootstatus "$simulator_id" -b
if ! xcrun simctl get_app_container "$simulator_id" app.hustlemail.mail app >/dev/null; then
  printf '%s\n' 'Install the unsigned Hustlemail simulator app before running this test.' >&2
  exit 1
fi
mkdir "$results_dir/SmokeTests"
cp "$script_dir/project.yml" "$results_dir/project.yml"
cp "$script_dir/SmokeTests.swift" "$results_dir/SmokeTests/SmokeTests.swift"
cd "$results_dir"
xcodegen generate
test_status=0
xcodebuild test -quiet \
  -project HustlemailSmoke.xcodeproj \
  -scheme HustlemailSmoke \
  -destination "platform=iOS Simulator,id=$simulator_id" \
  -derivedDataPath "$results_dir/DerivedData" \
  -resultBundlePath "$results_dir/result.xcresult" \
  CODE_SIGNING_ALLOWED=NO 2>&1 | tee "$results_dir/test.log" || test_status=$?
export_status=0
if [[ -d "$results_dir/result.xcresult" ]]; then
  xcrun xcresulttool get test-results summary \
    --path "$results_dir/result.xcresult" > "$results_dir/summary.json" || true
  xcrun xcresulttool export attachments \
    --path "$results_dir/result.xcresult" \
    --output-path "$results_dir/screenshots" || export_status=$?
else
  export_status=1
fi
if [[ "$test_status" -ne 0 ]]; then
  printf 'Apple preview smoke tests failed. Inspect: %s\n' "$results_dir" >&2
  exit "$test_status"
fi
if [[ "$export_status" -ne 0 ]]; then
  printf 'Tests passed, but screenshot export failed. Inspect: %s\n' "$results_dir" >&2
  exit "$export_status"
fi
printf 'Apple preview smoke tests passed. Results: %s\n' "$results_dir"
