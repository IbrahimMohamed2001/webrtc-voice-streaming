# 🔧 Setup Guide - WebRTC Voice Streaming Backend

**Document Version:** 1.0  
**Last Updated:** 2026-01-18

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Local Development Setup](#local-development-setup)
3. [Docker Setup](#docker-setup)
4. [Configuration](#configuration)
5. [Verification](#verification)
6. [Common Setup Issues](#common-setup-issues)

---

## Prerequisites

### System Requirements

| Requirement | Minimum               | Recommended      |
| ----------- | --------------------- | ---------------- |
| **OS**      | Linux (Ubuntu 20.04+) | Ubuntu 22.04 LTS |
| **RAM**     | 512MB                 | 2GB              |
| **CPU**     | 1 core                | 2+ cores         |
| **Network** | 100Mbps LAN           | 1Gbps LAN        |
| **Storage** | 500MB                 | 2GB              |

### Software Dependencies

#### Required

- **Python 3.11+** (for local development)
- **Docker 20.10+** (for containerized deployment)
- **Docker Compose 2.0+** (optional, for multi-container setups)

#### Optional

- **curl** (for testing)
- **git** (for version control)
- **jq** (for JSON parsing in tests)

### Network Requirements

**Ports to Open:**

- `8080/tcp` (or custom `$VOICE_SERVER_PORT`) - WebSocket signaling + WebRTC
- `8081/tcp` (or custom `$AUDIO_PORT`) - HTTP audio streaming

**Firewall Rules:**

```bash
# Ubuntu/Debian (ufw)
sudo ufw allow ${VOICE_SERVER_PORT:-8080}/tcp
sudo ufw allow ${AUDIO_PORT:-8081}/tcp

# CentOS/RHEL (firewalld)
sudo firewall-cmd --permanent --add-port=${VOICE_SERVER_PORT:-8080}/tcp
sudo firewall-cmd --permanent --add-port=${AUDIO_PORT:-8081}/tcp
sudo firewall-cmd --reload
```

---

## Local Development Setup

### Step 1: Clone Repository

```bash
# If not already cloned
cd /mnt/Files/Programming/home_assistant/webrtc_voice_sending
cd webrtc_backend
```

### Step 2: Create Virtual Environment

```bash
# Create virtual environment
python3.11 -m venv venv

# Activate virtual environment
source venv/bin/activate  # Linux/Mac
# OR
venv\Scripts\activate     # Windows
```

### Step 3: Install System Dependencies

**Ubuntu/Debian:**

```bash
sudo apt-get update
sudo apt-get install -y \
    gcc \
    musl-dev \
    libffi-dev \
    libssl-dev \
    ffmpeg \
    python3.11-dev
```

**CentOS/RHEL:**

```bash
sudo yum install -y \
    gcc \
    musl-devel \
    libffi-devel \
    openssl-devel \
    ffmpeg \
    python311-devel
```

**macOS:**

```bash
brew install ffmpeg python@3.11
```

### Step 4: Install Python Dependencies

```bash
pip install --upgrade pip
pip install -r requirements.txt
```

**Expected Output:**

```
Successfully installed aiohttp-3.8.6 aiortc-1.9.0 numpy-1.24.3 ...
```

### Step 5: Verify Installation

```bash
python -c "import aiohttp, aiortc, numpy; print('All dependencies installed successfully!')"
```

### Step 6: Run the Server

```bash
python webrtc_server_relay.py
```

**Expected Output:**

```
INFO:__main__:Server started on 0.0.0.0:8080
INFO:__main__:Audio Stream Server started on 0.0.0.0:8081
```

### Step 7: Test the Server

**Terminal 1 (keep server running):**

```bash
python webrtc_server_relay.py
```

**Terminal 2 (run tests):**

```bash
# Test health endpoint
python test_server.py

# Test WebSocket connection
python test_ws.py

# Test performance
python performance_test.py
```

---

## Docker Setup

### Step 1: Build Docker Image

```bash
cd /mnt/Files/Programming/home_assistant/webrtc_voice_sending/webrtc_backend

docker build -t webrtc-voice-backend:latest .
```

**Expected Output:**

```
[+] Building 45.2s (12/12) FINISHED
 => [internal] load build definition from Dockerfile
 => => transferring dockerfile: 827B
 ...
 => exporting to image
 => => naming to docker.io/library/webrtc-voice-backend:latest
```

### Step 2: Run Docker Container

**Basic Run:**

```bash
docker run -d \
  --name voice-streaming \
  -p ${VOICE_SERVER_PORT:-8080}:8080 \
  -p ${AUDIO_PORT:-8081}:8081 \
  webrtc-voice-backend:latest
```

**With Custom Configuration:**

```bash
docker run -d \
  --name voice-streaming \
  -p ${VOICE_SERVER_PORT:-8080}:8080 \
  -p ${AUDIO_PORT:-8081}:8081 \
  -v $(pwd)/config.json:/app/config.json:ro \
  webrtc-voice-backend:latest
```

**With Logging:**

```bash
docker run -d \
  --name voice-streaming \
  -p ${VOICE_SERVER_PORT:-8080}:8080 \
  -p ${AUDIO_PORT:-8081}:8081 \
  --log-driver json-file \
  --log-opt max-size=10m \
  --log-opt max-file=3 \
  webrtc-voice-backend:latest
```

### Step 3: Verify Container is Running

```bash
# Check container status
docker ps | grep voice-streaming

# Check logs
docker logs voice-streaming

# Check health
docker exec voice-streaming python -c "import urllib.request; print(urllib.request.urlopen('http://localhost:8080/health').read())"
```

### Step 4: Docker Compose Setup (Optional)

Create `docker-compose.yml`:

```yaml
version: "3.8"

services:
  voice-streaming:
    build: .
    container_name: voice-streaming
    ports:
      - "${VOICE_SERVER_PORT:-8080}:8080"
      - "${AUDIO_PORT:-8081}:8081"
    volumes:
      - ./config.json:/app/config.json:ro
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "python", "-c", "import urllib.request; urllib.request.urlopen('http://localhost:8080/health')"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 60s
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"
```

**Run with Docker Compose:**

```bash
docker-compose up -d
docker-compose logs -f
```

---

## Configuration

### Configuration File: `config.json`

**Location:** `/mnt/Files/Programming/home_assistant/webrtc_voice_sending/webrtc_backend/config.json`

**Full Configuration:**

```json
{
  "webrtc": {
    "ice_servers": [],
    "rtc_config": {
      "bundlePolicy": "max-bundle",
      "rtcpMuxPolicy": "require",
      "sdpSemantics": "unified-plan",
      "iceCandidatePoolSize": 0,
      "iceTransportPolicy": "all"
    },
    "audio_constraints": {
      "sample_rate": 16000,
      "channels": 1,
      "echo_cancellation": true,
      "noise_suppression": true,
      "auto_gain_control": true,
      "latency": 0
    },
    "connection_timeout": 30,
    "reconnect_attempts": 5
  },
  "server": {
    "port": 8080,
    "host": "0.0.0.0",
    "max_connections": 50,
    "queue_size": 100
  },
  "lan_mode": {
    "enabled": true,
    "description": "Internal network only, no external STUN/TURN"
  }
}
```

### Configuration Parameters Explained

#### WebRTC Section

| Parameter              | Default        | Description                                                |
| ---------------------- | -------------- | ---------------------------------------------------------- |
| `ice_servers`          | `[]`           | Empty for LAN-only. Add STUN/TURN servers for internet use |
| `bundlePolicy`         | `max-bundle`   | Bundle all media on one connection                         |
| `rtcpMuxPolicy`        | `require`      | Multiplex RTP and RTCP on same port                        |
| `sdpSemantics`         | `unified-plan` | Modern WebRTC standard                                     |
| `iceCandidatePoolSize` | `0`            | Pre-gather ICE candidates (0 = disabled)                   |
| `iceTransportPolicy`   | `all`          | Use all ICE candidates (host, srflx, relay)                |

#### Audio Constraints

| Parameter           | Default | Description                                          |
| ------------------- | ------- | ---------------------------------------------------- |
| `sample_rate`       | `16000` | Audio sample rate in Hz (16kHz is optimal for voice) |
| `channels`          | `1`     | Mono audio (1) or stereo (2)                         |
| `echo_cancellation` | `true`  | Enable acoustic echo cancellation                    |
| `noise_suppression` | `true`  | Enable noise suppression                             |
| `auto_gain_control` | `true`  | Enable automatic gain control                        |
| `latency`           | `0`     | Target latency in ms (0 = lowest possible)           |

#### Server Section

| Parameter         | Default   | Description                             |
| ----------------- | --------- | --------------------------------------- |
| `port`            | `8080`    | WebSocket/WebRTC port                   |
| `host`            | `0.0.0.0` | Bind address (0.0.0.0 = all interfaces) |
| `max_connections` | `50`      | Maximum concurrent connections          |
| `queue_size`      | `100`     | WebSocket message queue size            |

### Environment Variables

You can override configuration with environment variables:

```bash
# Server settings
export VOICE_SERVER_PORT=8080
export AUDIO_PORT=8081
export VOICE_SERVER_HOST=0.0.0.0

# Audio settings
export VOICE_SAMPLE_RATE=16000
export VOICE_CHANNELS=1

# Run server
python webrtc_server_relay.py
```

**Note:** Currently, environment variable support is not implemented. Configuration is read from `config.json` only. This is a potential enhancement.

---

## Verification

### Health Check

```bash
curl http://localhost:8080/health
```

**Expected Response:**

```json
{
  "status": "healthy",
  "webrtc_available": true,
  "audio_server_running": true,
  "active_streams": 0,
  "connected_clients": 0,
  "uptime_seconds": 42
}
```

### Metrics Check

```bash
curl http://localhost:8080/metrics
```

**Expected Response:**

```json
{
  "uptime_seconds": 123,
  "active_connections": 0,
  "active_streams": 0,
  "total_audio_bytes": 0,
  "webrtc_available": true
}
```

### WebSocket Test

```bash
python test_ws.py
```

**Expected Output:**

```
Connected to WebSocket
Sent test message
Received: (WebSocket response)
```

### Audio Stream Status

```bash
curl http://localhost:8081/stream/status
```

**Expected Response:**

```json
{
  "active_streams": []
}
```

### Full Integration Test

**Step 1:** Start server

```bash
python webrtc_server_relay.py
```

**Step 2:** Open browser to test page

```
http://localhost:${AUDIO_PORT:-8081}/stream/latest.mp3
```

**Expected:** "Waiting for Audio Stream..." page with spinner

**Step 3:** Connect a sender (requires WebRTC client)

**Step 4:** Refresh browser - should start playing audio

---

## Modifying the Configured Port

The backend streams standalone audio via a separate HTTP port that defaults to `8081`. This has been decoupled from the primary application server to prevent conflicts and ensure stable HTTP streaming.

**If running as a Home Assistant Add-on:**

1. Navigate to **Settings** > **Add-ons**.
2. Click on the **Voice Streaming Backend** add-on.
3. Switch to the **Configuration** tab.
4. You will see an **audio_port** setting (default `8081`). Change this to whatever port you wish to use dynamically.
5. Save and restart the add-on.

**If running manually or via Docker:**
Override the port by setting the `AUDIO_PORT` environment variable:

```bash
export AUDIO_PORT=9090
python webrtc_server_relay.py
```

_Note: If changing this on Docker, remember to modify the `-p` flag bindings as well._

---

## Common Setup Issues

### Issue 1: Port Already in Use

**Symptom:**

```
OSError: [Errno 98] Address already in use
```

**Solution:**

```bash
# Find process using port 8080 or port 8081
sudo lsof -i :8080
sudo lsof -i :8081
# OR
sudo netstat -tulpn | grep 8080

# Kill the process
sudo kill -9 <PID>

# Or change ports via environment variables:
# export VOICE_SERVER_PORT=9090
# export AUDIO_PORT=9091
```

---

### Issue 2: FFmpeg Not Found

**Symptom:**

```
FileNotFoundError: [Errno 2] No such file or directory: 'ffmpeg'
```

**Solution:**

```bash
# Ubuntu/Debian
sudo apt-get install ffmpeg

# CentOS/RHEL
sudo yum install ffmpeg

# macOS
brew install ffmpeg

# Verify installation
ffmpeg -version
```

---

### Issue 3: aiortc Installation Fails

**Symptom:**

```
error: command 'gcc' failed with exit status 1
```

**Solution:**

```bash
# Install build dependencies
sudo apt-get install -y gcc python3.11-dev libffi-dev libssl-dev

# Upgrade pip
pip install --upgrade pip setuptools wheel

# Retry installation
pip install aiortc
```

---

### Issue 4: Permission Denied (Docker)

**Symptom:**

```
Got permission denied while trying to connect to the Docker daemon socket
```

**Solution:**

```bash
# Add user to docker group
sudo usermod -aG docker $USER

# Log out and log back in, or run:
newgrp docker

# Verify
docker ps
```

---

### Issue 5: Container Exits Immediately

**Symptom:**

```
docker ps shows no running container
```

**Solution:**

```bash
# Check logs
docker logs voice-streaming

# Common causes:
# 1. Port conflict - change ports in docker run command
# 2. Missing dependencies - rebuild image
# 3. Configuration error - check config.json syntax

# Rebuild image
docker build --no-cache -t webrtc-voice-backend:latest .
```

---

### Issue 6: WebSocket Connection Refused

**Symptom:**

```
Error: WebSocket connection refused
```

**Solution:**

```bash
# Check server is running
curl http://localhost:8080/health

# Check firewall
sudo ufw status
sudo ufw allow 8080/tcp

# Check Docker port mapping
docker port voice-streaming

# Check server logs
docker logs voice-streaming | grep ERROR
```

---

### Issue 7: No Audio in Browser

**Symptom:**
Browser connects but no audio plays

**Solution:**

1. Check if stream exists:

   ```bash
   curl http://localhost:8081/stream/status
   ```

2. Verify sender is connected and streaming

3. Check browser console for errors

4. Try different browser (Chrome/Firefox recommended)

5. Check audio permissions in browser

---

## Post-Setup Checklist

After completing setup, verify:

- ✅ Health endpoint returns `"status": "healthy"`
- ✅ Metrics endpoint returns valid JSON
- ✅ WebSocket test connects successfully
- ✅ Audio stream status endpoint responds
- ✅ Server logs show no errors
- ✅ Ports 8080 and 8081 are accessible
- ✅ Docker container (if used) is running and healthy

---

## Next Steps

**Setup Complete!** 🎉

Now you can:

- **Integrate with clients:** See `03-API-REFERENCE.md`
- **Deploy to production:** See `06-DEPLOYMENT.md`
- **Develop and extend:** See `05-DEVELOPMENT-GUIDE.md`
- **Troubleshoot issues:** See `04-TROUBLESHOOTING.md`

---

## Quick Reference Commands

```bash
# Local Development
python webrtc_server_relay.py
python test_server.py
python test_ws.py

# Docker
docker build -t webrtc-voice-backend .
docker run -d -p ${VOICE_SERVER_PORT:-8080}:8080 -p ${AUDIO_PORT:-8081}:8081 --name voice-streaming webrtc-voice-backend
docker logs -f voice-streaming
docker stop voice-streaming
docker rm voice-streaming

# Health Checks
curl http://localhost:8080/health
curl http://localhost:8080/metrics
curl http://localhost:8081/stream/status

# Debugging
docker exec -it voice-streaming /bin/bash
docker logs voice-streaming | grep ERROR
netstat -tulpn | grep 808
```

---

**Need Help?** See `04-TROUBLESHOOTING.md` for detailed debugging guides.
