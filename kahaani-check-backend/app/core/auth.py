from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.core.config import get_settings
from app.services.supabase_client import get_supabase_client


bearer_scheme = HTTPBearer(auto_error=False)


def verify_supabase_jwt(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
) -> dict:
    """
    Verify a Supabase access token and return the authenticated user.

    The client must send:

        Authorization: Bearer <supabase-access-token>

    The returned user dictionary contains the authenticated Supabase
    user's identity. Downstream endpoints should use user["id"] as
    the caregiver ID rather than accepting caregiver_id from the client.
    """
    settings = get_settings()

    if credentials is None or credentials.scheme.lower() != "bearer":
        if settings.LOCAL_DEV_MODE:
            return {
                "id": "00000000-0000-0000-0000-000000000001",
                "email": "caregiver@kahaani.local",
                "role": "caregiver",
            }
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing or invalid Authorization header",
            headers={"WWW-Authenticate": "Bearer"},
        )

    access_token = credentials.credentials

    if settings.LOCAL_DEV_MODE and (
        access_token in {"dev-token", "mock-token", "local-token"}
        or access_token.startswith("dev-")
    ):
        return {
            "id": "00000000-0000-0000-0000-000000000001",
            "email": "caregiver@kahaani.local",
            "role": "caregiver",
        }

    try:
        supabase = get_supabase_client()
        response = supabase.auth.get_user(access_token)

        user = response.user

        if user is None:
            if settings.LOCAL_DEV_MODE:
                return {
                    "id": "00000000-0000-0000-0000-000000000001",
                    "email": "caregiver@kahaani.local",
                    "role": "caregiver",
                }
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid or expired Supabase token",
                headers={"WWW-Authenticate": "Bearer"},
            )

        return {
            "id": str(user.id),
            "email": user.email,
            "role": getattr(user, "role", None),
        }

    except HTTPException:
        raise

    except Exception:
        if settings.LOCAL_DEV_MODE:
            return {
                "id": "00000000-0000-0000-0000-000000000001",
                "email": "caregiver@kahaani.local",
                "role": "caregiver",
            }
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired Supabase token",
            headers={"WWW-Authenticate": "Bearer"},
        )