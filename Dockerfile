# Global ARG – must be before any FROM to be available in FROM lines
ARG BUILD_FROM=ghcr.io/home-assistant/amd64-base:latest

# Stage 1: Build the frontend
FROM node:20-alpine AS frontend-builder
WORKDIR /app
COPY frontend/package*.json ./frontend/
RUN cd frontend && npm install
COPY frontend/ ./frontend/
RUN cd frontend && npm run build

# Stage 2: Final image
ARG BUILD_FROM
FROM $BUILD_FROM

# Install dependencies
# Copy requirements
COPY requirements.txt .

# Install runtime dependencies and build dependencies
RUN apk update && \
    apk add --no-cache python3 py3-pip curl openssl jq netcat-openbsd bash ffmpeg && \
    apk add --no-cache --virtual .build-deps \
        build-base \
        python3-dev \
        libffi-dev \
        openssl-dev \
        ffmpeg-dev \
        pkgconfig \
        rust \
        cargo \
        musl-dev \
        linux-headers \
        cmake \
        g++ \
        zlib-dev \
        jpeg-dev && \
    pip install --no-cache-dir --break-system-packages --upgrade pip setuptools wheel && \
    pip install --no-cache-dir --break-system-packages --prefer-binary -r requirements.txt && \
    apk del .build-deps && \
    rm -rf /var/cache/apk/*

# Set working directory to /app
WORKDIR /app

# Copy application files (Python scripts and root files)
COPY *.py ./
COPY *.yaml ./

# Copy only the built frontend from builder stage
COPY --from=frontend-builder /app/frontend/dist /app/frontend/dist

# Copy scripts to root
COPY ssl-setup.sh /
COPY run.sh /

# Fix permissions
RUN chmod a+x *.py && chmod a+x /run.sh /ssl-setup.sh

EXPOSE 8099 8443 8555 8080

CMD ["/run.sh"]
