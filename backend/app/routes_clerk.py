from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime, timezone

from app.database import get_db
from app import models, schemas
from app.auth import get_current_user
from app.audit import create_audit_log

router = APIRouter(prefix="/clerk", tags=["Clerk"])


def require_clerk(current_user: dict = Depends(get_current_user)):
    if current_user.get("role") not in ("clerk", "admin"):
        raise HTTPException(status_code=403, detail="Clerk role required.")
    return current_user


def mask_name(name: str) -> str:
    """Mask all but the first character of each word."""
    parts = name.split()
    masked = []
    for part in parts:
        if len(part) <= 1:
            masked.append(part)
        else:
            masked.append(part[0] + "*" * (len(part) - 1))
    return " ".join(masked)


def mask_phone(phone: str) -> str:
    """Show only last 4 digits."""
    cleaned = phone.replace(" ", "")
    if len(cleaned) <= 4:
        return cleaned
    return "*" * (len(cleaned) - 4) + cleaned[-4:]


def mask_address(address: str) -> str:
    """Show city (first comma-delimited fragment) then mask rest."""
    parts = address.split(",")
    if len(parts) > 1:
        return parts[0].strip() + "***"
    # no comma — show first word then mask
    words = address.split()
    return (words[0] if words else "") + "***"


@router.get("/applications")
def clerk_list_applications(
    current_user: dict = Depends(require_clerk),
    db: Session = Depends(get_db)
):
    apps = (
        db.query(models.Application)
        .filter(models.Application.status == "UNDER_CLERK_REVIEW")
        .order_by(models.Application.id.desc())
        .all()
    )

    result = []
    for app in apps:
        result.append({
            "application_id": app.application_id,
            "service_type": app.service_type,
            "status": app.status,
            "applicant_name": mask_name(app.applicant_name),
            "dob": app.dob[:4] + "-**-**",  # show year only
            "parent_name": mask_name(app.parent_name),
            "address": mask_address(app.address),
            "phone": mask_phone(app.phone),
            "risk_score": app.risk_score,
            "confidence_level": app.confidence_level,
            "created_at": app.created_at.isoformat() if app.created_at else None,
        })

    return {"applications": result}


@router.post("/applications/{application_id}/approve")
def clerk_approve(
    application_id: str,
    payload: schemas.DecisionRequest,
    current_user: dict = Depends(require_clerk),
    db: Session = Depends(get_db)
):
    app = db.query(models.Application).filter(
        models.Application.application_id == application_id,
        models.Application.status == "UNDER_CLERK_REVIEW"
    ).first()

    if not app:
        raise HTTPException(status_code=404, detail="Application not found or not in clerk review.")

    app.status = "UNDER_MANAGER_REVIEW"
    app.clerk_decision = "APPROVED"
    app.clerk_remark = payload.remark
    app.updated_at = datetime.now(timezone.utc)
    db.commit()

    create_audit_log(
        db, "CLERK_APPROVED",
        f"Clerk approved {application_id}. Remark: {payload.remark}"
    )
    return {"message": "Application approved by clerk. Forwarded to manager.", "status": "UNDER_MANAGER_REVIEW"}


@router.post("/applications/{application_id}/reject")
def clerk_reject(
    application_id: str,
    payload: schemas.DecisionRequest,
    current_user: dict = Depends(require_clerk),
    db: Session = Depends(get_db)
):
    app = db.query(models.Application).filter(
        models.Application.application_id == application_id,
        models.Application.status == "UNDER_CLERK_REVIEW"
    ).first()

    if not app:
        raise HTTPException(status_code=404, detail="Application not found or not in clerk review.")

    app.status = "REJECTED_BY_CLERK"
    app.clerk_decision = "REJECTED"
    app.clerk_remark = payload.remark
    app.updated_at = datetime.now(timezone.utc)
    db.commit()

    create_audit_log(
        db, "CLERK_REJECTED",
        f"Clerk rejected {application_id}. Remark: {payload.remark}"
    )
    return {"message": "Application rejected by clerk.", "status": "REJECTED_BY_CLERK"}
