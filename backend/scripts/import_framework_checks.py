from __future__ import annotations

import os
from datetime import datetime, UTC
from pathlib import Path
from typing import Any

from dotenv import load_dotenv
from sqlalchemy import Column, DateTime, MetaData, String, Table, Text, create_engine, delete, func, insert, select


def build_table(metadata: MetaData) -> Table:
    return Table(
        "framework_checks",
        metadata,
        Column("check_id", String(80), primary_key=True),
        Column("name", String(255), nullable=False),
        Column("prompt", Text, nullable=False),
        Column("category", String(255), nullable=False),
        Column("few_shot", Text, nullable=True),
        Column("judge_override", Text, nullable=True),
        Column("updated_at", DateTime(timezone=True), nullable=False),
    )


def fetch_checks_from_database(db_url: str) -> list[dict[str, Any]]:
    engine = create_engine(db_url, pool_pre_ping=True)
    metadata = MetaData()
    framework_checks = build_table(metadata)

    with engine.begin() as conn:
        metadata.create_all(conn)
        rows = conn.execute(select(framework_checks)).mappings().all()

    engine.dispose()

    checks: list[dict[str, Any]] = [dict(row) for row in rows]
    if not checks:
        raise RuntimeError("No checks found in source database table framework_checks")
    return checks


def import_into_database(db_url: str, checks: list[dict[str, Any]]) -> int:
    engine = create_engine(db_url, pool_pre_ping=True)
    metadata = MetaData()
    framework_checks = build_table(metadata)

    rows: list[dict[str, Any]] = []
    now = datetime.now(UTC)
    for chk in checks:
        rows.append(
            {
                "check_id": str(chk.get("check_id") or chk.get("id") or "").strip(),
                "name": str(chk.get("name", "")).strip() or "Unnamed Check",
                "prompt": str(chk.get("prompt", "")).strip(),
                "category": str(chk.get("category", "Uncategorized")).strip() or "Uncategorized",
                "few_shot": str(chk.get("few_shot", "")).strip() or None,
                "judge_override": str(chk.get("judge_override", "")).strip() or None,
                "updated_at": chk.get("updated_at") or now,
            }
        )

    rows = [r for r in rows if r["check_id"]]
    if not rows:
        raise RuntimeError("Checks were parsed, but all check ids are empty")

    with engine.begin() as conn:
        metadata.create_all(conn)
        conn.execute(delete(framework_checks))
        conn.execute(insert(framework_checks), rows)
        count = conn.execute(select(func.count()).select_from(framework_checks)).scalar_one()

    engine.dispose()
    return int(count)


def main() -> None:
    backend_dir = Path(__file__).resolve().parent.parent
    load_dotenv(backend_dir / ".env")

    neon_url = os.getenv("DATABASE_URL", "").strip()
    if not neon_url:
        raise RuntimeError("DATABASE_URL is missing in backend/.env")

    sqlite_path = backend_dir / "data" / "validator.db"
    sqlite_url = f"sqlite:///{sqlite_path.as_posix()}"

    checks = fetch_checks_from_database(neon_url)

    sqlite_count = import_into_database(sqlite_url, checks)
    neon_count = import_into_database(neon_url, checks)

    print(f"Synced {sqlite_count} checks into SQLite ({sqlite_path})")
    print("Synced {0} checks into Neon (DATABASE_URL host)".format(neon_count))


if __name__ == "__main__":
    main()
