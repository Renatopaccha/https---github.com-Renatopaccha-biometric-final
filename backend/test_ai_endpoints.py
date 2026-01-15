import requests
import base64
import json

# Test the new JSON-based chat endpoint

API_URL = "http://127.0.0.1:8000"

# Test 1: Simple message without files
print("TEST 1: Simple message")
response = requests.post(
    f"{API_URL}/api/v1/ai/chat",
    json={
        "message": "Hola, ¿puedes ayudarme con bioestadística?",
        "history": [],
        "attachments": []
    }
)
print(f"Status: {response.status_code}")
result = response.json()
print(f"Success: {result.get('success')}")
print(f"Chat ID: {result.get('chat_id')}")
print(f"Response: {result.get('response')[:100]}...")
print()

# Test 2: With session ID (fake for now
print("TEST 2: With session context (will fail gracefully)")
response = requests.post(
    f"{API_URL}/api/v1/ai/chat",
    json={
        "session_id": "test-session-123",
        "message": "¿Qué datos tengo cargados?",
        "history": [],
        "attachments": []
    }
)
print(f"Status: {response.status_code}")
result = response.json()
print(f"Success: {result.get('success')}")
print(f"Session context used: {result.get('session_context_used')}")
print()

# Test 3: List chats (should be empty or have test-session-123)
print("TEST 3: List chats for session")
response = requests.get(f"{API_URL}/api/v1/ai/chats/test-session-123")
print(f"Status: {response.status_code}")
chats = response.json()
print(f"Number of chats: {len(chats)}")
if chats:
    print(f"First chat: {chats[0]}")
print()

print("✅ All tests completed!")
