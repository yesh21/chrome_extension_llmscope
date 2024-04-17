import requests
import json

base_url = "http://127.0.0.1:5000/"
check_response = requests.get(base_url)
message = check_response.json()

print(message)
