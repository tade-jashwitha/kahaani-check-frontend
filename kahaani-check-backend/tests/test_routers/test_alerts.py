import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_list_alerts():
    """Verify GET /v1/alerts returns alerts list and unread count."""
    res = client.get("/v1/alerts", headers={"Authorization": "Bearer test"})
    assert res.status_code == 200
    data = res.json()
    assert "alerts" in data
    assert "unread_count" in data
    assert isinstance(data["alerts"], list)
    assert isinstance(data["unread_count"], int)


def test_resolve_alert_flow():
    """Verify creating or resolving an alert works."""
    # List alerts
    res = client.get("/v1/alerts", headers={"Authorization": "Bearer test"})
    assert res.status_code == 200
    alerts = res.json().get("alerts", [])

    if alerts:
        target_id = alerts[0]["id"]
        patch_res = client.patch(f"/v1/alerts/{target_id}/resolve", headers={"Authorization": "Bearer test"})
        assert patch_res.status_code == 200
        patch_data = patch_res.json()
        assert patch_data.get("success") is True
        assert patch_data.get("alert", {}).get("resolved") is True


def test_non_diagnostic_alert_content():
    """Ensure alert messages and details contain no clinical or diagnostic terminology."""
    FORBIDDEN_WORDS = [
        "dementia", "alzheimer", "mci", "patholog", "disease",
        "abnormal", "unhealthy", "at risk", "cognitive decline"
    ]
    res = client.get("/v1/alerts", headers={"Authorization": "Bearer test"})
    assert res.status_code == 200
    for alert in res.json().get("alerts", []):
        combined = f"{alert.get('message', '')} {alert.get('detail', '')}".lower()
        for forbidden in FORBIDDEN_WORDS:
            assert forbidden not in combined, f"Found forbidden term '{forbidden}' in alert!"
