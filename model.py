import os
import numpy as np
import librosa
import librosa.util
from sklearn.model_selection import train_test_split
import tensorflow as tf
from tensorflow.keras import layers, models
from tensorflow.keras.callbacks import EarlyStopping, ModelCheckpoint

DATA_PATH = "/Users/negikshitiz/Documents/Projects/genrefy123/Data/genres_original"
SAMPLE_RATE = 22050
DURATION = 30
SAMPLES_PER_TRACK = SAMPLE_RATE * DURATION
N_MELS = 128
FIXED_TIME_STEPS = 130
NUM_SEGMENTS = 10

def get_file_paths():
    file_paths = []
    labels = []
    
    genres = sorted(os.listdir(DATA_PATH))
    
    for label, genre in enumerate(genres):
        genre_path = os.path.join(DATA_PATH, genre)
        
        for file in os.listdir(genre_path):
            file_path = os.path.join(genre_path, file)
            file_paths.append(file_path)
            labels.append(label)
    
    return file_paths, labels

def process_files(file_paths, labels):
    data = []
    y = []

    samples_per_segment = int(SAMPLES_PER_TRACK / NUM_SEGMENTS)

    for file_path, label in zip(file_paths, labels):
        try:
            signal, sr = librosa.load(file_path, sr=SAMPLE_RATE)
        except Exception as e:
            print(f"Skipping {file_path}: {e}")
            continue

        for s in range(NUM_SEGMENTS):
            start = samples_per_segment * s
            end = start + samples_per_segment

            segment = signal[start:end]

            if len(segment) != samples_per_segment:
                continue

            mel = librosa.feature.melspectrogram(
                y=segment, sr=sr, n_mels=N_MELS
            )
            mel_db = librosa.power_to_db(mel)
            mel_db = librosa.util.fix_length(mel_db, size=FIXED_TIME_STEPS, axis=1)
            mel_db = (mel_db - np.mean(mel_db)) / (np.std(mel_db) + 1e-6)
            data.append(mel_db)
            y.append(label)

    return np.array(data), np.array(y)

print("Loading file paths...")
file_paths, labels = get_file_paths()
train_paths, test_paths, train_labels, test_labels = train_test_split(
    file_paths, labels, test_size=0.2, random_state=42, stratify=labels
)

print("Processing training data...")
X_train, y_train = process_files(train_paths, train_labels)

print("Processing testing data...")
X_test, y_test = process_files(test_paths, test_labels)

X_train = X_train[..., np.newaxis]
X_test = X_test[..., np.newaxis]

print("Train shape:", X_train.shape)
print("Test shape:", X_test.shape)

model = models.Sequential([
    layers.Input(shape=(128, 130, 1)),

    layers.Conv2D(32, (3,3), activation='relu'),
    layers.MaxPooling2D((2,2)),
    layers.BatchNormalization(),

    layers.Conv2D(64, (3,3), activation='relu'),
    layers.MaxPooling2D((2,2)),
    layers.BatchNormalization(),

    layers.Conv2D(128, (2,2), activation='relu'),
    layers.MaxPooling2D((2,2)),
    layers.BatchNormalization(),

    layers.Flatten(),

    layers.Dense(128, activation='relu'),
    layers.Dropout(0.3),

    layers.Dense(10, activation='softmax')
])

model.compile(
    optimizer='adam',
    loss='sparse_categorical_crossentropy',
    metrics=['accuracy']
)

model.summary()

early_stop = EarlyStopping(
    monitor='val_loss',
    patience=5,
    restore_best_weights=True
)

checkpoint = ModelCheckpoint(
    "best_model.h5",
    monitor='val_accuracy',
    save_best_only=True
)

history = model.fit(
    X_train,
    y_train,
    validation_data=(X_test, y_test),
    epochs=15,
    batch_size=32,
    callbacks=[early_stop, checkpoint]
)

loss, acc = model.evaluate(X_test, y_test)
print(f"\nFinal Test Accuracy: {acc:.4f}")

model.save("BackEnd/genrefy_model.keras")

print("Training complete. Model saved.")
