#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/../.."
CXX="${CXX:-g++}"
if ! command -v "$CXX" >/dev/null 2>&1 && [[ -x 'C:/ProgramData/scoop/apps/mingw/current/bin/g++' ]]; then
  CXX='C:/ProgramData/scoop/apps/mingw/current/bin/g++'
fi
cmp firmware/arduino-uno/soil_protocol.h firmware/esp8266/soil_protocol.h
scratch="${TMPDIR:-/tmp}"
if [[ -n "${LOCALAPPDATA:-}" ]]; then
  scratch="${LOCALAPPDATA//\\//}/hermes/cache/scratch"
fi
build="${SOIL_TEST_BUILD_DIR:-$scratch/soil-firmware-native}"
mkdir -p "$build"
if command -v cygpath >/dev/null 2>&1; then build="$(cygpath -m "$build")"; fi
"$CXX" -std=c++11 -Wall -Wextra -Werror -pedantic tests/firmware/native_tests.cpp -o "$build/native_tests.exe"
"$build/native_tests.exe"
for sketch in uno esp; do
  "$CXX" -std=c++11 -Wall -Wextra -Werror -pedantic -I tests/firmware/stubs \
    "tests/firmware/${sketch}_sketch_test.cpp" -o "$build/${sketch}_sketch_test.exe"
  "$build/${sketch}_sketch_test.exe"
done
