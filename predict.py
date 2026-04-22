# import numpy as np
# import librosa
# import librosa.util
# import tensorflow as tf
# import os

# BASE_DIR = os.path.dirname(os.path.abspath(__file__))
# MODEL_PATH = os.path.join(BASE_DIR, "/Users/negikshitiz/Documents/Projects/genrefy123/files/DL/best_model.keras")

# SAMPLE_RATE = 22050
# DURATION = 30
# SAMPLES_PER_TRACK = SAMPLE_RATE * DURATION
# N_MELS = 128  
# FIXED_TIME_STEPS = 130
# NUM_SEGMENTS = 10

# GENRES = [
#     "blues", "classical", "country", "disco", "hiphop",
#     "jazz", "metal", "pop", "reggae", "rock"
# ]

# # Load model ONCE
# model = tf.keras.models.load_model(MODEL_PATH)

# def preprocess_audio(file_path):
#     try:
#         signal, sr = librosa.load(file_path, sr=SAMPLE_RATE, mono=True)
#     except Exception as e:
#         print(f"[ERROR] Failed to load audio file {file_path}: {type(e).__name__}: {str(e)}")
#         return None

#     # Ensure signal is not empty
#     if len(signal) == 0:
#         print(f"[ERROR] Audio signal is empty after loading")
#         return None

#     signal = librosa.util.fix_length(signal, size=SAMPLES_PER_TRACK)

#     samples_per_segment = int(SAMPLES_PER_TRACK / NUM_SEGMENTS)
#     spectrograms = []

#     for s in range(NUM_SEGMENTS):
#         start = samples_per_segment * s
#         end = start + samples_per_segment

#         segment = signal[start:end]

#         if len(segment) != samples_per_segment:
#             continue

#         mel = librosa.feature.melspectrogram(y=segment, sr=sr, n_mels=N_MELS)
#         mel_db = librosa.power_to_db(mel)

#         mel_db = librosa.util.fix_length(mel_db, size=FIXED_TIME_STEPS, axis=1)
#         mel_db = (mel_db - np.mean(mel_db)) / (np.std(mel_db) + 1e-6)

#         spectrograms.append(mel_db)

#     return np.array(spectrograms)

# def predict_genre(file_path):
#     spectrograms = preprocess_audio(file_path)

#     if spectrograms is None or len(spectrograms) == 0:
#         return {"error": "Audio processing failed: Could not load or process audio file. Try using MP3 or WAV format."}

#     spectrograms = spectrograms[..., np.newaxis]

#     predictions = model.predict(spectrograms, verbose=0)
#     avg_pred = np.mean(predictions, axis=0)

#     top3_idx = np.argsort(avg_pred)[-3:][::-1]

#     result = []
#     for idx in top3_idx:
#         result.append({
#             "genre": GENRES[idx],
#             "confidence": float(avg_pred[idx])
#         })

#     return {"predictions": result}

# # =========================
# # RUN (for testing)
# # =========================
# if __name__ == "__main__":
#     file_path = input("Enter path to audio file: ").strip()

#     if not os.path.exists(file_path):
#         print("File does not exist.")
#     else:
#         output = predict_genre(file_path)

#         if "error" in output:
#             print(output["error"])
#         else:
#             print("\n🎧 Top Genres:")
#             for i, item in enumerate(output["predictions"]):
#                 print(f"{i+1}. {item['genre']} ({item['confidence']*100:.2f}%)")


# """
# predict.py — Audio preprocessing and genre prediction
# -------------------------------------------------------
# MODEL_PATH is resolved relative to this file.
# Place best_model.keras in the same folder as predict.py.
# Model is loaded lazily on first call, not at import time.
# """


import os
import threading
import numpy as np
import librosa
import librosa.util
import tensorflow as tf

MODEL_PATH        = os.path.join(os.path.dirname(os.path.abspath(__file__)), "best_model.keras")
SAMPLE_RATE       = 22050
DURATION          = 30
SAMPLES_PER_TRACK = SAMPLE_RATE * DURATION
N_MELS            = 128
FIXED_TIME_STEPS  = 130
NUM_SEGMENTS      = 10

GENRES = [
    "blues", "classical", "country", "disco", "hiphop",
    "jazz", "metal", "pop", "reggae", "rock"
]

_model      = None
_model_lock = threading.Lock()

def load_model_once():
    global _model
    if _model is not None:
        return _model
    with _model_lock:
        if _model is None:
            if not os.path.exists(MODEL_PATH):
                raise FileNotFoundError(
                    f"Model not found: {MODEL_PATH}\n"
                    f"Place best_model.keras next to predict.py."
                )
            print(f"[Genrefy] Loading model from {MODEL_PATH} …")
            _model = tf.keras.models.load_model(MODEL_PATH)
            print("[Genrefy] Model loaded.")
    return _model

# ── Audio preprocessing ───────────────────────────────────────────────────────
def preprocess_audio(file_path: str):
    try:
        signal, sr = librosa.load(file_path, sr=SAMPLE_RATE, mono=True)
    except Exception as e:
        print(f"[Genrefy] Cannot load audio '{file_path}': {e}")
        return None

    if len(signal) == 0:
        print("[Genrefy] Audio signal is empty after loading.")
        return None

    signal = librosa.util.fix_length(signal, size=SAMPLES_PER_TRACK)
    samples_per_segment = SAMPLES_PER_TRACK // NUM_SEGMENTS
    spectrograms = []

    for s in range(NUM_SEGMENTS):
        start   = s * samples_per_segment
        segment = signal[start : start + samples_per_segment]

        if len(segment) != samples_per_segment:
            continue

        mel    = librosa.feature.melspectrogram(y=segment, sr=sr, n_mels=N_MELS)
        mel_db = librosa.power_to_db(mel)
        mel_db = librosa.util.fix_length(mel_db, size=FIXED_TIME_STEPS, axis=1)
        mel_db = (mel_db - np.mean(mel_db)) / (np.std(mel_db) + 1e-6)
        spectrograms.append(mel_db)

    return np.array(spectrograms) if spectrograms else None

def predict_genre(file_path: str) -> dict:
    model        = load_model_once()
    spectrograms = preprocess_audio(file_path)

    if spectrograms is None or len(spectrograms) == 0:
        return {"error": "Audio processing failed — file may be silent, corrupt, or too short."}

    X = spectrograms[..., np.newaxis]

    try:
        predictions = model.predict(X, verbose=0)
    except Exception as e:
        return {"error": f"Model inference failed: {str(e)}"}

    avg_pred = np.mean(predictions, axis=0)
    top3_idx = np.argsort(avg_pred)[-3:][::-1]

    return {
        "predictions": [
            {"genre": GENRES[idx], "confidence": float(avg_pred[idx])}
            for idx in top3_idx
        ]
    }

if __name__ == "__main__":
    path = input("Enter path to audio file: ").strip()
    if not os.path.exists(path):
        print("File does not exist.")
    else:
        out = predict_genre(path)
        if "error" in out:
            print(f"Error: {out['error']}")
        else:
            print("\n🎧 Top Genres:")
            for i, item in enumerate(out["predictions"]):
                print(f"  {i+1}. {item['genre']:10s}  {item['confidence']*100:5.1f}%")