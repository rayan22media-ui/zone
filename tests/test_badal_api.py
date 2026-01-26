"""
Badal Syrian Barter Platform - API Tests
Tests for: Notifications, Messages, Pages, Settings, Offers
"""
import pytest
import requests
import os
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://zone-barter.preview.emergentagent.com').rstrip('/')

class TestHealth:
    """Health check tests"""
    
    def test_health_endpoint(self):
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        print("✓ Health endpoint working")


class TestAuth:
    """Authentication tests"""
    
    def test_admin_login(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@win.sy",
            "password": "admin123"
        })
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert "user" in data
        assert data["user"]["email"] == "admin@win.sy"
        print("✓ Admin login successful")
        return data["access_token"]
    
    def test_user_login(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "ali@example.com",
            "password": "123"
        })
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        print("✓ User login successful")
        return data["access_token"]
    
    def test_invalid_login(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "invalid@test.com",
            "password": "wrongpassword"
        })
        assert response.status_code == 401
        print("✓ Invalid login correctly rejected")


class TestNotifications:
    """Notification system tests"""
    
    @pytest.fixture
    def admin_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@win.sy",
            "password": "admin123"
        })
        return response.json()["access_token"]
    
    def test_get_notifications(self, admin_token):
        response = requests.get(
            f"{BASE_URL}/api/notifications",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Got {len(data)} notifications")
    
    def test_get_unread_count(self, admin_token):
        response = requests.get(
            f"{BASE_URL}/api/notifications/unread-count",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "count" in data
        print(f"✓ Unread count: {data['count']}")
    
    def test_mark_all_notifications_read(self, admin_token):
        # Get initial count
        response = requests.get(
            f"{BASE_URL}/api/notifications/unread-count",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        initial_count = response.json()["count"]
        
        # Mark all as read
        response = requests.put(
            f"{BASE_URL}/api/notifications/read-all",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        
        # Verify count is 0
        response = requests.get(
            f"{BASE_URL}/api/notifications/unread-count",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.json()["count"] == 0
        print("✓ Mark all notifications as read working")


class TestMessages:
    """Messages system tests"""
    
    @pytest.fixture
    def admin_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@win.sy",
            "password": "admin123"
        })
        return response.json()["access_token"]
    
    def test_get_conversations(self, admin_token):
        response = requests.get(
            f"{BASE_URL}/api/conversations",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Got {len(data)} conversations")
    
    def test_get_unread_messages_count(self, admin_token):
        response = requests.get(
            f"{BASE_URL}/api/messages/unread-count",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "count" in data
        print(f"✓ Unread messages count: {data['count']}")


class TestPages:
    """Admin Pages (Page Builder) tests"""
    
    @pytest.fixture
    def admin_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@win.sy",
            "password": "admin123"
        })
        return response.json()["access_token"]
    
    def test_get_pages(self, admin_token):
        response = requests.get(
            f"{BASE_URL}/api/pages",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Got {len(data)} pages")
    
    def test_create_page(self, admin_token):
        # Create a test page with unique slug
        import time
        unique_slug = f"test-page-api-{int(time.time())}"
        response = requests.post(
            f"{BASE_URL}/api/pages",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={
                "title": "TEST_صفحة اختبار",
                "slug": unique_slug,
                "is_published": False,
                "components": []
            }
        )
        assert response.status_code in [200, 201]
        data = response.json()
        assert "id" in data
        print(f"✓ Created page with id: {data['id']}")
    
    def test_update_page(self, admin_token):
        # First create a page with unique slug
        import time
        unique_slug = f"test-update-page-{int(time.time())}"
        create_response = requests.post(
            f"{BASE_URL}/api/pages",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={
                "title": "TEST_صفحة للتحديث",
                "slug": unique_slug,
                "is_published": False,
                "components": []
            }
        )
        page_id = create_response.json()["id"]
        
        # Update the page with components
        response = requests.put(
            f"{BASE_URL}/api/pages/{page_id}",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={
                "title": "TEST_صفحة محدثة",
                "slug": "test-update-page",
                "is_published": True,
                "components": [
                    {"type": "hero", "data": {"title": "عنوان", "subtitle": "عنوان فرعي"}}
                ]
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert data["title"] == "TEST_صفحة محدثة"
        print("✓ Page updated successfully")


class TestSettings:
    """Site Settings tests"""
    
    @pytest.fixture
    def admin_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@win.sy",
            "password": "admin123"
        })
        return response.json()["access_token"]
    
    def test_get_settings(self):
        response = requests.get(f"{BASE_URL}/api/settings")
        assert response.status_code == 200
        data = response.json()
        assert "site_name" in data
        assert "site_logo" in data
        print(f"✓ Got settings - Site name: {data['site_name']}")
    
    def test_update_settings(self, admin_token):
        # Get current settings
        current = requests.get(f"{BASE_URL}/api/settings").json()
        
        # Update settings
        response = requests.put(
            f"{BASE_URL}/api/settings",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={
                "site_name": current["site_name"],
                "contact_email": current.get("contact_email", "info@badal.sy"),
                "contact_phone": current.get("contact_phone", "+963999999999"),
                "footer_text": current.get("footer_text", ""),
                "primary_color": current.get("primary_color", "#c2a8ff")
            }
        )
        assert response.status_code == 200
        print("✓ Settings update working")


class TestOffers:
    """Offers CRUD tests"""
    
    @pytest.fixture
    def admin_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@win.sy",
            "password": "admin123"
        })
        return response.json()["access_token"]
    
    def test_get_offers(self):
        response = requests.get(f"{BASE_URL}/api/offers")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Got {len(data)} offers")
    
    def test_get_single_offer(self):
        # First get list of offers
        offers = requests.get(f"{BASE_URL}/api/offers").json()
        if len(offers) > 0:
            offer_id = offers[0]["id"]
            response = requests.get(f"{BASE_URL}/api/offers/{offer_id}")
            assert response.status_code == 200
            data = response.json()
            assert data["id"] == offer_id
            print(f"✓ Got single offer: {data['title']}")
    
    def test_update_offer(self, admin_token):
        # Get admin's offers
        response = requests.get(
            f"{BASE_URL}/api/my-offers",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        offers = response.json()
        
        if len(offers) > 0:
            offer_id = offers[0]["id"]
            original_title = offers[0]["title"]
            
            # Update the offer
            response = requests.put(
                f"{BASE_URL}/api/offers/{offer_id}",
                headers={"Authorization": f"Bearer {admin_token}"},
                json={
                    "title": original_title,
                    "description": offers[0]["description"],
                    "category": offers[0]["category"],
                    "governorate": offers[0]["governorate"],
                    "wanted_items": offers[0]["wanted_items"],
                    "images": offers[0]["images"],
                    "is_quick_trade": offers[0].get("is_quick_trade", False)
                }
            )
            assert response.status_code == 200
            print("✓ Offer update working")
    
    def test_update_offer_status(self, admin_token):
        # Get admin's offers
        response = requests.get(
            f"{BASE_URL}/api/my-offers",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        offers = response.json()
        
        if len(offers) > 0:
            offer_id = offers[0]["id"]
            current_status = offers[0]["status"]
            
            # Update status - status is a query parameter
            response = requests.put(
                f"{BASE_URL}/api/offers/{offer_id}/status?status={current_status}",
                headers={"Authorization": f"Bearer {admin_token}"}
            )
            assert response.status_code == 200
            print("✓ Offer status update working")


class TestBlog:
    """Blog tests"""
    
    def test_get_blog_posts(self):
        response = requests.get(f"{BASE_URL}/api/blog")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Got {len(data)} blog posts")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
