#!/usr/bin/env sh
set -e
cd "$(dirname "$0")"
mkdir -p out
javac -encoding UTF-8 -d out src/Main.java
java -cp out Main
