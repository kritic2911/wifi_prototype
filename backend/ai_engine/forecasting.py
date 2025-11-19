from statsmodels.tsa.arima.model import ARIMA
import numpy as np

class TrafficForecaster:
    def __init__(self):
        # Initialize with some dummy history to allow immediate prediction
        self.history = [10, 12, 15, 14, 18, 20, 22, 25, 24, 30, 28, 32, 35, 33, 38] 

    def update_history(self, new_value):
        self.history.append(new_value)
        if len(self.history) > 100:
            self.history.pop(0)

    def predict_next(self):
        try:
            # Simple ARIMA model
            model = ARIMA(self.history, order=(1, 1, 1))
            model_fit = model.fit()
            forecast = model_fit.forecast(steps=1)
            return float(forecast[0])
        except Exception as e:
            print(f"ARIMA Error: {e}")
            return self.history[-1] # Fallback
