import requests
import json

BASE_URL = "http://localhost:8000"

samples = [
    {
        "title": "Incident 1 (High SIF Potential - Hydrocarbon Gas Leak)",
        "report_text": "During maintenance at Digboi Well Site #14, a technician cracked a flange on a live pressurized gas line without performing Lockout/Tagout (LOTO) energy isolation. High pressure gas released into the enclosed area."
    },
    {
        "title": "Incident 2 (Low SIF - Minor Slip)",
        "report_text": "An office assistant slipped on wet tiles near the administrative canteen while carrying documents. Sustained minor bruise on elbow, returned to work immediately."
    }
]

def main():
    print("Testing SIF Detection Microservice...\n")
    for sample in samples:
        print(f"=== {sample['title']} ===")
        try:
            res = requests.post(f"{BASE_URL}/analyze-report", json={"report_text": sample["report_text"]}, timeout=30)
            print(f"HTTP Status: {res.status_code}")
            if res.status_code == 200:
                print("Result:\n", json.dumps(res.json(), indent=2))
            else:
                print("Error:\n", res.text)
        except Exception as e:
            print("Failed to reach endpoint:", e)
        print("-" * 50)

if __name__ == "__main__":
    main()
