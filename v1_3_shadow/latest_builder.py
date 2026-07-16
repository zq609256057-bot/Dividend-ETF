#!/usr/bin/env python3
"""Build a Shadow latest snapshot for every enabled V1.3 Registry entry."""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path
from typing import Any


def enabled_collector_indices(payload: dict[str, Any]) -> list[dict[str, Any]]:
    """Translate Registry identity to the existing generic Collector contract."""
    return [
        {
            "code": item["apiCode"],
            "name": item["name"],
            "market": item["market"],
            "category": item["category"],
            "registryCode": item["code"],
        }
        for item in payload.get("indices", [])
        if item.get("enabled") is True
    ]


def main() -> int:
    workspace = Path(__file__).resolve().parents[2]
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--registry", type=Path, default=Path(__file__).with_name("index_registry.json"))
    parser.add_argument("--database", type=Path, default=workspace / "local_data_collector/data/market_kline.sqlite")
    parser.add_argument("--output", type=Path, default=Path(__file__).with_name("output") / "dividend_indices_latest.shadow.json")
    args = parser.parse_args()

    sys.path.insert(0, str(workspace / "local_data_collector/src"))
    from services.lixinger_index_sync_service import (
        build_latest_snapshot,
        write_snapshot,
    )

    payload = json.loads(args.registry.read_text(encoding="utf-8"))
    indices = enabled_collector_indices(payload)
    if not indices:
        raise SystemExit("no enabled indices in Registry")
    result = build_latest_snapshot(indices, db_path=args.database)
    write_snapshot(result, args.output)
    print(json.dumps({"status": "success", "production": False, "codes": [item["registryCode"] for item in indices], "output": str(args.output)}, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
