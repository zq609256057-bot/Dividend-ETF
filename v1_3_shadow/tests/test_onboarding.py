from __future__ import annotations

import json
import importlib.util
import sqlite3
import sys
from pathlib import Path

MODULE_PATH = Path(__file__).resolve().parents[1] / "onboarding.py"
SPEC = importlib.util.spec_from_file_location("dividend_v13_onboarding", MODULE_PATH)
MODULE = importlib.util.module_from_spec(SPEC)
assert SPEC.loader is not None
sys.modules[SPEC.name] = MODULE
SPEC.loader.exec_module(MODULE)
audit_index = MODULE.audit_index

LATEST_PATH = Path(__file__).resolve().parents[1] / "latest_builder.py"
LATEST_SPEC = importlib.util.spec_from_file_location("dividend_v13_latest", LATEST_PATH)
LATEST_MODULE = importlib.util.module_from_spec(LATEST_SPEC)
assert LATEST_SPEC.loader is not None
sys.modules[LATEST_SPEC.name] = LATEST_MODULE
LATEST_SPEC.loader.exec_module(LATEST_MODULE)


STATUS = {key: "ready" for key in ("market", "valuation", "macro", "history", "latest", "scoring", "ui")}
ITEM = {
    "code": "999999", "name": "Mock 红利指数", "apiCode": "999999", "enabled": False,
    "market": "TEST", "category": "dividend", "dataStatus": STATUS,
    "historyStartDate": "2025-01-01", "description": "isolated mock only",
}


def write_json(path: Path, value: dict) -> Path:
    path.write_text(json.dumps(value, ensure_ascii=False), encoding="utf-8")
    return path


def database(path: Path, rows: int) -> Path:
    connection = sqlite3.connect(path)
    connection.executescript(
        """
        CREATE TABLE market_kline(code TEXT,date TEXT,series_type TEXT,open REAL,high REAL,low REAL,close REAL);
        CREATE TABLE index_valuation_daily(code TEXT,date TEXT);
        CREATE TABLE bond_yield_daily(code TEXT,date TEXT);
        """
    )
    connection.executemany(
        "INSERT INTO market_kline VALUES('999999',?,'normal',1,1,1,1)",
        [(f"2025-{1 + i // 28:02d}-{1 + i % 28:02d}",) for i in range(rows)],
    )
    connection.execute("INSERT INTO index_valuation_daily VALUES('999999','2026-07-14')")
    connection.execute("INSERT INTO bond_yield_daily VALUES('CN10Y','2026-07-14')")
    connection.commit()
    connection.close()
    return path


def fixtures(tmp_path: Path, rows: int = 250):
    latest = write_json(tmp_path / "latest.json", {"indices": [{
        "code": "999999", "kline": {}, "valuation": {}, "technical": {}, "macro": {},
    }]})
    # Non-empty blocks are required by the gate.
    latest.write_text(json.dumps({"indices": [{
        "code": "999999", "kline": {"close": 1}, "valuation": {"pb": 1},
        "technical": {"rsi14": 50}, "macro": {"cn10yYield": 2},
    }]}), encoding="utf-8")
    pine = write_json(tmp_path / "pine.json", {"indices": [{
        "code": "999999", "technical_shadow": {"pineV7": {"engineVersion": "pine-v7-red-rocket-final", "score": 5}},
    }]})
    ui = tmp_path / "index.html"
    ui.write_text('<select id="index-selector"></select><input id="index-code-search"><script>fetch("/indices")</script>', encoding="utf-8")
    return database(tmp_path / "market.sqlite", rows), latest, pine, ui


def test_all_eight_gates_enable_mock_only_after_validation(tmp_path):
    db, latest, pine, ui = fixtures(tmp_path, 250)
    result = audit_index(dict(ITEM), db, latest, pine, ui)
    assert result["enabled"] is True
    assert result["onboardingStatus"] == "enabled"
    assert len(result["gates"]) == 8
    assert all(gate["passed"] for gate in result["gates"])


def test_any_failed_gate_forces_disabled(tmp_path):
    db, latest, pine, ui = fixtures(tmp_path, 249)
    result = audit_index(dict(ITEM), db, latest, pine, ui)
    assert result["enabled"] is False
    assert result["onboardingStatus"] == "disabled"
    assert next(gate for gate in result["gates"] if gate["name"] == "history")["passed"] is False


def test_latest_builder_uses_every_enabled_registry_entry():
    payload = {"indices": [dict(ITEM, enabled=True), dict(ITEM, code="888888", apiCode="api-888888", enabled=False)]}
    selected = LATEST_MODULE.enabled_collector_indices(payload)
    assert [item["registryCode"] for item in selected] == ["999999"]
    assert selected[0]["code"] == "999999"
