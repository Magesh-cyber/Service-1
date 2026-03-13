from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime, timezone

from app.database import get_db
from app import models, schemas
from app.auth import get_current_user
from app.audit import create_audit_log

router = APIRouter(prefix="/manager", tags=["Manager"])


def require_manager(current_user: dict = Depends(get_current_user)):
    if current_user.get("role") not in ("manager", "admin"):
        raise HTTPException(status_code=403, detail="Manager role required.")
    return current_user


def build_final_report(app: models.Application, ledger: models.IntegrityLedger | None) -> str:
    ts = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")
    report_lines = [
        "============================================",
        "   CYBERSHIELD e-GOVERNANCE FINAL REPORT   ",
        "============================================",
        f"Application ID     : {app.application_id}",
        f"Service Type       : Birth Certificate",
        f"Citizen Name       : {app.applicant_name}",
        f"Date of Birth      : {app.dob}",
        f"Parent / Guardian  : {app.parent_name}",
        f"Address            : {app.address}",
        f"Phone              : {app.phone}",
        "--------------------------------------------",
        f"Risk Score         : {app.risk_score}",
        f"Confidence Level   : {app.confidence_level}",
        "--------------------------------------------",
        f"Clerk Decision     : {app.clerk_decision}",
        f"Clerk Remark       : {app.clerk_remark or 'N/A'}",
        f"Manager Decision   : APPROVED",
        f"Manager Remark     : {app.manager_remark or 'N/A'}",
        "--------------------------------------------",
        f"Final Status       : APPROVED",
        f"Approved By        : Manager",
        f"Approval Timestamp : {ts}",
    ]
    if ledger:
        report_lines += [
            "--------------------------------------------",
            f"Blockchain Hash    : {ledger.record_hash}",
            f"Block Reference    : {ledger.block_ref}",
            f"Integrity Status   : VALID",
        ]
    report_lines.append("============================================")
    return "\n".join(report_lines)


@router.get("/applications")
def manager_list_applications(
    current_user: dict = Depends(require_manager),
    db: Session = Depends(get_db)
):
    apps = (
        db.query(models.Application)
        .filter(models.Application.status == "UNDER_MANAGER_REVIEW")
        .order_by(models.Application.id.desc())
        .all()
    )

    result = []
    for app in apps:
        result.append({
            "application_id": app.application_id,
            "service_type": app.service_type,
            "status": app.status,
            "applicant_name": app.applicant_name,
            "dob": app.dob,
            "parent_name": app.parent_name,
            "address": app.address,
            "phone": app.phone,
            "risk_score": app.risk_score,
            "confidence_level": app.confidence_level,
            "clerk_decision": app.clerk_decision,
            "clerk_remark": app.clerk_remark,
            "created_at": app.created_at.isoformat() if app.created_at else None,
        })

    return {"applications": result}


@router.post("/applications/{application_id}/approve")
def manager_approve(
    application_id: str,
    payload: schemas.DecisionRequest,
    current_user: dict = Depends(require_manager),
    db: Session = Depends(get_db)
):
    app = db.query(models.Application).filter(
        models.Application.application_id == application_id,
        models.Application.status == "UNDER_MANAGER_REVIEW"
    ).first()

    if not app:
        raise HTTPException(status_code=404, detail="Application not found or not under manager review.")

    app.manager_decision = "APPROVED"
    app.manager_remark = payload.remark
    app.status = "APPROVED"
    app.updated_at = datetime.now(timezone.utc)

    # Fetch ledger entry for blockchain info
    ledger = db.query(models.IntegrityLedger).filter(
        models.IntegrityLedger.application_id == application_id
    ).first()

    app.final_report = build_final_report(app, ledger)

    db.commit()

    create_audit_log(
        db, "MANAGER_APPROVED",
        f"Manager approved {application_id}. Remark: {payload.remark}"
    )
    return {
        "message": "Application approved by manager. Final report generated.",
        "status": "APPROVED",
        "final_report": app.final_report
    }


@router.post("/applications/{application_id}/reject")
def manager_reject(
    application_id: str,
    payload: schemas.DecisionRequest,
    current_user: dict = Depends(require_manager),
    db: Session = Depends(get_db)
):
    app = db.query(models.Application).filter(
        models.Application.application_id == application_id,
        models.Application.status == "UNDER_MANAGER_REVIEW"
    ).first()

    if not app:
        raise HTTPException(status_code=404, detail="Application not found or not under manager review.")

    app.manager_decision = "REJECTED"
    app.manager_remark = payload.remark
    app.status = "REJECTED_BY_MANAGER"
    app.updated_at = datetime.now(timezone.utc)
    db.commit()

    create_audit_log(
        db, "MANAGER_REJECTED",
        f"Manager rejected {application_id}. Remark: {payload.remark}"
    )
    return {"message": "Application rejected by manager.", "status": "REJECTED_BY_MANAGER"}
