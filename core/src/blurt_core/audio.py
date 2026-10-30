import subprocess
import tempfile
from pathlib import Path


class AudioError(Exception):
    pass


def probe_duration(data: bytes) -> float:
    """Return duration in seconds using ffprobe. Raises AudioError if unreadable."""
    with tempfile.NamedTemporaryFile(suffix=".audio") as f:
        f.write(data)
        f.flush()
        result = subprocess.run(
            [
                "ffprobe",
                "-v",
                "error",
                "-show_entries",
                "format=duration",
                "-of",
                "default=noprint_wrappers=1:nokey=1",
                f.name,
            ],
            capture_output=True,
            text=True,
        )
    if result.returncode != 0:
        raise AudioError(f"ffprobe failed: {result.stderr.strip()}")
    try:
        return float(result.stdout.strip())
    except ValueError as e:
        raise AudioError(f"could not parse duration: {result.stdout!r}") from e


def normalize(data: bytes) -> bytes:
    """Convert audio to 16 kHz mono FLAC. Raises AudioError on failure."""
    with (
        tempfile.NamedTemporaryFile(suffix=".input") as src,
        tempfile.NamedTemporaryFile(suffix=".flac", delete=False) as dst,
    ):
        src.write(data)
        src.flush()
        dst_path = Path(dst.name)

    try:
        result = subprocess.run(
            [
                "ffmpeg",
                "-y",
                "-i",
                src.name,
                "-ar",
                "16000",
                "-ac",
                "1",
                str(dst_path),
            ],
            capture_output=True,
            text=True,
        )
        if result.returncode != 0:
            raise AudioError(f"ffmpeg failed: {result.stderr.strip()}")
        return dst_path.read_bytes()
    finally:
        dst_path.unlink(missing_ok=True)
