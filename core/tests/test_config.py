from blurt_core.config import Settings


def test_settings_defaults() -> None:
    s = Settings()
    assert s.storage_backend == "local"
    assert s.router_confidence_threshold == 0.7
