from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

router = APIRouter()


class AuthRequest(BaseModel):
    email: str
    password: str


@router.post("/verify")
async def verify_token():
    """
    Stub: verify a Supabase JWT passed in the Authorization header.
    Full implementation will use a dependency that validates the token.
    """
    return {"message": "Token verification coming soon"}
