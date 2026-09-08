import getpass
import json
import urllib.request
import urllib.error

from supabase import create_client

from app.core.config import get_settings


settings = get_settings()

email = input("Email: ")
password = getpass.getpass("Password: ")
audio_path = input("Audio file path: ")

supabase = create_client(
    settings.SUPABASE_URL,
    settings.SUPABASE_SECRET_KEY,
)

login_response = supabase.auth.sign_in_with_password({
    "email": email,
    "password": password,
})

access_token = login_response.session.access_token

elder_id = "f799f3c8-46b7-468c-899a-52db203b1fab"

with open(audio_path, "rb") as audio_file:
    audio_bytes = audio_file.read()

filename = audio_path.split("\\")[-1]

boundary = "----KahaaniCheckBoundary"

body = (
    f"--{boundary}\r\n"
    f'Content-Disposition: form-data; name="elder_id"\r\n\r\n'
    f"{elder_id}\r\n"
    f"--{boundary}\r\n"
    f'Content-Disposition: form-data; name="audio"; filename="{filename}"\r\n'
    f"Content-Type: audio/mpeg\r\n\r\n"
).encode() + audio_bytes + (
    f"\r\n--{boundary}--\r\n"
).encode()

request = urllib.request.Request(
    "http://127.0.0.1:8000/v1/calls/upload",
    data=body,
    headers={
        "Authorization": f"Bearer {access_token}",
        "Content-Type": f"multipart/form-data; boundary={boundary}",
    },
    method="POST",
)

try:
    with urllib.request.urlopen(request) as response:
        result = json.loads(response.read().decode())

    print("UPLOAD: OK")
    print(json.dumps(result, indent=2))

except urllib.error.HTTPError as error:
    print("UPLOAD: FAILED")
    print("STATUS:", error.code)
    print(error.read().decode())