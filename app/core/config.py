from pydantic import BaseModel


class Settings(BaseModel):
    app_name: str = "BioChain Vault Backend"
    app_version: str = "0.1.0"
    decoy_default_interval_sec: int = 300
    trust_home_radius_km: float = 2.0


settings = Settings()
