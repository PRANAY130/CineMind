import requests
try:
    r = requests.get("http://127.0.0.1:8000/videos/19/emotions")
    print(r.status_code)
    print(r.text)
except Exception as e:
    print(e)
