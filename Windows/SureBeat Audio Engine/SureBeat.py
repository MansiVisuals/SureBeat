#!/usr/bin/env python
# SureBeat by MansiVisuals
# Copyright (C) 2024-2025 Mansi Visuals

import os
import sys
import subprocess
import tempfile

def check_dependencies():
    """
    Ensure that madmom, numpy, scipy, and mido are installed.
    """
    try:
        import numpy
        import scipy
        import madmom
        import mido
    except ImportError as e:
        print(f"Missing dependency: {e.name}")
        print("Please ensure all dependencies are installed in the virtual environment.")
        sys.exit(1)
    print("All dependencies are present.")

def get_ffmpeg_path():
    """
    Return the path to the ffmpeg binary.
    Assumes ffmpeg.exe is in the same directory as this script.
    """
    if hasattr(sys, "_MEIPASS"):
        # If bundled by PyInstaller, _MEIPASS is the temp folder
        ffmpeg_bin = os.path.join(sys._MEIPASS, "ffmpeg.exe")
    else:
        script_dir = os.path.dirname(os.path.abspath(__file__))
        ffmpeg_bin = os.path.join(script_dir, "ffmpeg.exe")
    if not os.path.isfile(ffmpeg_bin):
        print(f"Error: ffmpeg.exe not found at '{ffmpeg_bin}'")
        sys.exit(1)
    return ffmpeg_bin

def convert_to_wav(input_path):
    """
    Converts the input audio file to a temporary mono 44.1kHz 16-bit WAV using ffmpeg.
    Returns the path to the temporary WAV file.
    """
    ffmpeg_bin = get_ffmpeg_path()
    temp_dir = tempfile.gettempdir()
    output_path = os.path.join(temp_dir, "converted_audio.wav")
    command = [
        ffmpeg_bin, "-y", "-i", input_path,
        "-ac", "1",               # Force mono
        "-acodec", "pcm_s16le",   # 16-bit PCM
        "-ar", "44100",           # Sample rate
        output_path
    ]
    print("Converting audio to WAV (mono, 44.1kHz) for processing...")
    try:
        result = subprocess.run(command, capture_output=True, text=True, check=True)
        print("WAV conversion successful. Temporary file at:", output_path)
    except subprocess.CalledProcessError as e:
        print(f"FFmpeg failed with error:\n{e.stderr}")
        sys.exit(1)
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
    from madmom.features.onsets import CNNOnsetProcessor, OnsetPeakPickingProcessor
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
    # Check if the needed Python packages are installed
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
