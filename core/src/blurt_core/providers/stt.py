import logging
from typing import Protocol, runtime_checkable

logger = logging.getLogger(__name__)


class Segment:
    __slots__ = ("start", "end", "text")

    def __init__(self, start: float, end: float, text: str) -> None:
        self.start = start
        self.end = end
        self.text = text

    def to_dict(self) -> dict[str, float | str]:
        return {"start": self.start, "end": self.end, "text": self.text}


@runtime_checkable
class SttProvider(Protocol):
    model_name: str

    def transcribe(self, audio_bytes: bytes) -> tuple[str, list[Segment]]: ...


class MlxWhisperStt:
    """On-device transcription via mlx-whisper (Apple Silicon only)."""

    def __init__(self, model: str = "mlx-community/whisper-small") -> None:
        self.model_name = model

    def transcribe(self, audio_bytes: bytes) -> tuple[str, list[Segment]]:
        import tempfile

        import mlx_whisper

        # mlx_whisper requires a file path
        with tempfile.NamedTemporaryFile(suffix=".flac", delete=False) as tmp:
            tmp.write(audio_bytes)
            tmp_path = tmp.name

        result = mlx_whisper.transcribe(tmp_path, path_or_hf_repo=self.model_name)

        import os

        os.unlink(tmp_path)

        text: str = result.get("text", "").strip()
        segments = [
            Segment(
                start=float(s["start"]),
                end=float(s["end"]),
                text=s["text"].strip(),
            )
            for s in result.get("segments", [])
        ]
        return text, segments


class GroqStt:
    """Cloud transcription via Groq Whisper API."""

    def __init__(
        self,
        api_key: str,
        model: str = "whisper-large-v3-turbo",
    ) -> None:
        self.model_name = model
        self._api_key = api_key

    def transcribe(self, audio_bytes: bytes) -> tuple[str, list[Segment]]:
        import io

        from groq import Groq

        client = Groq(api_key=self._api_key)

        transcription = client.audio.transcriptions.create(
            file=("audio.flac", io.BytesIO(audio_bytes), "audio/flac"),
            model=self.model_name,
            response_format="verbose_json",
        )

        text: str = (transcription.text or "").strip()
        raw_segments = getattr(transcription, "segments", None) or []
        segments = [
            Segment(
                start=float(s["start"]),
                end=float(s["end"]),
                text=(s["text"] or "").strip(),
            )
            for s in raw_segments
        ]
        return text, segments


def build_stt_provider(settings: object) -> MlxWhisperStt | GroqStt:
    from blurt_core.config import Settings

    assert isinstance(settings, Settings)
    if settings.stt_provider == "groq":
        if not settings.groq_api_key:
            raise RuntimeError("GROQ_API_KEY is required when STT_PROVIDER=groq")
        return GroqStt(
            api_key=settings.groq_api_key, model=settings.stt_model or "whisper-large-v3-turbo"
        )
    return MlxWhisperStt(model=settings.stt_model)
