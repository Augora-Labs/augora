#!/usr/bin/env python3
"""Offline regression test for bounty #53/#54; never invokes Stellar."""
import json
from pathlib import Path

root = Path(__file__).resolve().parent
markets = json.loads((root / "mainnet-markets.json").read_text())
assert len(markets) == 7, "Expected seven checked-in markets"
for m in markets:
    resolves = m.get("resolves") or str(m["days"]) + " days"
    secs = m.get("duration_secs") or m["days"] * 86400
    assert resolves and isinstance(secs, int) and secs > 0
script = (root / "create-mainnet-markets.sh").read_text()
assert "duration_days" not in script, "Script still references missing duration_days"
assert script.count("m.get('resolves') or str(m['days']) + ' days'") == 2
print("PASS: seven market entries and both safe fallback paths")
