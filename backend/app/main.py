from fastapi import FastAPI, Request, Depends, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, StreamingResponse
import traceback
import os
from dotenv import load_dotenv
from sqlalchemy.orm import Session

# Load environment variables
load_dotenv()
from app.database import Base, engine, get_db
from app import models, pdf_utils
from app.auth import get_current_user
from app.routes_auth import router as auth_router
from app.routes_service import router as service_router
from app.routes_admin import router as admin_router
from app.routes_clerk import router as clerk_router
from app.routes_manager import router as manager_router
from app.routes_pds import router as pds_router

Base.metadata.create_all(bind=engine)

app = FastAPI(title="Service 1 Secure E-Governance API") # Trigger reload

# Handle CORS
frontend_url = os.getenv("FRONTEND_URL", "http://localhost:3000")
origins = [
    frontend_url,
    "http://localhost:3000",
    "http://localhost:3001",
    "https://service-1-gules.vercel.app" # Direct addition just in case
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # For production testing, we can use "*" to ensure connectivity, or list them all
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Serve files statically
app.mount("/qr_codes", StaticFiles(directory="qr_codes"), name="qr_codes")
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    with open("error_log.txt", "a") as f:
        f.write(traceback.format_exc())
    return JSONResponse(
        status_code=500,
        content={"message": "Internal Server Error"},
    )

app.include_router(auth_router)
app.include_router(service_router)
app.include_router(admin_router)
app.include_router(clerk_router)
app.include_router(manager_router)
app.include_router(pds_router)

@app.get("/")
def root():
    return {"message": "Service 1 backend running successfully"}

@app.get("/profile")
def get_profile(current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.id == current_user.get("user_id")).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    return {
        "id": user.id,
        "full_name": user.full_name,
        "email": user.email,
        "role": user.role,
        "profile_photo": user.profile_photo,
        "citizen_qr_code": user.citizen_qr_code
    }

@app.get("/citizen/pds-bill/{transaction_id}")
def download_pds_bill(transaction_id: str, db: Session = Depends(get_db)):
    tx = db.query(models.PDSTransaction).filter(models.PDSTransaction.transaction_id == transaction_id).first()
    if not tx:
        raise HTTPException(status_code=404, detail="Transaction not found")
        
    items = db.query(models.PDSTransactionItem).filter(models.PDSTransactionItem.transaction_id == transaction_id).all()
    
    # Prepare data for PDF
    tx_data = {
        "transaction_id": tx.transaction_id,
        "citizen_code": tx.citizen_code,
        "beneficiary_name": tx.beneficiary_name,
        "ration_card_number": tx.ration_card_number,
        "shop_id": tx.shop_id,
        "issued_date": tx.issued_date,
        "verification_mode": tx.verification_mode,
        "items": [{"item_name": i.item_name, "quantity": i.quantity, "unit": i.unit} for i in items]
    }
    
    pdf_buffer = pdf_utils.generate_pds_bill_pdf(tx_data)
    return StreamingResponse(
        pdf_buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=PDS_Bill_{transaction_id}.pdf"}
    )