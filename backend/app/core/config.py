from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import List, Any


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # App
    ENVIRONMENT: str = "development"
    SECRET_KEY: str = "changeme-in-production"

    # CORS
    # Can be a JSON list: ["http://localhost:3000"]
    # or a comma-separated string: http://localhost:3000,http://example.com
    CORS_ORIGINS: Any = ["http://localhost:3000"]

    @field_validator("CORS_ORIGINS", mode="before")
    @classmethod
    def assemble_cors_origins(cls, v: Any) -> List[str]:
        if isinstance(v, str):
            if v.startswith("["):
                import json
                try:
                    return json.loads(v)
                except Exception:
                    raise ValueError(f"Invalid JSON in CORS_ORIGINS: {v}")
            return [i.strip() for i in v.split(",")]
        if isinstance(v, list):
            return v
        raise ValueError(f"Excluded type for CORS_ORIGINS: {type(v)}")

    # Supabase
    SUPABASE_URL: str = ""
    SUPABASE_SERVICE_ROLE_KEY: str = ""
    SUPABASE_ANON_KEY: str = ""

    # Gemini
    GEMINI_API_KEY: str = ""

    # Neo4j
    NEO4J_URI: str = ""
    NEO4J_USER: str = "neo4j"
    NEO4J_PASSWORD: str = ""
    NEO4J_DATABASE: str = "neo4j"


settings = Settings()
