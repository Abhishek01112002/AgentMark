import os
import secrets

from fastapi import Header, HTTPException


INTERNAL_SERVICE_SECRET = os.getenv("INTERNAL_SERVICE_SECRET")
if not INTERNAL_SERVICE_SECRET:
    raise RuntimeError("INTERNAL_SERVICE_SECRET environment variable must be set")


async def verify_internal_secret(x_internal_secret: str = Header(...)):
    if not secrets.compare_digest(x_internal_secret, INTERNAL_SERVICE_SECRET):
        raise HTTPException(status_code=403, detail="Forbidden")
