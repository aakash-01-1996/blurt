from blurt_core.config import settings
from blurt_core.providers.storage import build_storage_provider

# Module-level singleton — built once at import time
storage = build_storage_provider(settings)
