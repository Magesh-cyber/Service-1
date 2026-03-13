from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text, Float
from sqlalchemy.sql import func
from app.database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    full_name = Column(String, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=False)
    role = Column(String, default="citizen")
    device_id = Column(String, nullable=True)
    failed_attempts = Column(Integer, default=0)
    lock_until = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class OTPCode(Base):
    __tablename__ = "otp_codes"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, index=True, nullable=False)
    otp_code = Column(String, nullable=False)
    expires_at = Column(DateTime(timezone=True), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class LoginLog(Base):
    __tablename__ = "login_logs"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, index=True, nullable=False)
    device_id = Column(String, nullable=True)
    risk_score = Column(Integer, default=0)
    status = Column(String, default="LOW")
    action_taken = Column(String, default="ALLOW")
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class Application(Base):
    __tablename__ = "applications"

    id = Column(Integer, primary_key=True, index=True)
    application_id = Column(String, unique=True, index=True, nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"))
    service_type = Column(String, default="birth_certificate")
    applicant_name = Column(String, nullable=False)
    dob = Column(String, nullable=False)
    parent_name = Column(String, nullable=False)
    address = Column(Text, nullable=False)
    phone = Column(String, nullable=False)
    status = Column(String, default="UNDER_CLERK_REVIEW")

    # Risk & Confidence
    risk_score = Column(Integer, default=0, nullable=True)
    confidence_level = Column(String, default="HIGH", nullable=True)

    # Clerk review
    clerk_decision = Column(String, nullable=True)
    clerk_remark = Column(Text, nullable=True)

    # Manager review
    manager_decision = Column(String, nullable=True)
    manager_remark = Column(Text, nullable=True)

    # Final outcome
    final_report = Column(Text, nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now(), nullable=True)

class IntegrityLedger(Base):
    __tablename__ = "integrity_ledger"

    id = Column(Integer, primary_key=True, index=True)
    application_id = Column(String, index=True, nullable=False)
    record_hash = Column(String, nullable=False)
    block_ref = Column(String, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    event = Column(String, nullable=False)
    details = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())