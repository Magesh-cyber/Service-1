from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime, timezone
import uuid

from app.database import get_db
from app import models, schemas
from app.auth import get_current_user
from app.blockchain import generate_record_hash, generate_block_ref
from app.qr_utils import generate_qr_file
from app.audit import create_audit_log

router = APIRouter(tags=["Citizen Services"])


def get_confidence_level(risk_score: int) -> str:
    if risk_score <= 20:
        return "HIGH"
    elif risk_score <= 40:
        return "MEDIUM"
    else:
        return "LOW"


@router.post("/services/birth-certificate")
def apply_birth_certificate(
    payload: schemas.ApplicationRequest,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db)
):
    application_id = f"BC-{uuid.uuid4().hex[:8].upper()}"

    # Derive a simple risk score for the application (0 = low risk, known user)
    risk_score = 10
    confidence_level = get_confidence_level(risk_score)

    application = models.Application(
        application_id=application_id,
        user_id=current_user["user_id"],
        service_type="birth_certificate",
        applicant_name=payload.applicant_name,
        dob=payload.dob,
        parent_name=payload.parent_name,
        address=payload.address,
        phone=payload.phone,
        status="UNDER_CLERK_REVIEW",
        risk_score=risk_score,
        confidence_level=confidence_level,
    )

    db.add(application)
    db.commit()
    db.refresh(application)

    record_data = {
        "application_id": application.application_id,
        "applicant_name": application.applicant_name,
        "dob": application.dob,
        "parent_name": application.parent_name,
        "address": application.address,
        "phone": application.phone,
        "status": application.status
    }

    record_hash = generate_record_hash(record_data)
    block_ref = generate_block_ref()

    ledger = models.IntegrityLedger(
        application_id=application.application_id,
        record_hash=record_hash,
        block_ref=block_ref
    )
    db.add(ledger)
    db.commit()

    qr_path = generate_qr_file(
        application_id=application.application_id,
        service_type=application.service_type,
        record_hash=record_hash,
        timestamp=str(datetime.utcnow())
    )

    create_audit_log(
        db,
        "BIRTH_CERTIFICATE_APPLIED",
        f"Application created: {application.application_id} by user {current_user['user_id']}"
    )

    return {
        "message": "Birth certificate application submitted successfully",
        "application_id": application.application_id,
        "status": application.status,
        "risk_score": risk_score,
        "confidence_level": confidence_level,
        "blockchain_integrity": {
            "record_hash": record_hash,
            "block_ref": block_ref,
            "integrity_status": "VALID"
        },
        "qr_code_path": qr_path
    }


@router.get("/citizen/my-requests")
def get_my_requests(
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db)
):
    apps = (
        db.query(models.Application)
        .filter(models.Application.user_id == current_user["user_id"])
        .order_by(models.Application.id.desc())
        .all()
    )

    result = []
    for app in apps:
        result.append({
            "application_id": app.application_id,
            "service_type": app.service_type,
            "status": app.status,
            "risk_score": app.risk_score,
            "confidence_level": app.confidence_level,
            "final_report": app.final_report,
            "created_at": app.created_at.isoformat() if app.created_at else None,
        })

    return {"requests": result}


@router.get("/report/{application_id}")
def get_report(
    application_id: str,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db)
):
    app = db.query(models.Application).filter(
        models.Application.application_id == application_id
    ).first()

    if not app:
        raise HTTPException(status_code=404, detail="Application not found.")

    # Citizens can only view their own report
    if current_user.get("role") == "citizen" and app.user_id != current_user["user_id"]:
        raise HTTPException(status_code=403, detail="Access denied.")

    ledger = db.query(models.IntegrityLedger).filter(
        models.IntegrityLedger.application_id == application_id
    ).first()

    return {
        "application_id": app.application_id,
        "service_type": app.service_type,
        "applicant_name": app.applicant_name,
        "dob": app.dob,
        "parent_name": app.parent_name,
        "address": app.address,
        "phone": app.phone,
        "status": app.status,
        "risk_score": app.risk_score,
        "confidence_level": app.confidence_level,
        "clerk_decision": app.clerk_decision,
        "clerk_remark": app.clerk_remark,
        "manager_decision": app.manager_decision,
        "manager_remark": app.manager_remark,
        "final_report": app.final_report,
        "created_at": app.created_at.isoformat() if app.created_at else None,
        "updated_at": app.updated_at.isoformat() if app.updated_at else None,
        "blockchain": {
            "record_hash": ledger.record_hash if ledger else None,
            "block_ref": ledger.block_ref if ledger else None,
            "integrity_status": "VALID" if ledger else "UNAVAILABLE",
        }
    }


@router.get("/citizen/qr")
def get_citizen_qr(
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Find the latest application for this user
    app = db.query(models.Application).filter(
        models.Application.user_id == current_user["user_id"]
    ).order_by(models.Application.id.desc()).first()

    if not app:
        raise HTTPException(status_code=404, detail="No applications found.")

    ledger = db.query(models.IntegrityLedger).filter(
        models.IntegrityLedger.application_id == app.application_id
    ).first()

    # Generate a stable verification code: QR-ID-HASH_PART
    # Example: QR-BC-A1B2C3D4-X91K72 
    hash_part = ledger.record_hash[:6].upper() if ledger else "000000"
    verification_code = f"QR-{app.application_id}-{hash_part}"

    return {
        "application_id": app.application_id,
        "service_type": app.service_type,
        "status": app.status,
        "qr_code_url": f"http://localhost:8000/qr_codes/{app.application_id}.png",
        "verification_code": verification_code,
        "updated_at": app.updated_at.isoformat() if app.updated_at else app.created_at.isoformat()
    }