import hashlib
import subprocess
import uuid
import socket
import json


def generate_hardware_id():
    components = {}

    try:
        with open("/etc/machine-id", "r") as f:
            components["machine_id"] = f.read().strip()
    except:
        components["machine_id"] = "none"

    try:
        mac = ":".join(
            [
                "{:02x}".format((uuid.getnode() >> elements) & 0xFF)
                for elements in range(0, 2 * 6, 2)
            ][::-1]
        )
        components["mac"] = mac
    except:
        components["mac"] = "none"

    try:
        with open("/proc/cpuinfo", "r") as f:
            for line in f:
                if line.startswith("Serial"):
                    components["cpu_serial"] = line.split(":")[1].strip()
                    break
    except:
        pass

    try:
        result = subprocess.run(
            ["blkid", "-s", "UUID", "-o", "value", "/dev/mmcblk0p2"],
            capture_output=True,
            text=True,
            timeout=2,
        )
        if result.returncode == 0:
            components["disk_uuid"] = result.stdout.strip()
    except:
        try:
            result = subprocess.run(
                ["blkid", "-s", "UUID", "-o", "value", "/dev/sda1"],
                capture_output=True,
                text=True,
                timeout=2,
            )
            if result.returncode == 0:
                components["disk_uuid"] = result.stdout.strip()
        except:
            pass

    try:
        components["hostname"] = socket.gethostname()
    except:
        components["hostname"] = "unknown"

    sorted_components = dict(sorted(components.items()))
    fingerprint_data = json.dumps(sorted_components, sort_keys=True)
    hardware_id = hashlib.sha256(fingerprint_data.encode()).hexdigest()

    return hardware_id, sorted_components


def validate_hardware_components(stored_components, current_components):
    stored = set(stored_components.items())
    current = set(current_components.items())

    matching = stored & current
    changed = (stored | current) - matching

    match_percentage = len(matching) / len(stored) * 100 if stored else 0

    changed_list = [key for key, _ in changed]
    is_valid = match_percentage >= 60.0

    return is_valid, changed_list, match_percentage
