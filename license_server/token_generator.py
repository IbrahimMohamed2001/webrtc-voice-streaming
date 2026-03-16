import jwt
import hashlib
import secrets
from datetime import datetime, timedelta
from cryptography.hazmat.primitives.asymmetric import rsa
from cryptography.hazmat.primitives import serialization, hashes
from cryptography.hazmat.backends import default_backend
import base64
import json
import os


class TokenGenerator:
    def __init__(
        self,
        private_key_path="/keys/private_key.pem",
        public_key_path="/keys/public_key.pem",
    ):
        self.private_key_path = private_key_path
        self.public_key_path = public_key_path

        try:
            self.private_key = self._load_private_key()
            self.public_key = self._load_public_key()
        except FileNotFoundError:
            print("Keys not found. Generating new RSA key pair...")
            self._generate_keys()
            self.private_key = self._load_private_key()
            self.public_key = self._load_public_key()

    def _generate_keys(self):
        private_key = rsa.generate_private_key(
            public_exponent=65537, key_size=4096, backend=default_backend()
        )

        os.makedirs(os.path.dirname(self.private_key_path), exist_ok=True)

        with open(self.private_key_path, "wb") as f:
            f.write(
                private_key.private_bytes(
                    encoding=serialization.Encoding.PEM,
                    format=serialization.PrivateFormat.PKCS8,
                    encryption_algorithm=serialization.NoEncryption(),
                )
            )

        public_key = private_key.public_key()
        with open(self.public_key_path, "wb") as f:
            f.write(
                public_key.public_bytes(
                    encoding=serialization.Encoding.PEM,
                    format=serialization.PublicFormat.SubjectPublicKeyInfo,
                )
            )

        os.chmod(self.private_key_path, 0o600)
        os.chmod(self.public_key_path, 0o644)
        print(f"Keys generated: {self.private_key_path}, {self.public_key_path}")

    def _load_private_key(self):
        with open(self.private_key_path, "rb") as f:
            return serialization.load_pem_private_key(
                f.read(), password=None, backend=default_backend()
            )

    def _load_public_key(self):
        with open(self.public_key_path, "rb") as f:
            return serialization.load_pem_public_key(
                f.read(), backend=default_backend()
            )

    def generate_license_token(
        self, user_email, hardware_id, purchase_code, duration_days=365
    ):
        now = datetime.utcnow()
        token_id = secrets.token_urlsafe(32)

        payload = {
            "sub": user_email,
            "hwid": hardware_id,
            "purchase_code": purchase_code,
            "iat": now,
            "exp": now + timedelta(days=duration_days),
            "jti": token_id,
            "addon": "webrtc_voice_streaming_pro",
            "version": "1.0.0",
        }

        token = jwt.encode(payload, self.private_key, algorithm="RS256")
        checksum = self._generate_hardware_checksum(token, hardware_id)
        full_token = f"{token}.{checksum}"
        encoded_token = base64.b64encode(full_token.encode()).decode()

        return encoded_token

    def _generate_hardware_checksum(self, token, hardware_id):
        combined = f"{token}|{hardware_id}|webrtc_salt_2024"
        return hashlib.sha256(combined.encode()).hexdigest()[:24]

    def verify_token(self, encoded_token, hardware_id):
        try:
            full_token = base64.b64decode(encoded_token).decode()

            parts = full_token.rsplit(".", 1)
            if len(parts) != 2:
                return False, None, "Invalid token format"

            token, checksum = parts

            expected_checksum = self._generate_hardware_checksum(token, hardware_id)
            if checksum != expected_checksum:
                return False, None, "Hardware binding mismatch"

            payload = jwt.decode(token, self.public_key, algorithms=["RS256"])

            if payload.get("hwid") != hardware_id:
                return False, None, "Hardware ID mismatch"

            return True, payload, None

        except jwt.ExpiredSignatureError:
            return False, None, "Token expired"
        except jwt.InvalidTokenError as e:
            return False, None, f"Invalid token: {str(e)}"
        except Exception as e:
            return False, None, f"Verification error: {str(e)}"

    def get_public_key_pem(self):
        with open(self.public_key_path, "rb") as f:
            return f.read().decode()
