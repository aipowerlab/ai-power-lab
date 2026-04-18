"""
AI Power Lab Backend API Tests
Tests for: Auth, Tools, Dashboard, Admin, Saved Outputs
"""
import pytest
import requests
import os

# Read from frontend .env file
import pathlib
frontend_env = pathlib.Path('/app/frontend/.env')
BASE_URL = ''
if frontend_env.exists():
    for line in frontend_env.read_text().splitlines():
        if line.startswith('EXPO_PUBLIC_BACKEND_URL='):
            BASE_URL = line.split('=', 1)[1].strip().rstrip('/')
            break

if not BASE_URL:
    raise RuntimeError("EXPO_PUBLIC_BACKEND_URL not found in /app/frontend/.env")

@pytest.fixture
def api_client():
    """Shared requests session"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session

@pytest.fixture
def admin_session(api_client):
    """Admin authenticated session"""
    response = api_client.post(f"{BASE_URL}/api/auth/login", json={
        "email": "admin@aipowerlab.com",
        "password": "admin123"
    })
    if response.status_code != 200:
        pytest.skip(f"Admin login failed: {response.status_code}")
    return api_client

@pytest.fixture
def test_user_session(api_client):
    """Test user authenticated session"""
    # Register a test user
    import uuid
    email = f"test_{uuid.uuid4().hex[:8]}@test.com"
    response = api_client.post(f"{BASE_URL}/api/auth/register", json={
        "email": email,
        "password": "testpass123",
        "name": "Test User"
    })
    if response.status_code != 200:
        pytest.skip(f"Test user registration failed: {response.status_code}")
    return api_client

class TestAuth:
    """Authentication endpoint tests"""

    def test_admin_login_success(self, api_client):
        """Test admin login with correct credentials"""
        response = api_client.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@aipowerlab.com",
            "password": "admin123"
        })
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "user_id" in data
        assert "email" in data
        assert data["email"] == "admin@aipowerlab.com"
        assert data["role"] == "admin"
        assert data["subscription_status"] == "premium"
        assert "password_hash" not in data

    def test_login_invalid_credentials(self, api_client):
        """Test login with wrong password"""
        response = api_client.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@aipowerlab.com",
            "password": "wrongpassword"
        })
        assert response.status_code == 401

    def test_register_new_user(self, api_client):
        """Test user registration"""
        import uuid
        email = f"test_{uuid.uuid4().hex[:8]}@test.com"
        response = api_client.post(f"{BASE_URL}/api/auth/register", json={
            "email": email,
            "password": "testpass123",
            "name": "Test User"
        })
        assert response.status_code == 200
        
        data = response.json()
        assert data["email"] == email
        assert data["name"] == "Test User"
        assert data["role"] == "user"
        assert data["subscription_status"] == "free"
        assert data["tool_uses"] == 0

    def test_register_duplicate_email(self, api_client):
        """Test registration with existing email"""
        response = api_client.post(f"{BASE_URL}/api/auth/register", json={
            "email": "admin@aipowerlab.com",
            "password": "testpass123",
            "name": "Duplicate"
        })
        assert response.status_code == 400

    def test_get_me_authenticated(self, admin_session):
        """Test GET /api/auth/me with valid session"""
        response = admin_session.get(f"{BASE_URL}/api/auth/me")
        assert response.status_code == 200
        
        data = response.json()
        assert data["email"] == "admin@aipowerlab.com"
        assert data["role"] == "admin"

    def test_get_me_unauthenticated(self, api_client):
        """Test GET /api/auth/me without auth"""
        response = api_client.get(f"{BASE_URL}/api/auth/me")
        assert response.status_code == 401

    def test_logout(self, admin_session):
        """Test logout endpoint"""
        response = admin_session.post(f"{BASE_URL}/api/auth/logout")
        assert response.status_code == 200

class TestTools:
    """Tools endpoint tests"""

    def test_get_tools_list(self, api_client):
        """Test GET /api/tools returns 21 tools and 9 categories"""
        response = api_client.get(f"{BASE_URL}/api/tools")
        assert response.status_code == 200
        
        data = response.json()
        assert "tools" in data
        assert "categories" in data
        assert len(data["tools"]) == 21, f"Expected 21 tools, got {len(data['tools'])}"
        assert len(data["categories"]) == 9, f"Expected 9 categories, got {len(data['categories'])}"
        
        # Verify tool structure
        tool = data["tools"][0]
        assert "id" in tool
        assert "name" in tool
        assert "category" in tool
        assert "description" in tool
        assert "type" in tool
        assert "enabled" in tool
        assert "inputs" in tool

    def test_get_specific_tool(self, api_client):
        """Test GET /api/tools/{tool_id}"""
        response = api_client.get(f"{BASE_URL}/api/tools/blog-writer")
        assert response.status_code == 200
        
        data = response.json()
        assert data["id"] == "blog-writer"
        assert data["name"] == "AI Blog Writer"
        assert data["category"] == "Content Creation"
        assert data["type"] == "text"

    def test_get_nonexistent_tool(self, api_client):
        """Test GET /api/tools/{tool_id} with invalid ID"""
        response = api_client.get(f"{BASE_URL}/api/tools/nonexistent-tool")
        assert response.status_code == 404

    def test_generate_without_auth(self, api_client):
        """Test POST /api/tools/generate without authentication"""
        response = api_client.post(f"{BASE_URL}/api/tools/generate", json={
            "tool_id": "blog-writer",
            "inputs": {"topic": "AI", "tone": "Professional", "length": "500 words"}
        })
        assert response.status_code == 401

class TestDashboard:
    """Dashboard endpoint tests"""

    def test_get_dashboard_authenticated(self, admin_session):
        """Test GET /api/dashboard with admin user"""
        response = admin_session.get(f"{BASE_URL}/api/dashboard")
        assert response.status_code == 200
        
        data = response.json()
        assert "total_uses" in data
        assert "saved_outputs" in data
        assert "remaining_uses" in data
        assert "is_premium" in data
        assert "subscription_plan" in data
        assert "recent_activity" in data
        
        # Admin should be premium
        assert data["is_premium"] == True
        assert data["remaining_uses"] == "Unlimited"

    def test_get_dashboard_unauthenticated(self, api_client):
        """Test GET /api/dashboard without auth"""
        response = api_client.get(f"{BASE_URL}/api/dashboard")
        assert response.status_code == 401

class TestAdmin:
    """Admin endpoint tests"""

    def test_admin_stats(self, admin_session):
        """Test GET /api/admin/stats"""
        response = admin_session.get(f"{BASE_URL}/api/admin/stats")
        assert response.status_code == 200
        
        data = response.json()
        assert "total_users" in data
        assert "premium_users" in data
        assert "total_generations" in data
        assert "total_saved" in data
        assert "recent_users" in data
        
        # Should have at least 1 user (admin)
        assert data["total_users"] >= 1

    def test_admin_get_users(self, admin_session):
        """Test GET /api/admin/users"""
        response = admin_session.get(f"{BASE_URL}/api/admin/users")
        assert response.status_code == 200
        
        data = response.json()
        assert "users" in data
        assert len(data["users"]) >= 1
        
        # Verify admin user exists
        admin_user = next((u for u in data["users"] if u["email"] == "admin@aipowerlab.com"), None)
        assert admin_user is not None
        assert admin_user["role"] == "admin"

    def test_admin_access_denied_for_regular_user(self, test_user_session):
        """Test admin endpoints reject non-admin users"""
        response = test_user_session.get(f"{BASE_URL}/api/admin/stats")
        assert response.status_code == 403

class TestSavedOutputs:
    """Saved outputs endpoint tests"""

    def test_get_outputs_empty(self, test_user_session):
        """Test GET /api/outputs for new user"""
        response = test_user_session.get(f"{BASE_URL}/api/outputs")
        assert response.status_code == 200
        
        data = response.json()
        assert "outputs" in data
        assert isinstance(data["outputs"], list)

    def test_save_output(self, test_user_session):
        """Test POST /api/outputs/save"""
        response = test_user_session.post(f"{BASE_URL}/api/outputs/save", json={
            "tool_id": "blog-writer",
            "tool_name": "AI Blog Writer",
            "category": "Content Creation",
            "output": "This is a test blog post generated by AI.",
            "inputs": {"topic": "Testing", "tone": "Professional", "length": "100 words"}
        })
        assert response.status_code == 200
        
        data = response.json()
        assert "output_id" in data
        assert "message" in data
        
        # Verify it was saved by fetching outputs
        get_response = test_user_session.get(f"{BASE_URL}/api/outputs")
        assert get_response.status_code == 200
        outputs = get_response.json()["outputs"]
        assert len(outputs) >= 1
        assert outputs[0]["tool_name"] == "AI Blog Writer"

    def test_delete_output(self, test_user_session):
        """Test DELETE /api/outputs/{output_id}"""
        # First save an output
        save_response = test_user_session.post(f"{BASE_URL}/api/outputs/save", json={
            "tool_id": "blog-writer",
            "tool_name": "AI Blog Writer",
            "category": "Content Creation",
            "output": "Test output to delete",
            "inputs": {}
        })
        output_id = save_response.json()["output_id"]
        
        # Delete it
        delete_response = test_user_session.delete(f"{BASE_URL}/api/outputs/{output_id}")
        assert delete_response.status_code == 200
        
        # Verify it's gone
        get_response = test_user_session.get(f"{BASE_URL}/api/outputs")
        outputs = get_response.json()["outputs"]
        assert not any(o["output_id"] == output_id for o in outputs)

class TestPasswordReset:
    """Password reset flow tests"""

    def test_forgot_password(self, api_client):
        """Test POST /api/auth/forgot-password"""
        response = api_client.post(f"{BASE_URL}/api/auth/forgot-password", json={
            "email": "admin@aipowerlab.com"
        })
        assert response.status_code == 200
        
        data = response.json()
        assert "message" in data
        # In test mode, token is returned
        if "token" in data:
            assert len(data["token"]) > 0

    def test_forgot_password_nonexistent_email(self, api_client):
        """Test forgot password with non-existent email (should still return 200)"""
        response = api_client.post(f"{BASE_URL}/api/auth/forgot-password", json={
            "email": "nonexistent@test.com"
        })
        # Should return 200 to prevent email enumeration
        assert response.status_code == 200
