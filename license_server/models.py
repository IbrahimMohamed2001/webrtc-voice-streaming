from sqlalchemy import (
    Column,
    String,
    DateTime,
    Integer,
    Boolean,
    Text,
    Float,
    Index,
    ForeignKey,
)
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.dialects.postgresql import UUID, JSONB
from datetime import datetime
import uuid

Base = declarative_base()


class License(Base):
    __tablename__ = "licenses"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    user_email = Column(String(255), unique=True, nullable=False, index=True)
    purchase_code = Column(String(255), unique=True, nullable=False)

    hardware_id = Column(String(128), unique=True, nullable=True, index=True)
    hardware_components = Column(JSONB, nullable=True)

    token = Column(Text, unique=True, nullable=True)

    issued_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    expires_at = Column(DateTime, nullable=False)
    last_validated = Column(DateTime)

    status = Column(String(20), default="pending", nullable=False)
    activation_count = Column(Integer, default=0)

    warning_count = Column(Integer, default=0)
    suspension_reason = Column(Text)

    addon_version = Column(String(20))
    created_ip = Column(String(45))

    __table_args__ = (Index("idx_status_expires", "status", "expires_at"),)


class ValidationLog(Base):
    __tablename__ = "validation_logs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    license_id = Column(
        UUID(as_uuid=True), ForeignKey("licenses.id"), nullable=False, index=True
    )

    validated_at = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)

    ip_address = Column(String(45), nullable=False)
    hardware_id = Column(String(128), nullable=False)
    session_id = Column(String(64))

    cpu_usage = Column(Float)
    memory_usage = Column(Float)
    uptime_seconds = Column(Integer)
    active_streams = Column(Integer)
    addon_version = Column(String(20))

    country_code = Column(String(2))
    city = Column(String(100))
    latitude = Column(Float)
    longitude = Column(Float)

    validation_success = Column(Boolean, default=True)
    failure_reason = Column(String(255))

    __table_args__ = (Index("idx_license_time", "license_id", "validated_at"),)


class SecurityIncident(Base):
    __tablename__ = "security_incidents"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    license_id = Column(
        UUID(as_uuid=True), ForeignKey("licenses.id"), nullable=False, index=True
    )

    detected_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    incident_type = Column(String(50), nullable=False)
    severity = Column(String(20), nullable=False)

    details = Column(JSONB)
    anomaly_score = Column(Float)

    action_taken = Column(String(50))
    resolved = Column(Boolean, default=False)
    resolved_at = Column(DateTime)
    admin_notes = Column(Text)

    __table_args__ = (Index("idx_severity_resolved", "severity", "resolved"),)


class SessionState(Base):
    __tablename__ = "session_states"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    license_id = Column(
        UUID(as_uuid=True), ForeignKey("licenses.id"), nullable=False, index=True
    )

    session_id = Column(String(64), unique=True, nullable=False)
    hardware_id = Column(String(128), nullable=False)

    started_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    last_heartbeat = Column(
        DateTime, default=datetime.utcnow, nullable=False, index=True
    )

    ip_address = Column(String(45))
    active = Column(Boolean, default=True, index=True)

    __table_args__ = (Index("idx_license_active", "license_id", "active"),)
