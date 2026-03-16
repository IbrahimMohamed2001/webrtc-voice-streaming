from fastapi import FastAPI, HTTPException, Depends, BackgroundTasks, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker, Session
from pydantic import BaseModel, EmailStr, validator
from datetime import datetime, timedelta
import os
import logging
from typing import Optional
import httpx

from models import Base, License, ValidationLog, SecurityIncident, SessionState
from token_generator import TokenGenerator
from hw_fingerprint import generate_hardware_id, validate_hardware_components

DATABASE_URL = os.getenv(
    "DATABASE_URL", "postgresql://license_user:license_pass@db:5432/webrtc_licenses"
)
SECRET_KEY = os.getenv("SECRET_KEY", os.urandom(32).hex())
ALLOWED_ORIGINS = os.getenv("ALLOWED_ORIGINS", "*").split(",")

logging.basicConfig(
    level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)

engine = create_engine(DATABASE_URL, pool_pre_ping=True)
SessionLocal = sessionmaker(bind=engine)

Base.metadata.create_all(engine)

token_gen = TokenGenerator()

app = FastAPI(title="WebRTC License Server", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_methods=["POST", "GET", "OPTIONS"],
    allow_headers=["*"],
)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


class ActivationRequest(BaseModel):
    email: EmailStr
    purchase_code: str
    hardware_id: str
    hardware_components: dict

    @validator("hardware_id")
    def validate_hardware_id(cls, v):
        if len(v) != 64:
            raise ValueError("Invalid hardware ID format")
        return v


class AdminCreateLicenseRequest(BaseModel):
    email: EmailStr
    purchase_code: str
    duration_days: int = 365


class ValidationRequest(BaseModel):
    token: str
    hardware_id: str
    session_id: str
    telemetry: Optional[dict] = {}


class HeartbeatRequest(BaseModel):
    token: str
    session_id: str


async def get_ip_geolocation(ip: str):
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(f"https://ipapi.co/{ip}/json/", timeout=5)
            if response.status_code == 200:
                data = response.json()
                return {
                    "country_code": data.get("country_code"),
                    "city": data.get("city"),
                    "latitude": data.get("latitude"),
                    "longitude": data.get("longitude"),
                }
    except:
        pass
    return None


def detect_concurrent_sessions(db: Session, license_id: str, current_session_id: str):
    cutoff_time = datetime.utcnow() - timedelta(minutes=30)

    active_sessions = (
        db.query(SessionState)
        .filter(
            SessionState.license_id == license_id,
            SessionState.active == True,
            SessionState.last_heartbeat > cutoff_time,
            SessionState.session_id != current_session_id,
        )
        .all()
    )

    return len(active_sessions) > 0, active_sessions


def create_security_incident(
    db: Session, license_id: str, incident_type: str, severity: str, details: dict
):
    incident = SecurityIncident(
        license_id=license_id,
        incident_type=incident_type,
        severity=severity,
        details=details,
        action_taken="logged",
    )
    db.add(incident)
    db.commit()

    if severity == "critical":
        license = db.query(License).filter(License.id == license_id).first()
        license.status = "suspended"
        license.suspension_reason = f"Auto-suspended: {incident_type}"
        incident.action_taken = "suspended"
        db.commit()
        logger.warning(f"License {license_id} auto-suspended: {incident_type}")


@app.on_event("startup")
async def startup_event():
    logger.info("License server starting up...")
    Base.metadata.create_all(engine)


@app.post("/api/v1/admin/licenses", status_code=201)
async def admin_create_license(
    request: AdminCreateLicenseRequest, db: Session = Depends(get_db)
):
    """Admin-only: pre-create a pending license for a customer.
    The add-on will bind its hardware on first activation."""
    existing = (
        db.query(License)
        .filter(
            (License.user_email == request.email)
            | (License.purchase_code == request.purchase_code)
        )
        .first()
    )
    if existing:
        raise HTTPException(
            409,
            detail=f"A license already exists for that email or purchase code (status: {existing.status})",
        )

    license = License(
        user_email=request.email,
        purchase_code=request.purchase_code,
        # hardware fields left NULL until the device activates
        expires_at=datetime.utcnow() + timedelta(days=request.duration_days),
        status="pending",
        activation_count=0,
    )
    db.add(license)
    db.commit()
    db.refresh(license)

    logger.info(f"Admin pre-created license: {request.email} / {request.purchase_code}")

    return {
        "success": True,
        "message": "License created. Customer can now activate on their device.",
        "email": license.user_email,
        "purchase_code": license.purchase_code,
        "expires_at": license.expires_at.isoformat(),
        "status": license.status,
    }


@app.post("/api/v1/activate")
async def activate_license(
    request: ActivationRequest, req: Request, db: Session = Depends(get_db)
):
    """Device-side: bind hardware to a pre-approved pending license.
    Self-registration is NOT permitted — admin must create the record first."""

    # ── Check if this hardware is already bound somewhere ──
    existing_hw = (
        db.query(License).filter(License.hardware_id == request.hardware_id).first()
    )
    if existing_hw:
        raise HTTPException(
            409,
            detail=f"This hardware is already activated for {existing_hw.user_email}",
        )

    # ── Look up the admin-created pending record ──
    pending = (
        db.query(License)
        .filter(
            License.user_email == request.email,
            License.purchase_code == request.purchase_code,
            License.status == "pending",
        )
        .first()
    )

    if not pending:
        # Check if there's an active one (restart scenario)
        active = (
            db.query(License)
            .filter(
                License.user_email == request.email,
                License.purchase_code == request.purchase_code,
                License.status == "active",
            )
            .first()
        )
        if active:
            raise HTTPException(
                409,
                detail=f"This hardware is already activated for {active.user_email}",
            )
        # No record at all — reject self-registration
        raise HTTPException(
            403,
            detail="No pending license found for this email and purchase code. "
                   "Contact your administrator to have a license created first.",
        )

    # ── Bind hardware to the pending record ──
    token = token_gen.generate_license_token(
        user_email=request.email,
        hardware_id=request.hardware_id,
        purchase_code=request.purchase_code,
        duration_days=max(
            1, (pending.expires_at - datetime.utcnow()).days
        ),
    )

    pending.hardware_id = request.hardware_id
    pending.hardware_components = request.hardware_components
    pending.token = token
    pending.issued_at = datetime.utcnow()
    pending.status = "active"
    pending.activation_count = 1
    pending.created_ip = req.client.host

    db.commit()
    db.refresh(pending)

    logger.info(
        f"License activated: {request.email} | HW: {request.hardware_id[:16]}..."
    )

    return {
        "success": True,
        "token": token,
        "expires_at": pending.expires_at.isoformat(),
        "message": "License activated successfully",
    }


@app.post("/api/v1/validate")
async def validate_license(
    request: ValidationRequest,
    req: Request,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    valid, payload, error = token_gen.verify_token(request.token, request.hardware_id)

    if not valid:
        logger.warning(f"Token validation failed: {error} | IP: {req.client.host}")
        raise HTTPException(401, detail=f"Invalid license: {error}")

    license = db.query(License).filter(License.token == request.token).first()

    if not license:
        raise HTTPException(404, detail="License not found")

    if license.status == "suspended":
        raise HTTPException(
            403, detail=f"License suspended: {license.suspension_reason}"
        )

    if license.status == "revoked":
        raise HTTPException(403, detail="License has been revoked")

    if license.status == "expired" or license.expires_at < datetime.utcnow():
        license.status = "expired"
        db.commit()
        raise HTTPException(403, detail="License has expired")

    hw_valid, changed, match_pct = validate_hardware_components(
        license.hardware_components, request.telemetry.get("hardware_components", {})
    )

    if not hw_valid:
        create_security_incident(
            db,
            license.id,
            "hardware_mismatch",
            "critical",
            {
                "expected_hw": request.hardware_id,
                "actual_hw": license.hardware_id,
                "match_percentage": match_pct,
                "changed_components": changed,
            },
        )
        raise HTTPException(403, detail="Hardware mismatch detected")

    has_concurrent, concurrent_sessions = detect_concurrent_sessions(
        db, license.id, request.session_id
    )

    if has_concurrent:
        create_security_incident(
            db,
            license.id,
            "concurrent_sessions",
            "high",
            {
                "current_session": request.session_id,
                "concurrent_count": len(concurrent_sessions),
                "sessions": [s.session_id for s in concurrent_sessions],
            },
        )

        license.warning_count += 1
        db.commit()

        if license.warning_count >= 3:
            license.status = "suspended"
            license.suspension_reason = "Multiple concurrent sessions detected"
            db.commit()
            raise HTTPException(403, detail="License suspended due to unusual activity")

    session = (
        db.query(SessionState)
        .filter(SessionState.session_id == request.session_id)
        .first()
    )

    if not session:
        session = SessionState(
            license_id=license.id,
            session_id=request.session_id,
            hardware_id=request.hardware_id,
            ip_address=req.client.host,
            started_at=datetime.utcnow(),
            last_heartbeat=datetime.utcnow(),
            active=True,
        )
        db.add(session)
    else:
        session.last_heartbeat = datetime.utcnow()
        session.active = True

    validation_log = ValidationLog(
        license_id=license.id,
        validated_at=datetime.utcnow(),
        ip_address=req.client.host,
        hardware_id=request.hardware_id,
        session_id=request.session_id,
        cpu_usage=request.telemetry.get("cpu_usage"),
        memory_usage=request.telemetry.get("memory_usage"),
        uptime_seconds=request.telemetry.get("uptime_seconds"),
        active_streams=request.telemetry.get("active_streams"),
        addon_version=request.telemetry.get("addon_version", "1.0.0"),
        validation_success=True,
    )
    db.add(validation_log)

    license.last_validated = datetime.utcnow()

    db.commit()

    background_tasks.add_task(update_geolocation, validation_log.id, req.client.host)

    logger.info(
        f"Validation success: {license.user_email} | Session: {request.session_id}"
    )

    return {
        "valid": True,
        "expires_at": license.expires_at.isoformat(),
        "status": license.status,
        "warning_count": license.warning_count,
    }


@app.post("/api/v1/heartbeat")
async def heartbeat(request: HeartbeatRequest, db: Session = Depends(get_db)):
    session = (
        db.query(SessionState)
        .filter(SessionState.session_id == request.session_id)
        .first()
    )

    if session:
        session.last_heartbeat = datetime.utcnow()
        db.commit()
        return {"success": True}

    return {"success": False, "message": "Session not found"}


@app.get("/api/v1/status/{purchase_code}")
async def get_status(purchase_code: str, db: Session = Depends(get_db)):
    license = db.query(License).filter(License.purchase_code == purchase_code).first()

    if not license:
        raise HTTPException(404, detail="License not found")

    return {
        "email": license.user_email,
        "status": license.status,
        "issued_at": license.issued_at.isoformat(),
        "expires_at": license.expires_at.isoformat(),
        "last_validated": license.last_validated.isoformat()
        if license.last_validated
        else None,
        "warning_count": license.warning_count,
        "hardware_id_preview": license.hardware_id[:8]
        + "..."
        + license.hardware_id[-8:],
    }


@app.get("/api/v1/public_key")
async def get_public_key():
    return {"public_key": token_gen.get_public_key_pem()}


@app.get("/")
async def serve_dashboard():
    return FileResponse("index.html")


@app.get("/api/v1/admin/licenses")
async def get_admin_licenses(db: Session = Depends(get_db)):
    licenses = db.query(License).order_by(License.issued_at.desc()).all()
    return [{
        "user_email": l.user_email,
        "purchase_code": l.purchase_code,
        "hardware_id": l.hardware_id,
        "status": l.status,
        "warning_count": l.warning_count,
        "created_at": l.issued_at.isoformat()
    } for l in licenses]


@app.get("/api/v1/admin/sessions")
async def get_admin_sessions(db: Session = Depends(get_db)):
    cutoff_time = datetime.utcnow() - timedelta(minutes=30)
    sessions = (
        db.query(SessionState, License)
        .join(License, SessionState.license_id == License.id)
        .filter(SessionState.active == True, SessionState.last_heartbeat > cutoff_time)
        .order_by(SessionState.last_heartbeat.desc())
        .all()
    )
    return [{
        "session_id": s.SessionState.session_id,
        "user_email": s.License.user_email,
        "hardware_id": s.SessionState.hardware_id,
        "last_heartbeat": s.SessionState.last_heartbeat.isoformat(),
        "updated_at": s.SessionState.last_heartbeat.isoformat()
    } for s in sessions]


@app.get("/api/v1/admin/incidents")
async def get_admin_incidents(db: Session = Depends(get_db)):
    incidents = (
        db.query(SecurityIncident, License)
        .join(License, SecurityIncident.license_id == License.id)
        .order_by(SecurityIncident.detected_at.desc())
        .limit(100)
        .all()
    )
    return [{
        "incident_type": i.SecurityIncident.incident_type,
        "severity": i.SecurityIncident.severity,
        "action_taken": i.SecurityIncident.action_taken,
        "license_email": i.License.user_email,
        "hardware_id": i.License.hardware_id,
        "created_at": i.SecurityIncident.detected_at.isoformat(),
        "ip_address": i.SecurityIncident.details.get("ip_address", "—") if isinstance(i.SecurityIncident.details, dict) else "—"
    } for i in incidents]


@app.get("/api/v1/admin/logs")
async def get_admin_logs(db: Session = Depends(get_db)):
    logs = (
        db.query(ValidationLog, License)
        .join(License, ValidationLog.license_id == License.id)
        .order_by(ValidationLog.validated_at.desc())
        .limit(200)
        .all()
    )
    return [{
        "user_email": l.License.user_email,
        "session_id": l.ValidationLog.session_id,
        "is_valid": l.ValidationLog.validation_success,
        "failure_reason": l.ValidationLog.failure_reason,
        "ip_address": l.ValidationLog.ip_address,
        "country": l.ValidationLog.country_code,
        "created_at": l.ValidationLog.validated_at.isoformat()
    } for l in logs]


@app.get("/health")
async def health_check():
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        db_status = "healthy"
    except Exception as e:
        db_status = f"unhealthy: {str(e)}"

    return {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "database": db_status,
    }


async def update_geolocation(validation_log_id: str, ip_address: str):
    geo_data = await get_ip_geolocation(ip_address)
    if geo_data:
        db = SessionLocal()
        log = (
            db.query(ValidationLog)
            .filter(ValidationLog.id == validation_log_id)
            .first()
        )
        if log:
            log.country_code = geo_data.get("country_code")
            log.city = geo_data.get("city")
            log.latitude = geo_data.get("latitude")
            log.longitude = geo_data.get("longitude")
            db.commit()
        db.close()


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
