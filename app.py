from flask import Flask, request, jsonify
from flask_cors import CORS
import os, uuid, subprocess, base64, time
import requests as http_requests
from predict import load_model_once, predict_genre

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}})

BASE_DIR      = os.path.dirname(os.path.abspath(__file__))
UPLOAD_FOLDER = os.path.join(BASE_DIR, "uploads")
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

NATIVE_FORMATS  = {"mp3", "wav", "flac", "ogg", "aiff", "au"}
ALLOWED_FORMATS = NATIVE_FORMATS | {"webm", "m4a", "aac", "opus"}

GENRE_SEARCH = {
    "hiphop":    "hip hop",
    "metal":     "metal",
    "disco":     "disco",
    "blues":     "blues",
    "classical": "classical",
    "reggae":    "reggae",
    "rock":      "rock",
    "pop":       "pop",
    "jazz":      "jazz",
    "country":   "country"
}

_token_cache = {"token": None, "expires_at": 0}

def get_spotify_token():
    """
    Fetch or return a cached Client Credentials access token.
    Uses raw HTTP - no spotipy, no redirect URI required.
    Returns None if credentials are missing or auth fails.
    """
    client_id     = os.environ.get("SPOTIPY_CLIENT_ID", "").strip()
    client_secret = os.environ.get("SPOTIPY_CLIENT_SECRET", "").strip()

    if not client_id or not client_secret:
        print("[Genrefy] WARNING: SPOTIPY_CLIENT_ID / SPOTIPY_CLIENT_SECRET not set.")
        return None

    if _token_cache["token"] and time.time() < _token_cache["expires_at"] - 30:
        return _token_cache["token"]

    try:
        creds    = base64.b64encode(f"{client_id}:{client_secret}".encode()).decode()
        response = http_requests.post(
            "https://accounts.spotify.com/api/token",
            headers={
                "Authorization": f"Basic {creds}",
                "Content-Type":  "application/x-www-form-urlencoded",
            },
            data={"grant_type": "client_credentials"},
            timeout=10,
        )
        response.raise_for_status()
        data = response.json()
        _token_cache["token"]      = data["access_token"]
        _token_cache["expires_at"] = time.time() + data.get("expires_in", 3600)
        print("[Genrefy] Spotify token obtained successfully.")
        return _token_cache["token"]
    except Exception as e:
        print(f"[Genrefy] Spotify auth failed: {e}")
        return None


def get_recommendations(genres):
    """Search-based recommendations with randomised offset for variety."""
    import random
    token = get_spotify_token()
    if not token:
        return []

    headers  = {"Authorization": f"Bearer {token}"}
    songs    = []
    seen_ids = set()

    GENRE_KEYWORDS = {
        "hiphop":    ["hip hop", "rap", "trap", "hip-hop hits", "rap music"],
        "metal":     ["metal", "heavy metal", "thrash metal", "metal hits"],
        "disco":     ["disco", "funk disco", "dance disco", "groovy disco"],
        "blues":     ["blues", "electric blues", "blues guitar", "blues music"],
        "classical": ["classical music", "orchestra", "piano classical", "symphony"],
        "reggae":    ["reggae", "reggae hits", "roots reggae", "jamaican reggae"],
        "rock":      ["rock", "classic rock", "rock hits", "alternative rock"],
        "pop":       ["pop", "pop hits", "pop music", "popular songs"],
        "jazz":      ["jazz", "jazz music", "smooth jazz", "jazz hits"],
        "country":   ["country", "country music", "country hits", "americana"],
    }

    for genre in genres:
        if len(songs) >= 10:
            break

        keywords = GENRE_KEYWORDS.get(genre, [GENRE_SEARCH.get(genre, genre)])
        search_term = random.choice(keywords)
        offset      = random.randint(0, 50)

        queries = [f"genre:{search_term}", search_term]
        tracks  = []
        for query in queries:
            try:
                resp = http_requests.get(
                    "https://api.spotify.com/v1/search",
                    headers=headers,
                    params={
                        "q":      query,
                        "type":   "track",
                        "limit":  10,
                        "offset": offset,
                        "market": "IN",
                    },
                    timeout=10,
                )
                resp.raise_for_status()
                tracks = resp.json().get("tracks", {}).get("items", [])
                if not tracks and offset > 0:
                    resp2 = http_requests.get(
                        "https://api.spotify.com/v1/search",
                        headers=headers,
                        params={"q": query, "type": "track", "limit": 10, "offset": 0, "market": "IN"},
                        timeout=10,
                    )
                    resp2.raise_for_status()
                    tracks = resp2.json().get("tracks", {}).get("items", [])
                if tracks:
                    break
            except Exception as e:
                print(f"[Genrefy] Search failed for '{query}': {e}")
                tracks = []

        random.shuffle(tracks)

        for track in tracks:
            if track["id"] in seen_ids:
                continue
            seen_ids.add(track["id"])
            images = track["album"]["images"]
            songs.append({
                "name":    track["name"],
                "artist":  track["artists"][0]["name"],
                "image":   images[0]["url"] if images else "",
                "preview": track.get("preview_url"),
                "url":     track["external_urls"]["spotify"],
            })

    return songs[:10]


def allowed_file(filename):
    return "." in filename and filename.rsplit(".", 1)[1].lower() in ALLOWED_FORMATS


def convert_to_wav(src_path):
    dst_path = src_path.rsplit(".", 1)[0] + "_converted.wav"
    result   = subprocess.run(
        ["ffmpeg", "-y", "-i", src_path, "-ar", "22050", "-ac", "1", "-f", "wav", dst_path],
        capture_output=True, timeout=60,
    )
    if result.returncode != 0:
        err = result.stderr.decode("utf-8", errors="replace")[-500:]
        raise RuntimeError(f"ffmpeg conversion failed: {err}")
    return dst_path


@app.route("/health", methods=["GET"])
def health():
    try:
        load_model_once()
        spotify_ok = get_spotify_token() is not None
        return jsonify({"status": "ok", "model": "loaded", "spotify": spotify_ok}), 200
    except Exception as e:
        return jsonify({"status": "error", "detail": str(e)}), 500


@app.route("/predict", methods=["POST"])
def predict():
    if "audio" not in request.files:
        return jsonify({"error": "No file uploaded"}), 400

    file = request.files["audio"]
    if not file.filename:
        return jsonify({"error": "Empty filename"}), 400
    if not allowed_file(file.filename):
        return jsonify({"error": "Unsupported file type"}), 415

    ext            = file.filename.rsplit(".", 1)[1].lower()
    upload_path    = os.path.join(UPLOAD_FOLDER, f"{uuid.uuid4()}.{ext}")
    converted_path = None
    file.save(upload_path)

    try:
        if ext not in NATIVE_FORMATS:
            converted_path = convert_to_wav(upload_path)
            predict_path   = converted_path
        else:
            predict_path = upload_path
        result = predict_genre(predict_path)
    except RuntimeError as e:
        return jsonify({"error": str(e)}), 422
    except Exception as e:
        return jsonify({"error": f"Prediction failed: {str(e)}"}), 500
    finally:
        for p in [upload_path, converted_path]:
            if p and os.path.exists(p):
                os.remove(p)

    if "error" in result:
        return jsonify(result), 422

    genres             = [item["genre"] for item in result["predictions"]]
    spotify_configured = get_spotify_token() is not None
    songs              = get_recommendations(genres) if spotify_configured else []

    return jsonify({
        "predictions":        result["predictions"],
        "recommendations":    songs,
        "spotify_configured": spotify_configured,
    }), 200


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True, use_reloader=False)