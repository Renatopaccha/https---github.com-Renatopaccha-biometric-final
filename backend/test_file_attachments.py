import requests
import base64
import json
import os

# Test file attachment processing with Base64

API_URL = "http://127.0.0.1:8000"

# Create a small test CSV content
csv_content = """nombre,edad,ciudad
Juan,25,Madrid
María,30,Barcelona
Pedro,28,Valencia"""

# Encode to Base64
csv_base64 = base64.b64encode(csv_content.encode('utf-8')).decode('utf-8')

print("=" * 60)
print("TEST: File Attachment with Base64 encoding")
print("=" * 60)

# Test with CSV attachment
payload = {
    "message": "Por favor, analiza este archivo CSV que te he enviado",
    "history": [],
    "attachments": [
        {
            "name": "datos_test.csv",
            "mime_type": "text/csv",
            "data": csv_base64
        }
    ]
}

print("\n1. Sending CSV file...")
print(f"   - File: datos_test.csv")
print(f"   - Size: {len(csv_content)} bytes")
print(f"   - Base64 size: {len(csv_base64)} chars")

response = requests.post(
    f"{API_URL}/api/v1/ai/chat",
    json=payload,
    headers={"Content-Type": "application/json"}
)

print(f"\n2. Response Status: {response.status_code}")

if response.status_code == 200:
    result = response.json()
    print(f"\n3. Result:")
    print(f"   - Success: {result.get('success')}")
    print(f"   - Files processed: {result.get('files_processed')}")
    print(f"   - Error: {result.get('error')}")
    
    if result.get('success'):
        print(f"\n4. AI Response:")
        print(f"   {result.get('response')[:200]}...")
    else:
        print(f"\n4. Error Message:")
        print(f"   {result.get('response')}")
else:
    print(f"\n3. HTTP Error:")
    print(f"   {response.text}")

print("\n" + "=" * 60)
print("Test completed!")
print("=" * 60)
