from pydantic import BaseModel, EmailStr
from typing import Optional

class RegisterRequest(BaseModel):
    full_name: str
    email: EmailStr
    password: str
    role: Optional[str] = "citizen"

class LoginRequest(BaseModel):
    email: str
    password: str
    device_id: Optional[str] = None

class OTPVerifyRequest(BaseModel):
    email: EmailStr
    otp_code: str

class ApplicationRequest(BaseModel):
    applicant_name: str
    dob: str
    parent_name: str
    address: str
    phone: str

class DecisionRequest(BaseModel):
    remark: Optional[str] = None
