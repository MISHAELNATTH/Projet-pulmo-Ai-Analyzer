import sys
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

def test_auth_and_rbac():
    print("Running auth and RBAC verification tests...")

    # Test 1: Get Access Token for seeded Radiologist
    print("Testing Radiologist login...")
    response = client.post(
        "/api/auth/token",
        data={"username": "radiologist@pneumoguard.com", "password": "radiologistpass123"}
    )
    assert response.status_code == 200, f"Radiologist login failed: {response.text}"
    token_data = response.json()
    assert "access_token" in token_data
    radio_token = token_data["access_token"]
    print("[OK] Radiologist login successful. Token acquired.")

    # Test 2: Access Radiologist route with Radiologist token
    print("Testing authorized access to Radiologist-only route...")
    headers = {"Authorization": f"Bearer {radio_token}"}
    response = client.get("/api/test/radiologist-only", headers=headers)
    assert response.status_code == 200, f"Authorized access failed: {response.text}"
    assert "Welcome Dr. Doe" in response.json()["message"]
    print("[OK] Radiologist successfully accessed Radiologist-only route.")

    # Test 3: Access Admin-only route with Radiologist token (Should fail with 403)
    print("Testing unauthorized access to Admin-only route with Radiologist token...")
    response = client.get("/api/test/admin-only", headers=headers)
    assert response.status_code == 403, f"Expected 403 Forbidden, got {response.status_code}: {response.text}"
    print("[OK] Radiologist access to Admin-only route successfully blocked (403 Forbidden).")

    # Test 4: Get Access Token for seeded Admin
    print("Testing Admin login...")
    response = client.post(
        "/api/auth/token",
        data={"username": "admin@pneumoguard.com", "password": "adminpass123"}
    )
    assert response.status_code == 200, f"Admin login failed: {response.text}"
    admin_token = response.json()["access_token"]
    print("[OK] Admin login successful. Token acquired.")

    # Test 5: Access Admin-only route with Admin token
    print("Testing authorized access to Admin-only route...")
    admin_headers = {"Authorization": f"Bearer {admin_token}"}
    response = client.get("/api/test/admin-only", headers=admin_headers)
    assert response.status_code == 200, f"Authorized access failed: {response.text}"
    assert "Welcome System Administrator" in response.json()["message"]
    print("[OK] Admin successfully accessed Admin-only route.")

    print("\nAll Auth and RBAC tests completed successfully!")

if __name__ == "__main__":
    test_auth_and_rbac()
