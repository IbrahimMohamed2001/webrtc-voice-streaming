import asyncio
import logging
import os

import aiohttp

# Configure logging
logging.basicConfig(
    level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger("register_frontend")

SUPERVISOR_TOKEN = os.environ.get("SUPERVISOR_TOKEN")

# URL of the resource to register
# Note: /local maps to /config/www in HA
RESOURCE_URL = "/local/voice_streaming_backend/dist/voice-streaming-card-dashboard.js"
RESOURCE_TYPE = "module"

# Supervisor API endpoint for Core API proxy
# derive BASE_URL from HA_ADDRESS if available, otherwise use supervisor proxy
HA_ADDRESS = os.environ.get("HA_ADDRESS", "http://supervisor/core")
BASE_URL = f"{HA_ADDRESS.rstrip('/')}/api"


async def register():
    if not SUPERVISOR_TOKEN:
        logger.warning(
            "SUPERVISOR_TOKEN not found. Cannot register frontend resource automatically."
        )
        return

    headers = {
        "Authorization": f"Bearer {SUPERVISOR_TOKEN}",
        "Content-Type": "application/json",
    }

    async with aiohttp.ClientSession() as session:
        # 1. Get existing resources
        # We need to handle the case where Lovelace is in YAML mode (resources might not be editable via API)
        # But commonly in UI mode, this works.
        try:
            async with session.get(
                f"{BASE_URL}/lovelace/resources", headers=headers
            ) as resp:
                if resp.status == 401:
                    logger.error("Unauthorized: Supervisor token rejected.")
                    return
                if resp.status != 200:
                    # Could be 404 if Lovelace not set up or 405 if in YAML mode
                    text = await resp.text()
                    logger.warning(
                        f"Could not list Lovelace resources (Status {resp.status}): {text}. You may need to add the resource manually."
                    )
                    return

                resources = await resp.json()

        except Exception as e:
            logger.error(f"Error connecting to Home Assistant API: {e}")
            return

        # 2. Check for duplicates
        for res in resources:
            if res.get("url") == RESOURCE_URL:
                logger.info(
                    f"Frontend resource already registered with ID {res.get('id')}."
                )
                return

        # 3. Register resource
        logger.info(f"Registering new Lovelace resource: {RESOURCE_URL}")
        payload = {"url": RESOURCE_URL, "type": RESOURCE_TYPE}

        try:
            async with session.post(
                f"{BASE_URL}/lovelace/resources", headers=headers, json=payload
            ) as resp:
                if resp.status in [200, 201]:
                    data = await resp.json()
                    logger.info(
                        f"Successfully registered frontend resource! ID: {data.get('id')}"
                    )
                else:
                    text = await resp.text()
                    logger.error(f"Failed to register resource: {resp.status} - {text}")
        except Exception as e:
            logger.error(f"Error registering resource: {e}")


if __name__ == "__main__":
    try:
        asyncio.run(register())
    except Exception as e:
        logger.error(f"Unexpected error in registration script: {e}")
