import requests

BASE_URL = "https://api.data.gov.in/resource/9ef84268-d588-465a-a308-a864a43d0070"
API_KEY = "579b464db66ec23bdd0000016e7d5e3c5bef41f75baf0de6a8d3c9d5"  # Your Key

def fetch_live_prices(crop, state):
    params = {
        "api-key": API_KEY,
        "format": "json",
        "filters[commodity]": crop,
        "filters[state]": state
    }

    try:
        response = requests.get(BASE_URL, params=params)

        if response.status_code == 200:
            result = response.json()
            return result.get("records", [])
        else:
            return []

    except:
        return []