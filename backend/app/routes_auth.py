from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime, timedelta, timezone

from app.database import get_db
from app import models, schemas
from app.audit import create_audit_log
from app.risk_engine import calculate_risk
import re
import shutil
import os
from fastapi import File, UploadFile
from app.auth import hash_password, verify_password, generate_otp, create_access_token, get_current_user

router = APIRouter(tags=["Authentication"])

@router.post("/register")
def register_user(payload: schemas.RegisterRequest, db: Session = Depends(get_db)):
    existing_user = db.query(models.User).filter(models.User.email == payload.email).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")

    user = models.User(
        full_name=payload.full_name,
        email=payload.email,
        password_hash=hash_password(payload.password),
        role=payload.role
    )

    db.add(user)
    db.commit()
    db.refresh(user)

    create_audit_log(db, "USER_REGISTERED", f"User registered: {payload.email}")

    return {"message": "User registered successfully"}

@router.post("/login")
def login_user(payload: schemas.LoginRequest, db: Session = Depends(get_db)):
    print(f"--- DEBUG LOGIN ATTEMPT: {payload.email} ---")
    # Feature 3 - SQL Injection Detection
    sql_patterns = [r"'", r"--", r";", r"OR\s+1=1", r"SELECT\s", r"DROP\s", r"UNION\s"]
    combined_input = f"{payload.email} {payload.password}"
    if any(re.search(pattern, combined_input, re.IGNORECASE) for pattern in sql_patterns):
        create_audit_log(db, "SQL_INJECTION_ATTEMPT", f"SQLi pattern detected in login: {payload.email}")
        
        # Log to LoginLog for Admin view (Feature 5)
        login_log = models.LoginLog(
            email=payload.email,
            device_id=payload.device_id,
            risk_score=100,
            status="CRITICAL",
            action_taken="SQLI_BLOCKED"
        )
        db.add(login_log)
        db.commit()
        
        raise HTTPException(status_code=403, detail="Malicious input detected. Access blocked.")

    user = db.query(models.User).filter(models.User.email == payload.email).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Feature 2 - Account Lock Check
    if user.lock_until:
        lock_until = user.lock_until
        if lock_until.tzinfo is None:
            lock_until = lock_until.replace(tzinfo=timezone.utc)
        
        if lock_until > datetime.now(timezone.utc):
            raise HTTPException(status_code=403, detail="Security protocol triggered: This account is temporarily blocked for 10 minutes due to multiple failed login attempts. Please try again later.")
        else:
            # If the lock period has expired, reset the counter
            user.failed_attempts = 0
            user.lock_until = None
            db.commit()

    # Feature 1 & 4 & 6 - Risk Check (using device_id)
    device_match = user.device_id == payload.device_id if user.device_id else True
    risk_score, risk_status, action_taken = calculate_risk(payload.device_id or "unknown", device_match)

    if action_taken == "LOGIN_BLOCKED":
        create_audit_log(db, "SUSPICIOUS_LOGIN_BLOCKED", f"Suspicious device blocked for {payload.email}: {payload.device_id}")
        
        login_log = models.LoginLog(
            email=payload.email,
            device_id=payload.device_id,
            risk_score=risk_score,
            status=risk_status,
            action_taken=action_taken
        )
        db.add(login_log)
        db.commit()
        
        return {
            "message": "Suspicious login detected",
            "risk_score": risk_score,
            "risk_status": risk_status,
            "action_taken": action_taken
        }

    # Verify Password
    if not verify_password(payload.password, user.password_hash):
        # Feature 2 - Increment Failed Attempts
        user.failed_attempts += 1
        if user.failed_attempts >= 5:
            user.lock_until = datetime.now(timezone.utc) + timedelta(minutes=10)
            create_audit_log(db, "MULTIPLE_FAILED_ATTEMPTS", f"Account locked for {payload.email}")
            db.commit()
            raise HTTPException(status_code=403, detail="Too many failed login attempts. Access blocked for 10 minutes.")
        
        db.commit()
        remaining = 5 - user.failed_attempts
        raise HTTPException(status_code=401, detail=f"Invalid password. {remaining} attempts remaining before account block.")

    # Reset failed attempts on success
    user.failed_attempts = 0
    
    login_log = models.LoginLog(
        email=payload.email,
        device_id=payload.device_id,
        risk_score=risk_score,
        status=risk_status,
        action_taken=action_taken
    )
    db.add(login_log)

    if not user.device_id:
        user.device_id = payload.device_id

    # Feature: Bypass OTP for PDS Admin
    print(f"--- CHECKING ROLE: {user.role} ---")
    if user.role == "pds_admin":
        print("--- PDS ADMIN BYPASS TRIGGERED ---")
        token = create_access_token({
            "sub": user.email,
            "role": user.role,
            "user_id": user.id
        })
        db.commit()
        create_audit_log(db, "LOGIN_SUCCESS", f"PDS Admin logged in directly: {payload.email}")
        return {
            "message": "PDS Admin Login Successful",
            "access_token": token,
            "token_type": "bearer",
            "role": user.role,
            "full_name": user.full_name,
            "risk_score": risk_score,
            "risk_status": risk_status,
            "action_taken": action_taken
        }

    otp_code = generate_otp()
    otp = models.OTPCode(
        email=payload.email,
        otp_code=otp_code,
        expires_at=datetime.now(timezone.utc) + timedelta(minutes=5)
    )
    db.add(otp)

    db.commit()

    create_audit_log(
        db,
        "LOGIN_OTP_GENERATED",
        f"OTP generated for {payload.email}, risk={risk_score}, status={risk_status}"
    )

    return {
        "message": "OTP generated. Verify OTP to continue.",
        "demo_otp": otp_code,
        "risk_score": risk_score,
        "risk_status": risk_status,
        "action_taken": action_taken
    }

@router.post("/verify-otp")
def verify_otp(payload: schemas.OTPVerifyRequest, db: Session = Depends(get_db)):
    otp = (
        db.query(models.OTPCode)
        .filter(models.OTPCode.email == payload.email, models.OTPCode.otp_code == payload.otp_code)
        .order_by(models.OTPCode.id.desc())
        .first()
    )

    if not otp:
        raise HTTPException(status_code=400, detail="Invalid OTP")

    expires_at = otp.expires_at
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)

    if expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="OTP expired")

    user = db.query(models.User).filter(models.User.email == payload.email).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    token = create_access_token({
        "sub": user.email,
        "role": user.role,
        "user_id": user.id
    })

    create_audit_log(db, "LOGIN_SUCCESS", f"OTP verified successfully for {payload.email}")

    return {
        "access_token": token,
        "token_type": "bearer",
        "role": user.role,
        "full_name": user.full_name
    }

@router.post("/resend-otp")
def resend_otp(payload: schemas.PasswordResetRequest, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == payload.email).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    otp_code = generate_otp()
    otp = models.OTPCode(
        email=payload.email,
        otp_code=otp_code,
        expires_at=datetime.now(timezone.utc) + timedelta(minutes=5)
    )
    db.add(otp)
    db.commit()

    create_audit_log(db, "OTP_RESENT", f"New OTP generated for {payload.email}")

    return {
        "message": "New OTP generated successfully",
        "demo_otp": otp_code
    }

@router.post("/forgot-password")
def forgot_password(payload: schemas.PasswordResetRequest, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == payload.email).first()
    if not user:
        raise HTTPException(status_code=404, detail="Email address not found in our records.")

    otp_code = generate_otp()
    otp = models.OTPCode(
        email=payload.email,
        otp_code=otp_code,
        expires_at=datetime.now(timezone.utc) + timedelta(minutes=10)
    )
    db.add(otp)
    db.commit()

    create_audit_log(db, "PASSWORD_RESET_REQUESTED", f"OTP generated for password reset: {payload.email}")

    # In a real app, this would be emailed. For demo, we return it.
    return {
        "message": "OTP generated for password reset.",
        "demo_otp": otp_code
    }

@router.post("/reset-password")
def reset_password(payload: schemas.PasswordUpdateRequest, db: Session = Depends(get_db)):
    otp = (
        db.query(models.OTPCode)
        .filter(models.OTPCode.email == payload.email, models.OTPCode.otp_code == payload.otp_code)
        .order_by(models.OTPCode.id.desc())
        .first()
    )

    if not otp:
        raise HTTPException(status_code=400, detail="Invalid OTP")

    expires_at = otp.expires_at
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)

    if expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="OTP expired")

    user = db.query(models.User).filter(models.User.email == payload.email).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    user.password_hash = hash_password(payload.new_password)
    user.failed_attempts = 0 # Also reset locks just in case
    user.lock_until = None
    
    # Delete the used OTP
    db.delete(otp)
    db.commit()

    create_audit_log(db, "PASSWORD_RESET_SUCCESS", f"Password updated successfully for {payload.email}")

    return {"message": "Password updated successfully. You can now login with your new password."}

@router.get("/profile")
def get_profile(db: Session = Depends(get_db), current_user: dict = Depends(get_current_user)):
    user = db.query(models.User).filter(models.User.email == current_user["sub"]).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    return {
        "full_name": user.full_name,
        "email": user.email,
        "profile_photo": f"{os.getenv('BACKEND_URL', 'http://localhost:8000')}/{user.profile_photo}" if user.profile_photo else None,
        "role": user.role,
        "created_at": user.created_at
    }

@router.post("/upload-profile-photo")
async def upload_profile_photo(
    file: UploadFile = File(...), 
    db: Session = Depends(get_db), 
    current_user: dict = Depends(get_current_user)
):
    user = db.query(models.User).filter(models.User.email == current_user["sub"]).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    file_extension = file.filename.split(".")[-1]
    file_name = f"user_{user.id}_{int(datetime.now().timestamp())}.{file_extension}"
    file_path = f"uploads/profile_photos/{file_name}"

    os.makedirs(os.path.dirname(file_path), exist_ok=True)

    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    user.profile_photo = file_path
    db.commit()

    return {"message": "Profile photo uploaded successfully", "photo_url": f"{os.getenv('BACKEND_URL', 'http://localhost:8000')}/{file_path}"}
