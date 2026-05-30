import json
import os
from datetime import datetime

DB_PATH = os.path.join("data", "live_prices.json")

def save_data(data):
    # Add timestamp
    payload = {
        "timestamp": datetime.now().isoformat(),
        "data": data
    }

    with open(DB_PATH, "w") as file:
        json.dump(payload, file, indent=4)

def load_data():
    if not os.path.exists(DB_PATH):
        return {"error": "No cached data available"}

    with open(DB_PATH, "r") as file:
        return json.load(file)
