import logging
import os
import aiohttp
from aiohttp import web

logger = logging.getLogger(__name__)

# Constants for configuration, can be overridden by environment variables
LICENSE_SERVER_URL = os.environ.get("LICENSE_SERVER_URL", "https://tis-license.in/api/")
HA_ADDRESS = os.environ.get("HA_ADDRESS", "http://homeassistant.local:8123")


class LicenseManager:
    """Handles the communication with license servers."""

    def __init__(self, ha_address=None, license_server_url=None):
        self.ha_address = ha_address or HA_ADDRESS
        self.license_server_url = license_server_url or LICENSE_SERVER_URL

    async def verify_license(self):
        """
        Fetches and verifies the license key.
        Matches the logic of the PHP fetchLicenseFromRemote function.
        """
        try:
            url_get_key = f"{self.ha_address.rstrip('/')}/api/get_key"

            async with aiohttp.ClientSession() as session:
                async with session.get(url_get_key, timeout=10) as resp:
                    if resp.status == 200:
                        data = await resp.json()
                        if data and "key" in data:
                            key = data["key"]

                            verify_url = f"{self.license_server_url.rstrip('/')}/verify"
                            async with session.get(
                                verify_url, params={"mac": key}, timeout=10
                            ) as response:
                                if response.status == 200:
                                    res_json = await response.json()
                                    if res_json.get("status") == "success":
                                        return res_json

                                if response.status == 401:
                                    logger.error(
                                        "Unauthorized access to license server."
                                    )
                                    return {"status": 401, "message": "License expired"}
                                elif response.status == 404:
                                    logger.error(
                                        "License endpoint not found on server."
                                    )
                                    return {"status": 404, "message": "Unauthorized"}

                                return None
                        else:
                            logger.error("License key 'key' not found in HA response.")
                            return None
                    else:
                        logger.error(
                            f"Failed to retrieve key from HA. Status: {resp.status}"
                        )
                        return None
        except Exception as e:
            logger.error(f"Error in license verification: {e}")
            return None


@web.middleware
async def license_middleware(request: web.Request, handler):
    """
    aiohttp middleware to protect routes.
    Protects /, /ws, and all other routes except health/metrics.
    """
    # 1. Bypass check for health and utility routes
    if request.path in ["/health", "/metrics", "/ca.crt"]:
        return await handler(request)

    # 2. Perform license check for all other routes including / and /ws
    logger.debug(f"Checking license for route: {request.path}")
    manager = LicenseManager()
    license_data = await manager.verify_license()

    # Success
    if license_data and license_data.get("status") == "success":
        return await handler(request)

    # Specific error handling
    if license_data and isinstance(license_data, dict):
        status = license_data.get("status", 401)
        message = license_data.get("message", "Unauthorized")
        try:
            status_int = int(status)
        except:
            status_int = 401

        return web.json_response(
            {"status": "error", "message": message}, status=status_int
        )

    # Default Unauthorized
    return web.json_response(
        {"status": "error", "message": "Unauthorized: License verification failed"},
        status=401,
    )
