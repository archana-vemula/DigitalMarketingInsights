from flask import Flask, request, jsonify
from agmark_client import fetch_live_prices
from database import save_data, load_data
from model import train_and_predict

app = Flask(__name__)

@app.route("/")
def home():
    return {"message": "Backend working with Agmark API + Offline Cache + Prediction!"}

@app.route("/api/prices/live", methods=["GET"])
def get_live_prices():
    crop = request.args.get("crop")
    state = request.args.get("state", "Telangana")

    if not crop:
        return {"error": "Please provide a crop parameter"}, 400

    data = fetch_live_prices(crop, state)

    if data and len(data) > 0:
        save_data(data)
        return jsonify({"source": "API", "data": data})

    cached = load_data()
    return jsonify({"source": "OFFLINE", "data": cached})

@app.route("/api/prices/predict", methods=["GET"])
def predict_prices():
    cached_data = load_data()

    if "data" not in cached_data or len(cached_data["data"]) == 0:
        return {"error": "No offline data available"}, 400

    prices = [record["modal"] for record in cached_data["data"]]
    results = train_and_predict(prices)

    return jsonify(results)

if __name__ == "__main__":
    app.run(debug=True)
