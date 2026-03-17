from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime, timezone
import uuid
import json

from app.database import get_db
from app import models, schemas
from app.auth import get_current_user
from app.blockchain import generate_record_hash, generate_block_ref
from fastapi.responses import StreamingResponse
from app.pdf_utils import generate_application_pdf
from app.qr_utils import generate_qr_file, generate_simple_qr
from app.audit import create_audit_log

router = APIRouter(tags=["Citizen Services"])


def get_confidence_level(risk_score: int) -> str:
    if risk_score <= 20:
        return "HIGH"
    elif risk_score <= 40:
        return "MEDIUM"
    else:
        return "LOW"


def handle_application(
    service_type: str,
    prefix: str,
    payload: schemas.ApplicationRequest,
    current_user: dict,
    db: Session
):
    application_id = f"{prefix}-{uuid.uuid4().hex[:8].upper()}"
    risk_score = 10
    confidence_level = get_confidence_level(risk_score)

    # Determine parent name from new fields if available
    parent_name = payload.parent_name if hasattr(payload, 'parent_name') else f"{getattr(payload, 'father_name', 'N/A')} / {getattr(payload, 'mother_name', 'N/A')}"

    application = models.Application(
        application_id=application_id,
        user_id=current_user["user_id"],
        service_type=service_type,
        applicant_name=payload.applicant_name,
        dob=payload.dob,
        parent_name=parent_name,
        address=payload.address,
        phone=payload.phone,
        status="UNDER_CLERK_REVIEW",
        risk_score=risk_score,
        confidence_level=confidence_level,
        extra_data=json.dumps(payload.dict())
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
        f"{service_type.upper()}_APPLIED",
        f"Application created: {application.application_id} by user {current_user['user_id']}"
    )

    return {
        "message": f"{service_type.replace('_', ' ').title()} application submitted successfully",
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


@router.post("/services/birth-certificate")
def apply_birth_certificate(
    payload: schemas.ApplicationRequest,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db)
):
    return handle_application("birth_certificate", "BC", payload, current_user, db)








@router.post("/services/passport-application")







@router.post("/services/passport-application")
def apply_passport(
    payload: schemas.PassportApplicationRequest,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db)
):
    service_type = "passport_application"
    prefix = "PA"
    application_id = f"{prefix}-{uuid.uuid4().hex[:8].upper()}"
    risk_score = 15
    confidence_level = get_confidence_level(risk_score)

    application = models.Application(
        application_id=application_id,
        user_id=current_user["user_id"],
        service_type=service_type,
        applicant_name=payload.full_name_aadhaar,
        dob=payload.dob,
        parent_name=payload.father_name, # Primary parent
        address=payload.permanent_address,
        phone=payload.mobile_number,
        status="UNDER_CLERK_REVIEW",
        risk_score=risk_score,
        confidence_level=confidence_level,
        extra_data=json.dumps(payload.dict())
    )

    db.add(application)
    db.commit()
    db.refresh(application)

    record_data = {
        "application_id": application.application_id,
        "applicant_name": application.applicant_name,
        "dob": application.dob,
        "service_type": application.service_type,
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
        f"{service_type.upper()}_APPLIED",
        f"Application created: {application.application_id} by user {current_user['user_id']}"
    )

    return {
        "message": "Passport application submitted successfully",
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

@router.post("/services/driving-license")
def apply_driving_license(
    payload: schemas.DrivingLicenseRequest,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db)
):
    service_type = "driving_license"
    prefix = "DL"
    application_id = f"{prefix}-{uuid.uuid4().hex[:8].upper()}"
    risk_score = 10 
    confidence_level = get_confidence_level(risk_score)

    application = models.Application(
        application_id=application_id,
        user_id=current_user["user_id"],
        service_type=service_type,
        applicant_name=payload.full_name,
        dob=payload.dob,
        parent_name="N/A", 
        address=payload.residential_address,
        phone=payload.mobile_number,
        status="UNDER_CLERK_REVIEW",
        risk_score=risk_score,
        confidence_level=confidence_level,
        extra_data=json.dumps(payload.dict())
    )

    db.add(application)
    db.commit()
    db.refresh(application)

    record_data = {
        "application_id": application.application_id,
        "applicant_name": application.applicant_name,
        "dob": application.dob,
        "service_type": application.service_type,
        "status": application.status
    }

    record_hash = generate_record_hash(record_data)
    block_ref = generate_block_ref()

    ledger = models.IntegrityLedger(
        application_id=application_id,
        record_hash=record_hash,
        block_ref=block_ref
    )
    db.add(ledger)
    db.commit()

    generate_qr_file(
        application_id=application_id,
        service_type=service_type,
        record_hash=record_hash,
        timestamp=str(datetime.utcnow())
    )

    create_audit_log(
        db,
        f"{service_type.upper()}_APPLIED",
        f"Application created: {application_id} by user {current_user['user_id']}"
    )

    return {
        "message": "Driving license application submitted successfully",
        "application_id": application_id,
        "status": application.status,
        "blockchain_integrity": {
            "record_hash": record_hash,
            "block_ref": block_ref,
            "integrity_status": "VALID"
        }
    }

@router.post("/services/voter-id")
def apply_voter_id(
    payload: schemas.VoterIDRequest,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db)
):
    service_type = "voter_id"
    prefix = "VI"
    application_id = f"{prefix}-{uuid.uuid4().hex[:8].upper()}"
    risk_score = 5 # Low risk for voter ID
    confidence_level = get_confidence_level(risk_score)

    application = models.Application(
        application_id=application_id,
        user_id=current_user["user_id"],
        service_type=service_type,
        applicant_name=payload.full_name,
        dob=payload.dob,
        parent_name=payload.guardian_name,
        address=payload.residential_address,
        phone=payload.mobile_number,
        status="UNDER_CLERK_REVIEW",
        risk_score=risk_score,
        confidence_level=confidence_level,
        extra_data=json.dumps(payload.dict())
    )

    db.add(application)
    db.commit()
    db.refresh(application)

    record_data = {
        "application_id": application.application_id,
        "applicant_name": application.applicant_name,
        "dob": application.dob,
        "service_type": application.service_type,
        "status": application.status
    }

    record_hash = generate_record_hash(record_data)
    block_ref = generate_block_ref()

    ledger = models.IntegrityLedger(
        application_id=application_id,
        record_hash=record_hash,
        block_ref=block_ref
    )
    db.add(ledger)
    db.commit()

    generate_qr_file(
        application_id=application_id,
        service_type=service_type,
        record_hash=record_hash,
        timestamp=str(datetime.utcnow())
    )

    create_audit_log(
        db,
        f"{service_type.upper()}_APPLIED",
        f"Application created: {application_id} by user {current_user['user_id']}"
    )

    return {
        "message": "Voter ID application submitted successfully",
        "application_id": application_id,
        "status": application.status,
        "blockchain_integrity": {
            "record_hash": record_hash,
            "block_ref": block_ref,
            "integrity_status": "VALID"
        }
    }

@router.post("/services/marriage-certificate")
def apply_marriage_certificate(
    payload: schemas.MarriageCertificateRequest,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db)
):
    service_type = "marriage_certificate"
    prefix = "MR"
    application_id = f"{prefix}-{uuid.uuid4().hex[:8].upper()}"
    risk_score = 10
    confidence_level = get_confidence_level(risk_score)

    application = models.Application(
        application_id=application_id,
        user_id=current_user["user_id"],
        service_type=service_type,
        applicant_name=f"{payload.groom_name} & {payload.bride_name}",
        dob=payload.marriage_date,
        parent_name="N/A",
        address=payload.groom_address,
        phone=payload.groom_aadhaar,
        status="UNDER_CLERK_REVIEW",
        risk_score=risk_score,
        confidence_level=confidence_level,
        extra_data=json.dumps(payload.dict())
    )

    db.add(application)
    db.commit()
    db.refresh(application)

    record_data = {
        "application_id": application.application_id,
        "applicant_name": application.applicant_name,
        "service_type": application.service_type,
        "status": application.status
    }

    record_hash = generate_record_hash(record_data)
    block_ref = generate_block_ref()

    ledger = models.IntegrityLedger(application_id=application_id, record_hash=record_hash, block_ref=block_ref)
    db.add(ledger)
    db.commit()

    generate_qr_file(application_id=application_id, service_type=service_type, record_hash=record_hash, timestamp=str(datetime.utcnow()))
    create_audit_log(db, f"{service_type.upper()}_APPLIED", f"Application created: {application_id} by user {current_user['user_id']}")

    return {"message": "Marriage certificate application submitted successfully", "application_id": application_id, "status": application.status}

@router.post("/services/income-certificate")
def apply_income_certificate(
    payload: schemas.IncomeCertificateRequest,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db)
):
    service_type = "income_certificate"
    prefix = "IC"
    application_id = f"{prefix}-{uuid.uuid4().hex[:8].upper()}"
    risk_score = 10
    confidence_level = get_confidence_level(risk_score)

    application = models.Application(
        application_id=application_id,
        user_id=current_user["user_id"],
        service_type=service_type,
        applicant_name=payload.full_name,
        dob=payload.dob,
        parent_name=f"{payload.father_name} / {payload.mother_name}",
        address=payload.residential_address,
        phone=payload.mobile_number,
        status="UNDER_CLERK_REVIEW",
        risk_score=risk_score,
        confidence_level=confidence_level,
        extra_data=json.dumps(payload.dict())
    )

    db.add(application)
    db.commit()
    db.refresh(application)

    record_data = {"application_id": application_id, "applicant_name": payload.full_name, "service_type": service_type, "status": "PENDING"}
    record_hash = generate_record_hash(record_data)
    block_ref = generate_block_ref()

    ledger = models.IntegrityLedger(application_id=application_id, record_hash=record_hash, block_ref=block_ref)
    db.add(ledger)
    db.commit()

    generate_qr_file(application_id=application_id, service_type=service_type, record_hash=record_hash, timestamp=str(datetime.utcnow()))
    create_audit_log(db, f"{service_type.upper()}_APPLIED", f"Application created: {application_id}")

    return {"message": "Income certificate application submitted successfully", "application_id": application_id}

@router.post("/services/community-certificate")
def apply_community_certificate(
    payload: schemas.CommunityCertificateRequest,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db)
):
    service_type = "community_certificate"
    prefix = "CC"
    application_id = f"{prefix}-{uuid.uuid4().hex[:8].upper()}"
    risk_score = 10
    confidence_level = get_confidence_level(risk_score)

    application = models.Application(
        application_id=application_id,
        user_id=current_user["user_id"],
        service_type=service_type,
        applicant_name=payload.full_name,
        dob=payload.dob,
        parent_name=f"{payload.father_name} / {payload.mother_name}",
        address=payload.residential_address,
        phone=payload.mobile_number,
        status="UNDER_CLERK_REVIEW",
        risk_score=risk_score,
        confidence_level=confidence_level,
        extra_data=json.dumps(payload.dict())
    )

    db.add(application)
    db.commit()
    db.refresh(application)

    record_data = {"application_id": application_id, "applicant_name": payload.full_name, "service_type": service_type, "status": "PENDING"}
    record_hash = generate_record_hash(record_data)
    block_ref = generate_block_ref()

    ledger = models.IntegrityLedger(application_id=application_id, record_hash=record_hash, block_ref=block_ref)
    db.add(ledger)
    db.commit()

    generate_qr_file(application_id=application_id, service_type=service_type, record_hash=record_hash, timestamp=str(datetime.utcnow()))
    create_audit_log(db, f"{service_type.upper()}_APPLIED", f"Application created: {application_id}")

    return {"message": "Community certificate application submitted successfully", "application_id": application_id}

@router.post("/services/building-permit")
def apply_building_permit(
    payload: schemas.BuildingPermitRequest,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db)
):
    service_type = "building_permit"
    prefix = "BP"
    application_id = f"{prefix}-{uuid.uuid4().hex[:8].upper()}"
    risk_score = 20
    confidence_level = get_confidence_level(risk_score)

    application = models.Application(
        application_id=application_id,
        user_id=current_user["user_id"],
        service_type=service_type,
        applicant_name=payload.applicant_name,
        dob=payload.construction_start_date,
        parent_name=payload.land_owner_name,
        address=payload.property_address,
        phone=payload.mobile_number,
        status="UNDER_CLERK_REVIEW",
        risk_score=risk_score,
        confidence_level=confidence_level,
        extra_data=json.dumps(payload.dict())
    )

    db.add(application)
    db.commit()
    db.refresh(application)

    record_data = {"application_id": application_id, "applicant_name": payload.applicant_name, "service_type": service_type, "status": "PENDING"}
    record_hash = generate_record_hash(record_data)
    block_ref = generate_block_ref()

    ledger = models.IntegrityLedger(application_id=application_id, record_hash=record_hash, block_ref=block_ref)
    db.add(ledger)
    db.commit()

    generate_qr_file(application_id=application_id, service_type=service_type, record_hash=record_hash, timestamp=str(datetime.utcnow()))
    create_audit_log(db, f"{service_type.upper()}_APPLIED", f"Building permit application submitted: {application_id}")

    return {"message": "Building permit application submitted successfully", "application_id": application_id}


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
        "extra_data": app.extra_data,
        "blockchain": {
            "record_hash": ledger.record_hash if ledger else None,
            "block_ref": ledger.block_ref if ledger else None,
            "integrity_status": "VALID" if ledger else "UNAVAILABLE",
        }
    }


@router.get("/services/application/{application_id}/pdf")
def download_application_pdf(
    application_id: str,
    final: bool = False,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db)
):
    report_data = get_report(application_id, current_user, db)
    
    if final and report_data["status"] != "APPROVED":
        raise HTTPException(status_code=400, detail="Certificate only available for approved applications.")

    pdf_buffer = generate_application_pdf(report_data, is_final=final)
    
    filename = f"certificate_{application_id}.pdf" if final else f"submission_{application_id}.pdf"
    
    return StreamingResponse(
        pdf_buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )


@router.get("/citizen/identity-qr")
def get_citizen_identity_qr(
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Get the actual user object from DB to update it
    user_obj = db.query(models.User).filter(models.User.id == current_user["user_id"]).first()
    
    if not user_obj:
        raise HTTPException(status_code=404, detail="User not found.")

    if not user_obj.citizen_qr_code:
        # Generate a new unique code: CS-KIOSK-[RANDOM_HEX]
        random_hex = uuid.uuid4().hex[:6].upper()
        user_obj.citizen_qr_code = f"CS-KIOSK-{random_hex}"
        db.commit()
    
    # Generate the QR image file if it doesn't exist
    code = user_obj.citizen_qr_code
    filename = code # QR file named after the code
    generate_simple_qr(code, filename)

    return {
        "verification_code": code,
        "qr_code_url": f"{os.getenv('BACKEND_URL', 'http://localhost:8000')}/qr_codes/{filename}.png",
        "message": "Citizen identity QR retrieved successfully"
    }

@router.get("/citizen/qr")
def get_citizen_qr(
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Legacy endpoint repurposed to return Identity QR
    return get_citizen_identity_qr(current_user, db)
    verification_code = f"QR-{app.application_id}-{hash_part}"

    return {
        "application_id": app.application_id,
        "service_type": app.service_type,
        "status": app.status,
        "qr_code_url": f"{os.getenv('BACKEND_URL', 'http://localhost:8000')}/qr_codes/{app.application_id}.png",
        "verification_code": verification_code,
        "updated_at": app.updated_at.isoformat() if app.updated_at else app.created_at.isoformat()
    }