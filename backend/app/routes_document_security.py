from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app import schemas, models
from app.auth import get_current_user
from app.services.document_security_service import DocumentSecurityService

router = APIRouter(prefix="/document", tags=["Document Security"])

@router.post("/verify-access")
def verify_document_access(
    payload: schemas.DocumentVerifyRequest,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    user_id = current_user.get("user_id")
    application_id = payload.application_id
    submitted_code = payload.verification_code

    # Verify if the application exists and belongs to the user
    application = db.query(models.Application).filter(
        models.Application.application_id == application_id,
        models.Application.user_id == user_id
    ).first()

    if not application:
        raise HTTPException(status_code=404, detail="Application not found.")

    if application.status != "APPROVED":
        raise HTTPException(status_code=400, detail="Document access is only available for approved applications.")

    is_granted = DocumentSecurityService.verify_access(db, user_id, application_id, submitted_code)

    if not is_granted:
        # Check if they reached max attempts
        attempt_record = db.query(models.DocumentAccessAttempt).filter(
            models.DocumentAccessAttempt.application_id == application_id,
            models.DocumentAccessAttempt.user_id == user_id
        ).first()
        
        if attempt_record and attempt_record.attempts >= 3:
            raise HTTPException(status_code=403, detail="Maximum verification attempts reached. Access denied.")
        
        raise HTTPException(status_code=401, detail="Invalid verification code.")

    return {"access_granted": True, "message": "Access granted."}
