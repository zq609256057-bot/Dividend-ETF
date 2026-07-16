#!/usr/bin/env python3
"""Read-only eight-gate index onboarding audit for Dividend Dashboard V1.3 Shadow."""

from __future__ import annotations

import argparse
import json
import sqlite3
from dataclasses import asdict, dataclass
from pathlib import Path
from typing import Any


REQUIRED_FIELDS = {
    "code", "name", "apiCode", "enabled", "market", "category",
    "dataStatus", "historyStartDate", "description",
}
REQUIRED_STATUS = {"market", "valuation", "macro", "history", "latest", "scoring", "ui"}
PINE_ENGINE = "pine-v7-red-rocket-final"


@dataclass(frozen=True)
class Gate:
    step: int
    name: str
    passed: bool
    detail: str


def _load(path: Path) -> dict[str, Any]:
    return json.loads(path.read_text(encoding="utf-8"))


def _one(connection: sqlite3.Connection, sql: str, args: tuple[Any, ...]) -> tuple[Any, ...]:
    return tuple(connection.execute(sql, args).fetchone() or ())


def audit_index(
    item: dict[str, Any],
    database: Path,
    latest_snapshot: Path,
    pine_snapshot: Path,
    ui_path: Path,
) -> dict[str, Any]:
    code = str(item.get("apiCode") or item.get("code") or "")
    fields_ok = REQUIRED_FIELDS.issubset(item) and REQUIRED_STATUS.issubset(item.get("dataStatus") or {})
    gates = [Gate(1, "registry", fields_ok, "required V2 fields present" if fields_ok else "registry schema incomplete")]

    connection = sqlite3.connect(f"file:{database.resolve()}?mode=ro&immutable=1", uri=True)
    try:
        kline = _one(connection, "SELECT COUNT(*),MIN(date),MAX(date) FROM market_kline WHERE code=? AND series_type='normal' AND open>0 AND high>0 AND low>0 AND close>0", (code,))
        valuation = _one(connection, "SELECT COUNT(*),MIN(date),MAX(date) FROM index_valuation_daily WHERE code=?", (code,))
        macro = _one(connection, "SELECT COUNT(*),MIN(date),MAX(date) FROM bond_yield_daily WHERE code='CN10Y'", ())
    finally:
        connection.close()
    kline_count = int(kline[0] or 0) if kline else 0
    valuation_count = int(valuation[0] or 0) if valuation else 0
    macro_count = int(macro[0] or 0) if macro else 0
    gates.append(Gate(2, "market", kline_count > 0, f"normal K-line rows={kline_count}, range={kline[1] if kline else None}..{kline[2] if kline else None}"))
    gates.append(Gate(3, "valuation", valuation_count > 0, f"valuation rows={valuation_count}, range={valuation[1] if valuation else None}..{valuation[2] if valuation else None}"))
    gates.append(Gate(4, "macro", macro_count > 0, f"CN10Y rows={macro_count}, range={macro[1] if macro else None}..{macro[2] if macro else None}"))
    gates.append(Gate(5, "history", kline_count >= 250, f"complete trading rows={kline_count}/250"))

    latest = _load(latest_snapshot)
    latest_item = next((row for row in latest.get("indices", []) if row.get("code") == code), None)
    latest_ok = bool(latest_item and latest_item.get("kline") and latest_item.get("valuation") and latest_item.get("technical") and latest_item.get("macro"))
    gates.append(Gate(6, "latest", latest_ok, "canonical latest blocks complete" if latest_ok else "latest snapshot missing required blocks"))

    pine = _load(pine_snapshot)
    pine_item = next((row for row in pine.get("indices", []) if row.get("code") == code), None)
    pine_v7 = ((pine_item or {}).get("technical_shadow") or {}).get("pineV7") or {}
    scoring_ok = latest_ok and pine_v7.get("engineVersion") == PINE_ENGINE and isinstance(pine_v7.get("score"), (int, float))
    gates.append(Gate(7, "scoring", scoring_ok, f"frozen Pine engine={pine_v7.get('engineVersion') or 'missing'}; existing 60+40 model reused"))

    ui_source = ui_path.read_text(encoding="utf-8")
    ui_ok = all(token in ui_source for token in ('/indices', 'index-selector', 'index-code-search')) and "selectIndex('" not in ui_source
    gates.append(Gate(8, "ui", ui_ok, "dynamic selector/search contract present" if ui_ok else "dynamic UI contract missing"))

    passed = all(gate.passed for gate in gates)
    return {
        "code": item.get("code"),
        "onboardingStatus": "enabled" if passed else "disabled",
        "enabled": passed,
        "gates": [asdict(gate) for gate in gates],
    }


def main() -> int:
    root = Path(__file__).resolve().parents[2]
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--registry", type=Path, default=Path(__file__).with_name("index_registry.json"))
    parser.add_argument("--code", required=True)
    parser.add_argument("--database", type=Path, default=root / "local_data_collector/data/market_kline.sqlite")
    parser.add_argument("--latest", type=Path, default=root / "local_data_collector/output/dividend_indices_latest.json")
    parser.add_argument("--pine", type=Path, default=root / "local_data_collector/shadow_pine_bridge/output/dividend_indices_pine_shadow.json")
    parser.add_argument("--ui", type=Path, default=Path(__file__).with_name("index.html"))
    args = parser.parse_args()
    payload = _load(args.registry)
    item = next((row for row in payload.get("indices", []) if row.get("code") == args.code), None)
    if item is None:
        print(json.dumps({"code": args.code, "onboardingStatus": "disabled", "enabled": False, "error": "REGISTRY_NOT_FOUND"}, ensure_ascii=False, indent=2))
        return 2
    result = audit_index(item, args.database, args.latest, args.pine, args.ui)
    print(json.dumps(result, ensure_ascii=False, indent=2))
    return 0 if result["enabled"] else 2


if __name__ == "__main__":
    raise SystemExit(main())
