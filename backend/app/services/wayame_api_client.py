import requests
import logging
from datetime import datetime, timedelta
from typing import Optional, Tuple
from functools import lru_cache

from app.core.config import settings

logger = logging.getLogger(__name__)

class WayaMeAPIClient:
    def __init__(self, base_url: str, client_id: str, client_secret: str):
        self.base_url = base_url
        self.client_id = client_id
        self.client_secret = client_secret
        self.access_token = None
        self.token_expiry = None

    def authenticate(self) -> bool:
        """Obtain OAuth 2.0 access token"""
        logger.info("Authenticating with WayaMe API...")
        try:
            response = requests.post(
                f"{self.base_url}/token",
                data={
                    "grant_type": "client_credentials",
                    "client_id": self.client_id,
                    "client_secret": self.client_secret
                },
                timeout=10
            )
            response.raise_for_status()
            data = response.json()
            self.access_token = data["access_token"]
            self.token_expiry = datetime.utcnow() + timedelta(seconds=data["expires_in"])
            logger.info("Authentication successful.")
            return True
        except requests.exceptions.RequestException as e:
            logger.error(f"Authentication failed: {e}")
            return False

    def _get_headers(self) -> dict:
        if not self.access_token or datetime.utcnow() >= self.token_expiry:
            if not self.authenticate():
                raise Exception("Authentication failed")
        return {
            "Authorization": f"Bearer {self.access_token}",
            "Content-Type": "application/json",
            "x-version": "1.0",
            "ParticipantId": self.client_id
        }

    async def verify_payment(self, transaction_id: str, amount: str, 
                       merchant_id: str) -> Tuple[bool, Optional[dict]]:
        """Verify payment status from WayaMe"""
        logger.info(f"Verifying payment {transaction_id} with WayaMe.")
        try:
            response = requests.get(
                f"{self.base_url}/payment/status/{transaction_id}",
                headers=self._get_headers(),
                params={"merchant_id": merchant_id},
                timeout=10
            )
            response.raise_for_status()
            data = response.json()
            if data.get("status") == "success" and data.get("amount") == amount:
                logger.info(f"Payment {transaction_id} verified successfully.")
                return True, data
            logger.warning(f"Payment {transaction_id} verification failed: Status or amount mismatch.")
            return False, None
        except requests.exceptions.RequestException as e:
            logger.error(f"Payment verification request failed: {e}")
            return False, None

    async def register_device(self, device_id: str, merchant_id: str, 
                        firmware_version: str) -> bool:
        """Register a new SoundBox device"""
        logger.info(f"Registering device {device_id} with WayaMe.")
        try:
            payload = {
                "device_id": device_id,
                "merchant_id": merchant_id,
                "firmware_version": firmware_version,
                "device_type": "soundbox",
                "registration_time": datetime.utcnow().isoformat()
            }
            response = requests.post(
                f"{self.base_url}/device/register",
                headers=self._get_headers(),
                json=payload,
                timeout=10
            )
            response.raise_for_status()
            logger.info(f"Device {device_id} registered successfully.")
            return True
        except requests.exceptions.RequestException as e:
            logger.error(f"Device registration failed: {e}")
            return False

    async def send_heartbeat(self, device_id: str, battery: int, 
                       signal: int) -> bool:
        """Send device heartbeat"""
        logger.info(f"Sending heartbeat for device {device_id}.")
        try:
            payload = {
                "device_id": device_id,
                "battery": battery,
                "signal": signal,
                "timestamp": datetime.utcnow().isoformat()
            }
            response = requests.post(
                f"{self.base_url}/device/heartbeat",
                headers=self._get_headers(),
                json=payload,
                timeout=10
            )
            response.raise_for_status()
            return True
        except requests.exceptions.RequestException as e:
            logger.error(f"Heartbeat failed for device {device_id}: {e}")
            return False

@lru_cache()
def get_wayame_api_client() -> WayaMeAPIClient:
    return WayaMeAPIClient(
        base_url=settings.WAYAME_API_BASE_URL,
        client_id=settings.WAYAME_CLIENT_ID,
        client_secret=settings.WAYAME_CLIENT_SECRET
    )
