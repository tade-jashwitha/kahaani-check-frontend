from __future__ import annotations

import copy
import json
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
DB_FILE = DATA_DIR.parent / "local_db.json"

DEFAULT_CAREGIVER_ID = "00000000-0000-0000-0000-000000000001"
DEFAULT_CAREGIVER_EMAIL = "caregiver@kahaani.local"

# Seed data - initialized clean (no dummy elders)
SEED_ELDERS: list[dict[str, Any]] = []
SEED_SCHEDULES: list[dict[str, Any]] = []
SEED_CHECKINS: list[dict[str, Any]] = []
SEED_BASELINES: list[dict[str, Any]] = []
SEED_OBSERVATIONS: list[dict[str, Any]] = []
SEED_CONSENTS: list[dict[str, Any]] = []


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

    def in_(self, column: str, values: Any):
        self.filters.append((column, "in", list(values)))
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
                    dev_caregiver_ids = {
                        "00000000-0000-0000-0000-000000000001",
                        "191adf9e-26c9-52d8-90d0-523de2a3ae66",
                    }
                    if col in ("caregiver_id", "elders.caregiver_id") and str(row_val) in dev_caregiver_ids and str(val) in dev_caregiver_ids:
                        pass
                    else:
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
            elif op == "in":
                if str(row_val) not in [str(v) for v in val]:
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
            self.store._save()
            return LocalResponse(data=inserted)

        elif self.operation == "update":
            updated = []
            for row in rows:
                if self._matches_filters(row):
                    row.update(self.payload)
                    updated.append(copy.deepcopy(row))
            self.store._save()
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
            self.store._save()
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

    def upload(self, path: str, file: bytes | Any = None, file_options: Any = None, file_bytes: bytes | None = None, **kwargs):
        target_file = self.bucket_dir / path.replace("/", os.sep)
        target_file.parent.mkdir(parents=True, exist_ok=True)
        data = file if file is not None else file_bytes
        if data is None and "file" in kwargs:
            data = kwargs["file"]
        if hasattr(data, "read"):
            data = data.read()
        target_file.write_bytes(data if isinstance(data, bytes) else bytes(data or b""))
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
        if jwt_token:
            token_str = str(jwt_token).strip()
            user_email = ""
            if ":" in token_str:
                user_email = token_str.split(":", 1)[1].strip()
            elif token_str.startswith("dev-user-"):
                user_email = token_str[len("dev-user-"):].strip()

            if user_email and user_email.lower() != DEFAULT_CAREGIVER_EMAIL.lower():
                import uuid
                user_id = str(uuid.uuid5(uuid.NAMESPACE_DNS, user_email.lower()))
                return LocalAuthResponse(LocalAuthUser(uid=user_id, email=user_email))

        return LocalAuthResponse(LocalAuthUser())


class LocalDevStore:
    def __init__(self):
        self.tables = self._load()
        self.storage = LocalStorage()
        self.auth = LocalAuth()

    def _default_tables(self) -> dict[str, list[dict]]:
        return {
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
            "alerts": [],
        }

    def _load(self) -> dict[str, list[dict]]:
        if DB_FILE.exists():
            try:
                data = json.loads(DB_FILE.read_text(encoding="utf-8"))
                defaults = self._default_tables()
                for k, v in defaults.items():
                    if k not in data:
                        data[k] = v
                return data
            except Exception as exc:
                logger.warning(f"Could not load {DB_FILE}: {exc}")
        tables = self._default_tables()
        self._save(tables)
        return tables

    def _save(self, tables: dict[str, list[dict]] | None = None):
        try:
            target = tables if tables is not None else self.tables
            DB_FILE.parent.mkdir(parents=True, exist_ok=True)
            DB_FILE.write_text(json.dumps(target, indent=2), encoding="utf-8")
        except Exception as exc:
            logger.warning(f"Could not save {DB_FILE}: {exc}")

    def table(self, table_name: str) -> LocalTableQuery:
        self.tables = self._load()
        return LocalTableQuery(self, table_name)


# Global singleton instance for local dev
_local_store = LocalDevStore()


def get_local_dev_client() -> LocalDevStore:
    return _local_store
