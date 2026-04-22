# Genrefy - Music Genre Classification

A web application that predicts music genres from audio files using deep learning.

## Features

- Upload audio files (MP3, WAV, OGG, FLAC, M4A, AAC, WebM)
- Real-time genre prediction with confidence scores
- Top 3 genre predictions
- Clean, modern web interface

## Setup

1. Install Python dependencies:
   ```bash
   pip install -r requirements.txt
   ```

2. Make sure you have the model file `best_model.keras` in the same directory as the scripts.

3. Run the Flask server:
   ```bash
   python3 app.py
   ```

4. Open `index.html` in your web browser or serve it via a web server.

## API

### POST /predict

Upload an audio file to get genre predictions.

**Request:**
- Content-Type: `multipart/form-data`
- Body: `audio` field with audio file

**Response:**
```json
{
  "predictions": [
    {"genre": "rock", "confidence": 0.85},
    {"genre": "pop", "confidence": 0.12},
    {"genre": "jazz", "confidence": 0.03}
  ]
}
```

## Supported Genres

- blues
- classical
- country
- disco
- hiphop
- jazz
- metal
- pop
- reggae
- rock

## Technologies Used

- **Backend:** Flask, TensorFlow, Librosa
- **Frontend:** HTML, CSS, JavaScript
- **Model:** Convolutional Neural Network trained on GTZAN dataset