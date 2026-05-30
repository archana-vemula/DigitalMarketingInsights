import numpy as np
from sklearn.linear_model import LinearRegression

model = LinearRegression()

def train_and_predict(prices):
    if len(prices) < 2:
        return {"error": "Not enough data to predict future prices"}

    # Convert to numpy for training
    X = np.arange(len(prices)).reshape(-1, 1)
    y = np.array(prices)

    model.fit(X, y)

    future_days = np.array([len(prices), len(prices)+1, len(prices)+2]).reshape(-1, 1)
    future_predictions = model.predict(future_days)

    return {
        "predicted_prices": future_predictions.tolist(),
        "suggestion": "Market rising 📈 — Good time to sell!" 
            if future_predictions[-1] > prices[-1]
            else "Market dropping 📉 — Better wait!"
    }
