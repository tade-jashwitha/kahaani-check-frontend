from __future__ import annotations

import copy
import logging
import os
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

logger = logging.getLogger("kahaani.local_dev_store")

# Storage directory for local audio files
DATA_DIR = Path(__file__).resolve().parent.parent.parent / "data" / "storage"
DATA_DIR.mkdir(parents=True, exist_ok=True)

DEFAULT_CAREGIVER_ID = "00000000-0000-0000-0000-000000000001"
DEFAULT_CAREGIVER_EMAIL = "caregiver@kahaani.local"

# Seed data
SEED_ELDERS = [
    {
        "id": "e1111111-1111-1111-1111-111111111111",
        "caregiver_id": DEFAULT_CAREGIVER_ID,
        "display_name": "Savitri Devi",
        "phone_e164": "+919876543210",
        "preferred_call_language": "hi",
        "dob_year_range": "1945-1950",
        "timezone": "Asia/Kolkata",
        "status": "active",
        "created_at": "2026-08-01T10:00:00Z",
    },
    {
        "id": "e2222222-2222-2222-2222-222222222222",
        "caregiver_id": DEFAULT_CAREGIVER_ID,
        "display_name": "Ramesh Sharma",
        "phone_e164": "+919812345678",
        "preferred_call_language": "hi",
        "dob_year_range": "1940-1945",
        "timezone": "Asia/Kolkata",
        "status": "active",
        "created_at": "2026-08-10T10:00:00Z",
    },
]

SEED_SCHEDULES = [
    {
        "id": "s1111111-1111-1111-1111-111111111111",
        "elder_id": "e1111111-1111-1111-1111-111111111111",
        "day_of_week": 1,
        "time_of_day": "10:00",
        "timezone": "Asia/Kolkata",
        "enabled": True,
        "created_at": "2026-08-01T10:00:00Z",
    },
    {
        "id": "s2222222-2222-2222-2222-222222222222",
        "elder_id": "e2222222-2222-2222-2222-222222222222",
        "day_of_week": 3,
        "time_of_day": "16:00",
        "timezone": "Asia/Kolkata",
        "enabled": True,
        "created_at": "2026-08-10T10:00:00Z",
    },
]

SEED_CHECKINS = [
    {
        "id": "c1111111-1111-1111-1111-111111111111",
        "elder_id": "e1111111-1111-1111-1111-111111111111",
        "status": "completed",
        "scheduled_for": "2026-08-25T10:00:00Z",
        "completed_at": "2026-08-25T10:05:00Z",
        "created_at": "2026-08-25T10:00:00Z",
        "call_summary": "Discussed morning walk and daily routine. Voice is clear and lively.",
    },
    {
        "id": "c2222222-2222-2222-2222-222222222222",
        "elder_id": "e1111111-1111-1111-1111-111111111111",
        "status": "completed",
        "scheduled_for": "2026-09-01T10:00:00Z",
        "completed_at": "2026-09-01T10:06:00Z",
        "created_at": "2026-09-01T10:00:00Z",
        "call_summary": "Talked about recent family visit. Speech patterns normal and engaged.",
    },
    {
        "id": "c3333333-3333-3333-3333-333333333333",
        "elder_id": "e1111111-1111-1111-1111-111111111111",
        "status": "scheduled",
        "scheduled_for": "2026-09-08T10:00:00Z",
        "created_at": "2026-09-08T09:00:00Z",
    },
    {
        "id": "voice-test",
        "elder_id": "e1111111-1111-1111-1111-111111111111",
        "status": "scheduled",
        "scheduled_for": "2026-09-08T10:00:00Z",
        "created_at": "2026-09-08T09:00:00Z",
    },
    {
        "id": "c4444444-4444-4444-4444-444444444444",
        "elder_id": "e2222222-2222-2222-2222-222222222222",
        "status": "completed",
        "scheduled_for": "2026-09-03T16:00:00Z",
        "completed_at": "2026-09-03T16:07:00Z",
        "created_at": "2026-09-03T16:00:00Z",
        "call_summary": "Checked in on evening gardening. Speech rate slightly slower than usual.",
    },
]

SEED_BASELINES = [
    {
        "elder_id": "e1111111-1111-1111-1111-111111111111",
        "speaking_rate_mean": 146.5,
        "speaking_rate_stddev": 12.0,
        "pause_density_mean": 0.042,
        "pause_density_stddev": 0.015,
        "lexical_diversity_mean": 0.62,
        "lexical_diversity_stddev": 0.05,
        "sample_count": 3,
        "created_at": "2026-08-25T10:05:00Z",
    },
    {
        "elder_id": "e2222222-2222-2222-2222-222222222222",
        "speaking_rate_mean": 132.0,
        "speaking_rate_stddev": 14.5,
        "pause_density_mean": 0.055,
        "pause_density_stddev": 0.02,
        "lexical_diversity_mean": 0.58,
        "lexical_diversity_stddev": 0.06,
        "sample_count": 3,
        "created_at": "2026-08-20T16:00:00Z",
    },
]

SEED_OBSERVATIONS = [
    {
        "id": "o1111111-1111-1111-1111-111111111111",
        "elder_id": "e1111111-1111-1111-1111-111111111111",
        "check_in_id": "c1111111-1111-1111-1111-111111111111",
        "speaking_rate_wpm": 148.0,
        "pause_density": 0.039,
        "lexical_diversity_ttr": 0.63,
        "status": "stable",
        "created_at": "2026-08-25T10:05:00Z",
    },
    {
        "id": "o2222222-2222-2222-2222-222222222222",
        "elder_id": "e1111111-1111-1111-1111-111111111111",
        "check_in_id": "c2222222-2222-2222-2222-222222222222",
        "speaking_rate_wpm": 145.2,
        "pause_density": 0.044,
        "lexical_diversity_ttr": 0.61,
        "status": "stable",
        "created_at": "2026-09-01T10:06:00Z",
    },
]

SEED_CONSENTS = [
    {
        "id": "cn111111-1111-1111-1111-111111111111",
        "elder_id": "e1111111-1111-1111-1111-111111111111",
        "consent_type": "weekly_voice_checkin",
        "status": "confirmed",
        "captured_via": "web",
        "captured_at": "2026-08-01T10:00:00Z",
        "created_at": "2026-08-01T10:00:00Z",
    },
    {
        "id": "cn222222-2222-2222-2222-222222222222",
        "elder_id": "e2222222-2222-2222-2222-222222222222",
        "consent_type": "weekly_voice_checkin",
        "status": "confirmed",
        "captured_via": "web",
        "captured_at": "2026-08-10T10:00:00Z",
        "created_at": "2026-08-10T10:00:00Z",
    },
]


class LocalResponse:
    def __init__(self, data: Any = None, count: int | None = None):
        self.data = data
        self.count = count if count is not None else (len(data) if isinstance(data, list) else 1 if data else 0)


class LocalTableQuery:
    def __init__(self, store: LocalDevStore, table_name: str):
        self.store = store
        self.table_name = table_name
        self.operation = "select"
        self.fields = "*"
        self.filters: list[tuple[str, str, Any]] = []
        self.order_by: tuple[str, bool] | None = None
        self.limit_val: int | None = None
        self.single_flag = False
        self.maybe_single_flag = False
        self.payload: Any = None

    def select(self, fields: str = "*", count: str | None = None):
        self.operation = "select"
        self.fields = fields
        return self

    def insert(self, data: Any):
        self.operation = "insert"
        self.payload = data
        return self

    def update(self, data: Any):
        self.operation = "update"
        self.payload = data
        return self

    def delete(self):
        self.operation = "delete"
        return self

    def eq(self, column: str, value: Any):
        self.filters.append((column, "eq", value))
        return self

    def neq(self, column: str, value: Any):
        self.filters.append((column, "neq", value))
        return self

    def gt(self, column: str, value: Any):
        self.filters.append((column, "gt", value))
        return self

    def gte(self, column: str, value: Any):
        self.filters.append((column, "gte", value))
        return self

    def lt(self, column: str, value: Any):
        self.filters.append((column, "lt", value))
        return self

    def lte(self, column: str, value: Any):
        self.filters.append((column, "lte", value))
        return self

    def order(self, column: str, desc: bool = False):
        self.order_by = (column, desc)
        return self

    def limit(self, count: int):
        self.limit_val = count
        return self

    def single(self):
        self.single_flag = True
        return self

    def maybe_single(self):
        self.maybe_single_flag = True
        return self

    def _matches_filters(self, row: dict) -> bool:
        for col, op, val in self.filters:
            if "." in col:
                parts = col.split(".")
                curr = row
                for p in parts:
                    if isinstance(curr, dict):
                        curr = curr.get(p)
                    else:
                        curr = None
                        break
                row_val = curr
            else:
                row_val = row.get(col)

            if op == "eq":
                if str(row_val) != str(val):
                    return False
            elif op == "neq":
                if str(row_val) == str(val):
                    return False
            elif op == "gt":
                if not (row_val is not None and row_val > val):
                    return False
            elif op == "gte":
                if not (row_val is not None and row_val >= val):
                    return False
            elif op == "lt":
                if not (row_val is not None and row_val < val):
                    return False
            elif op == "lte":
                if not (row_val is not None and row_val <= val):
                    return False
        return True

    def execute(self) -> LocalResponse:
        rows = self.store.tables.setdefault(self.table_name, [])

        if self.operation == "insert":
            inserted = []
            items = [self.payload] if isinstance(self.payload, dict) else list(self.payload)
            for item in items:
                new_row = copy.deepcopy(item)
                if "id" not in new_row:
                    new_row["id"] = str(uuid.uuid4())
                if "created_at" not in new_row:
                    new_row["created_at"] = datetime.now(timezone.utc).isoformat()
                if self.table_name == "elders" and "status" not in new_row:
                    new_row["status"] = "active"
                if self.table_name == "check_ins" and "status" not in new_row:
                    new_row["status"] = "scheduled"
                rows.append(new_row)
                inserted.append(copy.deepcopy(new_row))
            return LocalResponse(data=inserted)

        elif self.operation == "update":
            updated = []
            for row in rows:
                if self._matches_filters(row):
                    row.update(self.payload)
                    updated.append(copy.deepcopy(row))
            return LocalResponse(data=updated)

        elif self.operation == "delete":
            kept = []
            deleted = []
            for row in rows:
                if self._matches_filters(row):
                    deleted.append(row)
                else:
                    kept.append(row)
            self.store.tables[self.table_name] = kept
            return LocalResponse(data=deleted)

        else:
            # select
            enriched_rows = []
            for r in rows:
                row_copy = copy.deepcopy(r)
                if self.table_name == "check_ins" and "elder_id" in row_copy:
                    elder = next(
                        (e for e in self.store.tables.get("elders", []) if e.get("id") == row_copy["elder_id"]),
                        None,
                    )
                    if elder:
                        row_copy["elders"] = {
                            "id": elder.get("id"),
                            "caregiver_id": elder.get("caregiver_id"),
                            "display_name": elder.get("display_name"),
                        }
                enriched_rows.append(row_copy)

            matched = [r for r in enriched_rows if self._matches_filters(r)]
            if self.order_by:
                col, desc = self.order_by
                matched.sort(key=lambda r: str(r.get(col, "")), reverse=desc)

            if self.limit_val is not None:
                matched = matched[: self.limit_val]

            if self.single_flag:
                return LocalResponse(data=matched[0] if matched else None)
            if self.maybe_single_flag:
                return LocalResponse(data=matched[0] if matched else None)

            return LocalResponse(data=matched)


class LocalStorageBucket:
    def __init__(self, bucket_name: str):
        self.bucket_name = bucket_name
        self.bucket_dir = DATA_DIR / bucket_name
        self.bucket_dir.mkdir(parents=True, exist_ok=True)

    def upload(self, path: str, file_bytes: bytes, file_options: Any = None):
        target_file = self.bucket_dir / path.replace("/", os.sep)
        target_file.parent.mkdir(parents=True, exist_ok=True)
        target_file.write_bytes(file_bytes)
        return {"Key": f"{self.bucket_name}/{path}"}

    def download(self, path: str) -> bytes:
        target_file = self.bucket_dir / path.replace("/", os.sep)
        if target_file.exists():
            return target_file.read_bytes()
        return b""

    def create_signed_url(self, path: str, expires_in: int = 3600) -> dict[str, str]:
        return {"signedURL": f"/v1/audio/download?bucket={self.bucket_name}&path={path}"}

    def remove(self, paths: list[str]):
        for p in paths:
            target_file = self.bucket_dir / p.replace("/", os.sep)
            if target_file.exists():
                try:
                    target_file.unlink()
                except Exception:
                    pass
        return {"message": "deleted"}


class LocalStorage:
    def from_(self, bucket_name: str) -> LocalStorageBucket:
        return LocalStorageBucket(bucket_name)


class LocalAuthUser:
    def __init__(self, uid: str = DEFAULT_CAREGIVER_ID, email: str = DEFAULT_CAREGIVER_EMAIL, role: str = "caregiver"):
        self.id = uid
        self.email = email
        self.role = role


class LocalAuthResponse:
    def __init__(self, user: LocalAuthUser):
        self.user = user


class LocalAuth:
    def get_user(self, jwt_token: str | None = None) -> LocalAuthResponse:
        return LocalAuthResponse(LocalAuthUser())


class LocalDevStore:
    def __init__(self):
        self.tables: dict[str, list[dict]] = {
            "users": [
                {
                    "id": DEFAULT_CAREGIVER_ID,
                    "email": DEFAULT_CAREGIVER_EMAIL,
                    "role": "caregiver",
                    "created_at": "2026-08-01T00:00:00Z",
                }
            ],
            "elders": copy.deepcopy(SEED_ELDERS),
            "weekly_schedules": copy.deepcopy(SEED_SCHEDULES),
            "check_ins": copy.deepcopy(SEED_CHECKINS),
            "baselines": copy.deepcopy(SEED_BASELINES),
            "observations": copy.deepcopy(SEED_OBSERVATIONS),
            "consents": copy.deepcopy(SEED_CONSENTS),
            "elder_consents": copy.deepcopy(SEED_CONSENTS),
            "calls": [],
            "checkin_audio": [],
        }
        self.storage = LocalStorage()
        self.auth = LocalAuth()

    def table(self, table_name: str) -> LocalTableQuery:
        return LocalTableQuery(self, table_name)


# Global singleton instance for local dev
_local_store = LocalDevStore()


def get_local_dev_client() -> LocalDevStore:
    return _local_store
