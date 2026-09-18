"""Server errors must reach the browser as errors, not as a dead network.

    ./.venv/Scripts/python.exe test_errors.py

No models are loaded (TestClient without a context manager skips warmup).
"""

import io
import sys

from fastapi.testclient import TestClient

from main import app

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")


@app.get("/__boom")
def _boom():
    raise RuntimeError("deliberate test failure")


client = TestClient(app, raise_server_exceptions=False)
ORIGIN = {"Origin": "http://localhost:5173"}


def test_unhandled_error_keeps_cors_and_a_message():
    r = client.get("/__boom", headers=ORIGIN)
    assert r.status_code == 500, r.status_code
    # Without this header the browser discards the response and the app
    # can only say "Couldn't reach the server".
    assert r.headers.get("access-control-allow-origin") == "*", dict(r.headers)
    assert "went wrong on the server" in r.json()["detail"]
    print("500      : JSON detail with CORS headers, readable by the app")


def test_health_reports_readiness():
    body = client.get("/health").json()
    assert body["ok"] is True
    assert set(body["models"]) == {"translation", "tts", "asr"}
    assert body["ready"] is False, "nothing is loaded without warmup"
    print(f"health   : {body}")


if __name__ == "__main__":
    test_unhandled_error_keeps_cors_and_a_message()
    test_health_reports_readiness()
    print("\nPASS")
