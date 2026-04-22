from flask import Flask, request, jsonify
from flask_cors import CORS
import os, uuid, subprocess
from predict import load_model_once, predict_genre

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}})

BASE_DIR      = os.path.dirname(os.path.abspath(__file__))
UPLOAD_FOLDER = os.path.join(BASE_DIR, "uploads")
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

NATIVE_FORMATS   = {"mp3", "wav", "flac", "ogg", "aiff", "au"}

ALLOWED_FORMATS  = NATIVE_FORMATS | {"webm", "m4a", "aac", "opus"}


def allowed_file(filename: str) -> bool:
    return "." in filename and filename.rsplit(".", 1)[1].lower() in ALLOWED_FORMATS


def convert_to_wav(src_path: str) -> str:

    dst_path = src_path.rsplit(".", 1)[0] + "_converted.wav"
    result   = subprocess.run(
        [
            "ffmpeg", "-y",
            "-i", src_path,
            "-ar", "22050", 
            "-ac", "1",     
            "-f",  "wav",
            dst_path
        ],
        capture_output=True,
        timeout=60
    )
    if result.returncode != 0:
        err = result.stderr.decode("utf-8", errors="replace")[-500:]
        raise RuntimeError(f"ffmpeg conversion failed: {err}")
    return dst_path


# ── Warm-up ───────────────────────────────────────────────────────────────────
@app.route("/health", methods=["GET"])
def health():
    try:
        load_model_once()
        return jsonify({"status": "ok", "model": "loaded"}), 200
    except Exception as e:
        return jsonify({"status": "error", "detail": str(e)}), 500

@app.route("/predict", methods=["POST"])
def predict():
    if "audio" not in request.files:
        return jsonify({"error": "No file uploaded. Send multipart form-data with key 'audio'."}), 400

    file = request.files["audio"]

    if not file.filename:
        return jsonify({"error": "Empty filename."}), 400

    if not allowed_file(file.filename):
        return jsonify({
            "error": f"Unsupported file type. Accepted: {', '.join(sorted(ALLOWED_FORMATS))}"
        }), 415

    ext           = file.filename.rsplit(".", 1)[1].lower()
    upload_path   = os.path.join(UPLOAD_FOLDER, f"{uuid.uuid4()}.{ext}")
    converted_path = None
    file.save(upload_path)

    try:
        if ext not in NATIVE_FORMATS:
            print(f"[Genrefy] Converting .{ext} → .wav via ffmpeg …")
            converted_path = convert_to_wav(upload_path)
            predict_path   = converted_path
        else:
            predict_path   = upload_path

        result = predict_genre(predict_path)

    except RuntimeError as e:
        return jsonify({"error": str(e)}), 422
    except Exception as e:
        print(f"[Genrefy] Prediction error: {e}")
        return jsonify({"error": f"Prediction failed: {str(e)}"}), 500
    finally:
        for p in [upload_path, converted_path]:
            if p and os.path.exists(p):
                os.remove(p)

    if "error" in result:
        return jsonify(result), 422

    return jsonify(result), 200

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True, use_reloader=False)