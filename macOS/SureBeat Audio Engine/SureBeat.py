#!/usr/bin/env python3
# SureBeat by MansiVisuals
# Copyright (C) 2024-2025 Mansi Visuals

import os
import sys
import subprocess

# 1) Point madmom to bundled model files when frozen via PyInstaller
if hasattr(sys, "_MEIPASS"):
    model_path = os.path.join(sys._MEIPASS, "madmom", "models")
    os.environ["MADMOM_MODELS_PATH"] = model_path

def check_dependencies():
    """
    Optional: ensure madmom, numpy, and scipy are available.
    When you freeze with PyInstaller, this also verifies they're included.
    Remove or comment out if you prefer no checks.
    """
    try:
        import numpy
        import scipy
        import madmom
    except ImportError as e:
        print(f"Missing dependency: {e.name}")
        sys.exit(1)
    print("All dependencies appear present.")

def get_ffmpeg_path():
    """
    Return the path to the ffmpeg binary.
    If running from a PyInstaller one-file bundle, ffmpeg is extracted to sys._MEIPASS.
    Otherwise, assume it's next to this script.
    """
    if hasattr(sys, "_MEIPASS"):
        return os.path.join(sys._MEIPASS, "ffmpeg")
    else:
        return os.path.join(os.path.dirname(__file__), "ffmpeg")

def convert_to_wav(input_path):
    """
    Converts the input audio file to a temporary mono 44.1kHz 16-bit WAV using ffmpeg.
    Returns the path to '/tmp/converted_audio.wav'.
    """
    ffmpeg_bin = get_ffmpeg_path()
    output_path = "/tmp/converted_audio.wav"
    command = [
        ffmpeg_bin, "-y", "-i", input_path,
        "-ac", "1",               # Force mono
        "-acodec", "pcm_s16le",   # 16-bit PCM
        "-ar", "44100",           # Sample rate
        output_path
    ]
    print("Converting audio to WAV (mono, 44.1kHz) for processing...")
    result = subprocess.run(command, capture_output=True, text=True)
    if result.returncode != 0:
        raise RuntimeError(f"FFmpeg failed with error:\n{result.stderr}")
    print("WAV conversion successful. Temporary file at:", output_path)
    return output_path

def detect_beats_and_tempo(audio_path):
    """
    Main logic:
      1. Convert to WAV (mono).
      2. Use madmom to detect beats & tempo.
      3. Print results.
      4. Clean up temp file.
    """
    wav_path = convert_to_wav(audio_path)

    print("Loading WAV file for processing:", wav_path)

    # Import madmom modules
    from madmom.audio.signal import Signal
    from madmom.features.onsets import OnsetPeakPickingProcessor, CNNOnsetProcessor
    from madmom.features.beats import RNNBeatProcessor, DBNBeatTrackingProcessor

    # Beat detection
    print("Detecting beats...")
    beat_processor = CNNOnsetProcessor()
    peak_picking = OnsetPeakPickingProcessor(
        fps=100, threshold=0.3, pre_avg=0.2, post_avg=0.2,
        pre_max=0.1, post_max=0.1
    )
    beat_activations = beat_processor(Signal(wav_path, sample_rate=44100))
    beats = peak_picking(beat_activations)

    # Tempo detection
    print("Detecting tempo...")
    tempo_activations = RNNBeatProcessor()(wav_path)
    dbn_processor = DBNBeatTrackingProcessor(min_bpm=60, max_bpm=180, fps=100)
    tempo = dbn_processor(tempo_activations)

    # Remove temporary WAV
    os.remove(wav_path)

    # Print results
    print("\n=== SureBeat Results ===")
    print("Detected Beats:")
    for beat_time in beats:
        print(f"  BEAT: {beat_time:.3f}")

    print("\nDetected Tempo (beat times):")
    for tempo_time in tempo:
        print(f"  TEMPO: {tempo_time:.3f}")

def main():
    # Optional: check if the needed Python packages are installed/included
    check_dependencies()

    if len(sys.argv) < 2:
        print("Usage: SureBeat <audio_file>")
        sys.exit(1)

    audio_path = sys.argv[1]
    if not os.path.isfile(audio_path):
        print(f"Error: File not found at '{audio_path}'")
        sys.exit(1)

    try:
        detect_beats_and_tempo(audio_path)
    except Exception as e:
        print(f"Error during processing: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()