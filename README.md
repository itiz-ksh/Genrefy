# Genrefy – Music Genre Classification using Deep Learning

Genrefy is a deep learning-based web application that classifies music genres from audio files and provides song recommendations using Spotify integration.

---

## Overview

This project demonstrates the application of Convolutional Neural Networks (CNNs) in audio signal processing. It converts raw audio into Mel Spectrograms and predicts the most probable genres with confidence scores.

---

## Key Features

- Audio upload and recording support  
- Real-time genre prediction  
- Top 3 genre predictions with confidence  
- Spotify-based song recommendations  
- Interactive web interface  

---

## Tech Stack

**Backend:** Flask, TensorFlow, Librosa, NumPy  
**Frontend:** HTML, CSS, JavaScript  
**Model:** CNN trained on GTZAN dataset  

---

## System Workflow

1. User uploads or records audio  
2. Audio is processed using Librosa  
3. Converted into Mel Spectrogram  
4. CNN model predicts genre probabilities  
5. Top genres are selected  
6. Spotify API returns recommendations  

---

## Model Architecture

- Input: Mel Spectrogram (128 × 130)  
- Conv2D → ReLU → MaxPooling → BatchNorm (×3)  
- Dense Layer (128 units)  
- Dropout (0.3)  
- Output Layer (Softmax, 10 classes)  

---

## Results

- Achieves reliable genre classification on GTZAN dataset  
- Provides consistent top-3 predictions  
- Real-time inference through Flask backend  

---

## Project Structure
Genrefy/
│── app.py
│── predict.py
│── model.py
│── requirements.txt
│── index.html
│── style.css
│── script.js
│── best_model.keras
│── uploads/

---

## Setup Instructions

```bash
git clone https://github.com/YOUR_USERNAME/genrefy.git
cd genrefy
pip install -r requirements.txt
python3 app.py

Spotify Integration (Optional)
export SPOTIPY_CLIENT_ID=your_id
export SPOTIPY_CLIENT_SECRET=your_secret

Dataset-

GTZAN Dataset:
https://www.kaggle.com/datasets/andradaolteanu/gtzan-dataset-music-genre-classification

Future Improvements
  Hybrid CNN + LSTM model
  Larger datasets for better generalization
  Cloud deployment
  Personalized recommendations

Author's -

Kshitiz Negi
Prince Negi