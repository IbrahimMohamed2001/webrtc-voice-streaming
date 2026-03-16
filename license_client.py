"""
License Client for WebRTC Voice Streaming Add-on.

Handles license activation, validation, heartbeat, and cached-token
grace-period logic against the external license server.

Usage (CLI – called from run.sh):
    python3 license_client.py activate \
        --server http://license-server:8000 \
        --email user@example.com \
        --purchase-code XXXX-YYYY

Usage (Library – called from webrtc_server_relay.py):
    from license_client import LicenseClient
    client = LicenseClient(server_url, email, purchase_code)
    await client.ensure_licensed()
"""

import argparse
import asyncio
import hashlib
import json
import logging
import os
import sys
import time
from datetime import datetime, timedelta
from pathlib import Path
from typing import Optional, Tuple

import httpx

from hw_fingerprint import generate_hardware_id

logger = logging.getLogger(__name__)

# ── Defaults ────────────────────────────────────────────────────────
DATA_DIR = Path(os.environ.get("LICENSE_DATA_DIR", "/data/license"))
GRACE_PERIOD_HOURS = 24
VALIDATION_INTERVAL_MIN = 30
HEARTBEAT_INTERVAL_MIN = 10
MAX_RETRIES = 3
RETRY_BACKOFF_BASE = 2  # seconds


class LicenseClient:
    """Async client that talks to the license server."""

    def __init__(
        self,
        server_url: str,
        email: str,
        purchase_code: str,
        data_dir: Path = DATA_DIR,
    ):
        self.server_url = server_url.rstrip("/")
        self.email = email
        self.purchase_code = purchase_code
        self.data_dir = data_dir

        self.data_dir.mkdir(parents=True, exist_ok=True)

        self.token_path = self.data_dir / "license.enc"
        self.pubkey_path = self.data_dir / "public_key.pem"
        self.state_path = self.data_dir / "license_state.json"

        self.token: Optional[str] = None
        self.session_id: Optional[str] = None
        self.hardware_id: Optional[str] = None
        self.hardware_components: Optional[dict] = None
        self._consecutive_failures = 0

    # ── Public API ──────────────────────────────────────────────────

    async def ensure_licensed(self) -> bool:
        """
        Main entry-point used at startup.

        1. Generate hardware fingerprint.
        2. Try to activate (or use cached token).
        3. Validate the token.

        Returns True if licensed, False otherwise.
        """
        self.hardware_id, self.hardware_components = generate_hardware_id()
        self.session_id = self._make_session_id()
        logger.info(f"Hardware ID: {self.hardware_id[:16]}...")

        # Try activation (server may already have us – that's fine)
        activated = await self._activate()

        if not activated:
            # Try cached token with grace period
            if self._load_cached_token():
                logger.info("Using cached license token (grace period).")
                return True
            logger.error("No valid license and no cached token within grace period.")
            return False

        # Validate immediately
        valid = await self._validate()
        if not valid:
            logger.warning(
                "Activation succeeded but initial validation failed – "
                "allowing startup with cached token."
            )
            return self._load_cached_token()

        return True

    async def periodic_validation_loop(self, get_telemetry=None):
        """
        Long-running loop (call as asyncio task) that periodically
        validates the license and sends heartbeats.

        Args:
            get_telemetry: optional callable returning a dict of telemetry.
        """
        heartbeat_interval = HEARTBEAT_INTERVAL_MIN * 60
        validation_interval = VALIDATION_INTERVAL_MIN * 60
        last_validation = time.monotonic()
        last_heartbeat = time.monotonic()

        while True:
            try:
                await asyncio.sleep(60)  # tick every minute
                now = time.monotonic()

                # Heartbeat
                if now - last_heartbeat >= heartbeat_interval:
                    await self._heartbeat()
                    last_heartbeat = now

                # Full validation
                if now - last_validation >= validation_interval:
                    telemetry = get_telemetry() if get_telemetry else {}
                    valid = await self._validate(telemetry=telemetry)
                    last_validation = now

                    if valid:
                        self._consecutive_failures = 0
                    else:
                        self._consecutive_failures += 1
                        logger.warning(
                            f"License validation failed "
                            f"({self._consecutive_failures} consecutive)."
                        )

                    if self._consecutive_failures >= 3:
                        logger.error(
                            "License validation failed 3 consecutive times – "
                            "shutting down."
                        )
                        # Give the caller a chance to react
                        return False

            except asyncio.CancelledError:
                logger.info("License validation loop cancelled.")
                return True
            except Exception as e:
                logger.error(f"Error in license loop: {e}", exc_info=True)

    @property
    def is_licensed(self) -> bool:
        return self.token is not None

    def get_status(self) -> dict:
        """Return license status for health/metrics endpoints."""
        return {
            "licensed": self.is_licensed,
            "hardware_id_preview": (
                f"{self.hardware_id[:8]}...{self.hardware_id[-8:]}"
                if self.hardware_id
                else None
            ),
            "consecutive_failures": self._consecutive_failures,
            "grace_period_active": self._is_within_grace_period(),
        }

    # ── Private: HTTP calls ─────────────────────────────────────────

    async def _activate(self) -> bool:
        """Activate license on the server. Returns True on success."""
        payload = {
            "email": self.email,
            "purchase_code": self.purchase_code,
            "hardware_id": self.hardware_id,
            "hardware_components": self.hardware_components,
        }

        resp = await self._post("/api/v1/activate", payload)
        if resp is None:
            return False

        if resp.get("success"):
            self.token = resp["token"]
            self._save_token()
            self._save_state("activated")
            logger.info("License activated successfully.")
            # Also fetch and cache the public key
            await self._fetch_public_key()
            return True

        # 409 = already activated – try to load cached token
        detail = resp.get("detail", "")
        if "already activated" in detail.lower():
            logger.info("Hardware already activated – loading cached token.")
            if self._load_cached_token():
                return True
            logger.warning("Already activated but no cached token found.")

        if "already has an active license" in detail.lower():
            logger.info("Email already has active license – loading cached token.")
            if self._load_cached_token():
                return True

        logger.error(f"Activation failed: {detail}")
        return False

    async def _validate(self, telemetry: dict = None) -> bool:
        """Validate the current token. Returns True if valid."""
        if not self.token:
            return False

        payload = {
            "token": self.token,
            "hardware_id": self.hardware_id,
            "session_id": self.session_id,
            "telemetry": {
                "hardware_components": self.hardware_components,
                **(telemetry or {}),
            },
        }

        resp = await self._post("/api/v1/validate", payload)
        if resp is None:
            # Network error – rely on grace period
            return self._is_within_grace_period()

        if resp.get("valid"):
            self._save_state("validated")
            logger.info("License re-validation successful.")
            return True

        detail = resp.get("detail", "")
        logger.warning(f"Validation rejected: {detail}")

        # Hard failures – no grace
        if any(
            kw in detail.lower()
            for kw in ("suspended", "revoked", "hardware mismatch")
        ):
            self._save_state("rejected")
            return False

        # Soft failures – use grace
        return self._is_within_grace_period()

    async def _heartbeat(self) -> bool:
        """Send keep-alive heartbeat."""
        if not self.token:
            return False

        payload = {
            "token": self.token,
            "session_id": self.session_id,
        }

        resp = await self._post("/api/v1/heartbeat", payload)
        if resp and resp.get("success"):
            logger.debug("Heartbeat sent successfully.")
            return True
        return False

    async def _fetch_public_key(self):
        """Fetch and cache the server's public key."""
        try:
            async with httpx.AsyncClient(timeout=10) as client:
                r = await client.get(f"{self.server_url}/api/v1/public_key")
                if r.status_code == 200:
                    pem = r.json().get("public_key", "")
                    self.pubkey_path.write_text(pem)
                    logger.info("Public key cached.")
        except Exception as e:
            logger.warning(f"Failed to fetch public key: {e}")

    async def _post(self, path: str, payload: dict) -> Optional[dict]:
        """POST with retry logic. Returns parsed JSON or None on failure."""
        url = f"{self.server_url}{path}"
        for attempt in range(MAX_RETRIES):
            try:
                async with httpx.AsyncClient(timeout=15) as client:
                    r = await client.post(url, json=payload)
                    # Both 2xx and 4xx carry useful JSON
                    return r.json()
            except Exception as e:
                wait = RETRY_BACKOFF_BASE ** (attempt + 1)
                logger.warning(
                    f"Request to {path} failed (attempt {attempt + 1}/{MAX_RETRIES}): "
                    f"{e}. Retrying in {wait}s..."
                )
                await asyncio.sleep(wait)

        logger.error(f"All {MAX_RETRIES} attempts to {path} failed.")
        return None

    # ── Private: persistence ────────────────────────────────────────

    def _save_token(self):
        self.token_path.write_text(self.token)

    def _load_cached_token(self) -> bool:
        """Load token from disk if it exists and is within grace period."""
        if not self.token_path.exists():
            return False
        self.token = self.token_path.read_text().strip()
        if not self.token:
            return False
        if self._is_within_grace_period():
            return True
        logger.warning("Cached token is outside grace period.")
        return False

    def _save_state(self, status: str):
        state = {
            "status": status,
            "last_success": datetime.utcnow().isoformat(),
            "hardware_id": self.hardware_id,
            "session_id": self.session_id,
        }
        self.state_path.write_text(json.dumps(state, indent=2))

    def _is_within_grace_period(self) -> bool:
        if not self.state_path.exists():
            return False
        try:
            state = json.loads(self.state_path.read_text())
            last = datetime.fromisoformat(state["last_success"])
            return datetime.utcnow() - last < timedelta(hours=GRACE_PERIOD_HOURS)
        except Exception:
            return False

    def _make_session_id(self) -> str:
        """Deterministic session ID based on hardware + timestamp bucket."""
        bucket = int(time.time()) // 3600  # hourly bucket
        raw = f"{self.hardware_id}:{bucket}"
        return f"addon-{hashlib.sha256(raw.encode()).hexdigest()[:16]}"


# ── CLI entry-point (called from run.sh) ────────────────────────────

def main():
    parser = argparse.ArgumentParser(description="License Client CLI")
    parser.add_argument(
        "action", choices=["activate"], help="Action to perform"
    )
    parser.add_argument("--server", required=True, help="License server URL")
    parser.add_argument("--email", required=True, help="License email")
    parser.add_argument("--purchase-code", required=True, help="Purchase code")
    parser.add_argument(
        "--data-dir",
        default=str(DATA_DIR),
        help="Directory to persist license data",
    )
    args = parser.parse_args()

    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    )

    client = LicenseClient(
        server_url=args.server,
        email=args.email,
        purchase_code=args.purchase_code,
        data_dir=Path(args.data_dir),
    )

    success = asyncio.run(client.ensure_licensed())
    sys.exit(0 if success else 1)


if __name__ == "__main__":
    main()
