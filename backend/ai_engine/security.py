from sklearn.ensemble import IsolationForest
import numpy as np

class AnomalyDetector:
    def __init__(self):
        self.model = IsolationForest(contamination=0.1, random_state=42)
        self.is_trained = False
        self._train_dummy()

    def _train_dummy(self):
        # Train on normal-looking data
        # Features: [jitter, bytes_transferred, duration]
        # Normal: low jitter, moderate bytes, varying duration
        # Jitter: mean 10, std 5
        # Bytes: mean 500, std 100
        # Duration: mean 60, std 20
        X_train = np.random.normal(loc=[10, 500, 60], scale=[5, 100, 20], size=(100, 3))
        self.model.fit(X_train)
        self.is_trained = True

    def predict(self, data_point):
        # data_point: [jitter, bytes, duration]
        if not self.is_trained:
            return False # Default to normal if not trained
        
        # Reshape for single prediction
        X = np.array(data_point).reshape(1, -1)
        prediction = self.model.predict(X)
        # -1 is anomaly, 1 is normal
        return prediction[0] == -1
