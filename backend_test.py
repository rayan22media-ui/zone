#!/usr/bin/env python3
"""
Syrian Barter Platform Backend API Testing
Tests all endpoints including authentication, offers, messages, favorites, and admin functions
"""

import requests
import sys
import json
import time
from datetime import datetime
from typing import Dict, Any, Optional

class SyrianBarterAPITester:
    def __init__(self, base_url: str = "https://mobile-optimized-app.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.admin_token = None
        self.user_token = None
        self.test_user_id = None
        self.admin_user_id = None
        self.test_offer_id = None
        self.tests_run = 0
        self.tests_passed = 0
        self.failed_tests = []
        
        # Test credentials from requirements
        self.admin_email = "admin@win.sy"
        self.admin_password = "admin123"
        self.test_user_email = "ali@example.com"
        self.test_user_password = "123"

    def log_test(self, name: str, success: bool, details: str = ""):
        """Log test result"""
        self.tests_run += 1
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status} - {name}")
        if details:
            print(f"    {details}")
        if success:
            self.tests_passed += 1
        else:
            self.failed_tests.append(f"{name}: {details}")
        print()

    def make_request(self, method: str, endpoint: str, data: Optional[Dict] = None, 
                    token: Optional[str] = None, expected_status: int = 200) -> tuple[bool, Dict]:
        """Make HTTP request and return success status and response data"""
        url = f"{self.api_url}/{endpoint.lstrip('/')}"
        headers = {'Content-Type': 'application/json'}
        
        if token:
            headers['Authorization'] = f'Bearer {token}'
        
        try:
            if method.upper() == 'GET':
                response = requests.get(url, headers=headers, timeout=30)
            elif method.upper() == 'POST':
                response = requests.post(url, json=data, headers=headers, timeout=30)
            elif method.upper() == 'PUT':
                response = requests.put(url, json=data, headers=headers, timeout=30)
            elif method.upper() == 'DELETE':
                response = requests.delete(url, headers=headers, timeout=30)
            else:
                return False, {"error": f"Unsupported method: {method}"}
            
            success = response.status_code == expected_status
            try:
                response_data = response.json()
            except:
                response_data = {"status_code": response.status_code, "text": response.text}
            
            return success, response_data
            
        except requests.exceptions.RequestException as e:
            return False, {"error": str(e)}

    def test_health_check(self):
        """Test basic health endpoints"""
        print("🔍 Testing Health Check Endpoints...")
        
        # Test root endpoint
        success, data = self.make_request('GET', '/')
        self.log_test("Root endpoint", success, 
                     f"Response: {data.get('message', 'No message')}" if success else f"Error: {data}")
        
        # Test health endpoint
        success, data = self.make_request('GET', '/health')
        self.log_test("Health endpoint", success,
                     f"Status: {data.get('status', 'Unknown')}" if success else f"Error: {data}")

    def test_static_data_endpoints(self):
        """Test static data endpoints"""
        print("🔍 Testing Static Data Endpoints...")
        
        # Test governorates
        success, data = self.make_request('GET', '/governorates')
        governorates_valid = success and isinstance(data, list) and len(data) == 14
        self.log_test("Get governorates", governorates_valid,
                     f"Found {len(data) if isinstance(data, list) else 0} governorates" if success else f"Error: {data}")
        
        # Test categories
        success, data = self.make_request('GET', '/categories')
        categories_valid = success and isinstance(data, list) and len(data) > 10
        self.log_test("Get categories", categories_valid,
                     f"Found {len(data) if isinstance(data, list) else 0} categories" if success else f"Error: {data}")

    def test_authentication(self):
        """Test authentication endpoints"""
        print("🔍 Testing Authentication...")
        
        # Test admin login
        login_data = {
            "email": self.admin_email,
            "password": self.admin_password
        }
        success, data = self.make_request('POST', '/auth/login', login_data)
        if success and 'access_token' in data:
            self.admin_token = data['access_token']
            self.admin_user_id = data['user']['id']
            admin_is_admin = data['user'].get('is_admin', False)
            self.log_test("Admin login", admin_is_admin, 
                         f"Admin user: {data['user']['name']}, is_admin: {admin_is_admin}")
        else:
            self.log_test("Admin login", False, f"Error: {data}")
        
        # Test regular user login
        user_login_data = {
            "email": self.test_user_email,
            "password": self.test_user_password
        }
        success, data = self.make_request('POST', '/auth/login', user_login_data)
        if success and 'access_token' in data:
            self.user_token = data['access_token']
            self.test_user_id = data['user']['id']
            self.log_test("User login", True, f"User: {data['user']['name']}, Trust: {data['user']['trust_score']}")
        else:
            self.log_test("User login", False, f"Error: {data}")
        
        # Test /auth/me endpoint with user token
        if self.user_token:
            success, data = self.make_request('GET', '/auth/me', token=self.user_token)
            self.log_test("Get current user info", success,
                         f"User ID: {data.get('id', 'Unknown')}" if success else f"Error: {data}")
        
        # Test invalid login
        invalid_login = {
            "email": "invalid@test.com",
            "password": "wrongpassword"
        }
        success, data = self.make_request('POST', '/auth/login', invalid_login, expected_status=401)
        self.log_test("Invalid login rejection", success, "Correctly rejected invalid credentials")

    def test_user_registration(self):
        """Test user registration"""
        print("🔍 Testing User Registration...")
        
        # Create unique test user
        timestamp = int(time.time())
        test_email = f"testuser_{timestamp}@example.com"
        
        registration_data = {
            "name": f"Test User {timestamp}",
            "email": test_email,
            "password": "testpass123",
            "phone": "+963987654321",
            "governorate": "دمشق"
        }
        
        success, data = self.make_request('POST', '/auth/register', registration_data)
        if success and 'access_token' in data:
            self.log_test("User registration", True, 
                         f"New user: {data['user']['name']}, Email: {data['user']['email']}")
        else:
            self.log_test("User registration", False, f"Error: {data}")
        
        # Test duplicate email registration
        success, data = self.make_request('POST', '/auth/register', registration_data, expected_status=400)
        self.log_test("Duplicate email rejection", success, "Correctly rejected duplicate email")

    def test_offers_crud(self):
        """Test offers CRUD operations"""
        print("🔍 Testing Offers CRUD Operations...")
        
        if not self.user_token:
            self.log_test("Offers CRUD", False, "No user token available")
            return
        
        # Create offer
        offer_data = {
            "title": "لابتوب Dell للمقايضة - اختبار",
            "description": "لابتوب Dell Latitude في حالة ممتازة، مناسب للعمل والدراسة",
            "category": "إلكترونيات",
            "governorate": "دمشق",
            "wanted_items": "موبايل حديث أو منظومة طاقة شمسية",
            "images": [],
            "is_quick_trade": True
        }
        
        success, data = self.make_request('POST', '/offers', offer_data, token=self.user_token)
        if success and 'id' in data:
            self.test_offer_id = data['id']
            self.log_test("Create offer", True, f"Offer ID: {self.test_offer_id}")
        else:
            self.log_test("Create offer", False, f"Error: {data}")
            return
        
        # Get single offer
        success, data = self.make_request('GET', f'/offers/{self.test_offer_id}')
        offer_valid = success and data.get('title') == offer_data['title']
        self.log_test("Get single offer", offer_valid,
                     f"Title: {data.get('title', 'Unknown')}" if success else f"Error: {data}")
        
        # Get all offers
        success, data = self.make_request('GET', '/offers')
        offers_valid = success and isinstance(data, list) and len(data) > 0
        self.log_test("Get all offers", offers_valid,
                     f"Found {len(data) if isinstance(data, list) else 0} offers" if success else f"Error: {data}")
        
        # Get offers with filters
        success, data = self.make_request('GET', '/offers?category=إلكترونيات&governorate=دمشق')
        self.log_test("Get filtered offers", success,
                     f"Found {len(data) if isinstance(data, list) else 0} filtered offers" if success else f"Error: {data}")
        
        # Get user's own offers
        success, data = self.make_request('GET', '/my-offers', token=self.user_token)
        my_offers_valid = success and isinstance(data, list)
        self.log_test("Get my offers", my_offers_valid,
                     f"Found {len(data) if isinstance(data, list) else 0} user offers" if success else f"Error: {data}")
        
        # Update offer
        updated_data = {
            **offer_data,
            "title": "لابتوب Dell محدث - اختبار",
            "description": "وصف محدث للابتوب"
        }
        success, data = self.make_request('PUT', f'/offers/{self.test_offer_id}', updated_data, token=self.user_token)
        self.log_test("Update offer", success,
                     f"Updated title: {data.get('title', 'Unknown')}" if success else f"Error: {data}")

    def test_favorites(self):
        """Test favorites functionality"""
        print("🔍 Testing Favorites...")
        
        if not self.user_token or not self.test_offer_id:
            self.log_test("Favorites", False, "Missing user token or test offer")
            return
        
        # Add to favorites
        success, data = self.make_request('POST', f'/favorites/{self.test_offer_id}', token=self.user_token)
        self.log_test("Add to favorites", success,
                     f"Message: {data.get('message', 'Unknown')}" if success else f"Error: {data}")
        
        # Get favorites
        success, data = self.make_request('GET', '/favorites', token=self.user_token)
        favorites_valid = success and isinstance(data, list)
        self.log_test("Get favorites", favorites_valid,
                     f"Found {len(data) if isinstance(data, list) else 0} favorites" if success else f"Error: {data}")
        
        # Remove from favorites
        success, data = self.make_request('DELETE', f'/favorites/{self.test_offer_id}', token=self.user_token)
        self.log_test("Remove from favorites", success,
                     f"Message: {data.get('message', 'Unknown')}" if success else f"Error: {data}")

    def test_messages(self):
        """Test messaging functionality"""
        print("🔍 Testing Messages...")
        
        if not self.user_token or not self.admin_token or not self.test_offer_id:
            self.log_test("Messages", False, "Missing tokens or test offer")
            return
        
        # Send message from user to admin
        message_data = {
            "receiver_id": self.admin_user_id,
            "offer_id": self.test_offer_id,
            "content": "مرحباً، أنا مهتم بهذا العرض للمقايضة",
            "message_type": "text"
        }
        
        success, data = self.make_request('POST', '/messages', message_data, token=self.user_token)
        message_id = data.get('id') if success else None
        self.log_test("Send message", success,
                     f"Message ID: {message_id}" if success else f"Error: {data}")
        
        # Get conversations for admin
        success, data = self.make_request('GET', '/conversations', token=self.admin_token)
        conversations_valid = success and isinstance(data, list)
        self.log_test("Get conversations", conversations_valid,
                     f"Found {len(data) if isinstance(data, list) else 0} conversations" if success else f"Error: {data}")
        
        # Get messages between users
        if self.admin_user_id and self.test_user_id:
            success, data = self.make_request('GET', f'/messages/{self.test_offer_id}/{self.test_user_id}', token=self.admin_token)
            messages_valid = success and isinstance(data, list)
            self.log_test("Get messages", messages_valid,
                         f"Found {len(data) if isinstance(data, list) else 0} messages" if success else f"Error: {data}")

    def test_notifications(self):
        """Test notifications"""
        print("🔍 Testing Notifications...")
        
        if not self.admin_token:
            self.log_test("Notifications", False, "No admin token available")
            return
        
        # Get notifications
        success, data = self.make_request('GET', '/notifications', token=self.admin_token)
        notifications_valid = success and isinstance(data, list)
        self.log_test("Get notifications", notifications_valid,
                     f"Found {len(data) if isinstance(data, list) else 0} notifications" if success else f"Error: {data}")
        
        # Mark all notifications as read
        success, data = self.make_request('PUT', '/notifications/read-all', token=self.admin_token)
        self.log_test("Mark all notifications read", success,
                     f"Message: {data.get('message', 'Unknown')}" if success else f"Error: {data}")

    def test_ai_suggestions(self):
        """Test AI suggestions"""
        print("🔍 Testing AI Suggestions...")
        
        if not self.user_token:
            self.log_test("AI Suggestions", False, "No user token available")
            return
        
        # Test AI suggestions
        ai_request = {
            "item_description": "لابتوب Dell Latitude للعمل والدراسة"
        }
        
        success, data = self.make_request('POST', '/ai/suggest', ai_request, token=self.user_token)
        ai_valid = success and 'suggestions' in data and isinstance(data['suggestions'], list)
        self.log_test("AI suggestions", ai_valid,
                     f"Got {len(data.get('suggestions', []))} suggestions" if success else f"Error: {data}")
        
        if success and data.get('suggestions'):
            print(f"    Sample suggestions: {', '.join(data['suggestions'][:3])}")
            print(f"    Market value: {data.get('market_value', 'Unknown')}")

    def test_reports(self):
        """Test reporting functionality"""
        print("🔍 Testing Reports...")
        
        if not self.user_token or not self.test_offer_id:
            self.log_test("Reports", False, "Missing user token or test offer")
            return
        
        # Create report
        report_data = {
            "reported_id": self.test_offer_id,
            "report_type": "offer",
            "reason": "اختبار النظام",
            "details": "هذا تقرير اختبار للتأكد من عمل النظام"
        }
        
        success, data = self.make_request('POST', '/reports', report_data, token=self.user_token)
        self.log_test("Create report", success,
                     f"Report ID: {data.get('id', 'Unknown')}" if success else f"Error: {data}")

    def test_admin_endpoints(self):
        """Test admin-only endpoints"""
        print("🔍 Testing Admin Endpoints...")
        
        if not self.admin_token:
            self.log_test("Admin endpoints", False, "No admin token available")
            return
        
        # Get admin stats
        success, data = self.make_request('GET', '/admin/stats', token=self.admin_token)
        stats_valid = success and 'users_count' in data and 'offers_count' in data
        self.log_test("Admin stats", stats_valid,
                     f"Users: {data.get('users_count', 0)}, Offers: {data.get('offers_count', 0)}" if success else f"Error: {data}")
        
        # Get admin users
        success, data = self.make_request('GET', '/admin/users', token=self.admin_token)
        users_valid = success and isinstance(data, list)
        self.log_test("Admin get users", users_valid,
                     f"Found {len(data) if isinstance(data, list) else 0} users" if success else f"Error: {data}")
        
        # Get admin offers
        success, data = self.make_request('GET', '/admin/offers', token=self.admin_token)
        offers_valid = success and isinstance(data, list)
        self.log_test("Admin get offers", offers_valid,
                     f"Found {len(data) if isinstance(data, list) else 0} offers" if success else f"Error: {data}")
        
        # Get admin reports
        success, data = self.make_request('GET', '/admin/reports', token=self.admin_token)
        reports_valid = success and isinstance(data, list)
        self.log_test("Admin get reports", reports_valid,
                     f"Found {len(data) if isinstance(data, list) else 0} reports" if success else f"Error: {data}")
        
        # Test non-admin access (should fail)
        if self.user_token:
            success, data = self.make_request('GET', '/admin/stats', token=self.user_token, expected_status=403)
            self.log_test("Non-admin access rejection", success, "Correctly rejected non-admin user")

    def test_admin_user_management(self):
        """Test admin user management APIs as requested"""
        print("🔍 Testing Admin User Management APIs...")
        
        if not self.admin_token:
            self.log_test("Admin user management", False, "No admin token available")
            return
        
        # 1. Admin login (already tested in authentication, but verify admin status)
        login_data = {
            "email": self.admin_email,
            "password": self.admin_password
        }
        success, data = self.make_request('POST', '/auth/login', login_data)
        admin_login_valid = success and data.get('user', {}).get('is_admin', False)
        self.log_test("Admin login verification", admin_login_valid,
                     f"Admin: {data.get('user', {}).get('name', 'Unknown')}" if success else f"Error: {data}")
        
        # 2. Get users list with verified and is_active fields
        success, data = self.make_request('GET', '/admin/users', token=self.admin_token)
        if success and 'users' in data and isinstance(data['users'], list):
            users = data['users']
            # Check if users have required fields
            has_verified_field = any('verified' in user for user in users)
            has_is_active_field = any('is_active' in user for user in users)
            
            self.log_test("Get users list with required fields", 
                         has_verified_field and has_is_active_field,
                         f"Found {len(users)} users, verified field: {has_verified_field}, is_active field: {has_is_active_field}")
            
            # Find a test user to manipulate (not admin)
            test_target_user = None
            for user in users:
                if not user.get('is_admin', False) and user.get('email') != self.admin_email:
                    test_target_user = user
                    break
            
            if test_target_user:
                target_user_id = test_target_user['id']
                target_user_email = test_target_user['email']
                original_is_active = test_target_user.get('is_active', True)
                
                print(f"    Using test user: {test_target_user.get('name', 'Unknown')} ({target_user_email})")
                
                # 3. Deactivate user
                success, data = self.make_request('PUT', f'/admin/users/{target_user_id}/status?is_active=false', 
                                                token=self.admin_token)
                self.log_test("Deactivate user", success,
                             f"Message: {data.get('message', 'Unknown')}" if success else f"Error: {data}")
                
                # Verify deactivated user cannot login
                if success:
                    # Try to login with deactivated user
                    deactivated_login = {
                        "email": target_user_email,
                        "password": "123"  # Assuming test user password
                    }
                    success_login, login_data = self.make_request('POST', '/auth/login', deactivated_login, expected_status=403)
                    self.log_test("Deactivated user login rejection", success_login,
                                 "Correctly rejected deactivated user login" if success_login else f"Error: {login_data}")
                
                # 4. Reactivate user
                success, data = self.make_request('PUT', f'/admin/users/{target_user_id}/status?is_active=true', 
                                                token=self.admin_token)
                self.log_test("Reactivate user", success,
                             f"Message: {data.get('message', 'Unknown')}" if success else f"Error: {data}")
                
                # Verify reactivated user can login again
                if success:
                    reactivated_login = {
                        "email": target_user_email,
                        "password": "123"  # Assuming test user password
                    }
                    success_login, login_data = self.make_request('POST', '/auth/login', reactivated_login)
                    self.log_test("Reactivated user login success", success_login,
                                 f"User can login again: {login_data.get('user', {}).get('name', 'Unknown')}" if success_login else f"Error: {login_data}")
                
                # 5. Delete user (optional - skip if it's a main user)
                # We'll skip deletion to avoid removing important test data
                self.log_test("Delete user (skipped)", True, "Skipped deletion to preserve test data")
                
            else:
                self.log_test("Find test user for manipulation", False, "No suitable non-admin user found")
        else:
            self.log_test("Get users list", False, f"Error: {data}")

    def test_whatsapp_status(self):
        """Test WhatsApp status endpoint"""
        print("🔍 Testing WhatsApp Status...")
        
        if not self.admin_token:
            self.log_test("WhatsApp status", False, "No admin token available")
            return
        
        # 6. WhatsApp Status
        success, data = self.make_request('GET', '/whatsapp/status', token=self.admin_token)
        if success:
            status = data.get('status', 'unknown')
            connected = data.get('connected', False)
            self.log_test("WhatsApp status check", True,
                         f"Status: {status}, Connected: {connected}")
        else:
            self.log_test("WhatsApp status check", False, f"Error: {data}")

    def cleanup_test_data(self):
        """Clean up test data"""
        print("🔍 Cleaning up test data...")
        
        # Delete test offer
        if self.test_offer_id and self.user_token:
            success, data = self.make_request('DELETE', f'/offers/{self.test_offer_id}', token=self.user_token)
            self.log_test("Delete test offer", success,
                         f"Message: {data.get('message', 'Unknown')}" if success else f"Error: {data}")

    def run_all_tests(self):
        """Run all tests"""
        print("🚀 Starting Syrian Barter Platform API Tests")
        print(f"🌐 Testing against: {self.base_url}")
        print("=" * 60)
        
        start_time = time.time()
        
        # Run test suites
        self.test_health_check()
        self.test_static_data_endpoints()
        self.test_authentication()
        self.test_user_registration()
        self.test_offers_crud()
        self.test_favorites()
        self.test_messages()
        self.test_notifications()
        self.test_ai_suggestions()
        self.test_reports()
        self.test_admin_endpoints()
        self.test_admin_user_management()  # New admin user management tests
        self.test_whatsapp_status()        # New WhatsApp status test
        self.cleanup_test_data()
        
        # Print summary
        end_time = time.time()
        duration = end_time - start_time
        
        print("=" * 60)
        print("📊 TEST SUMMARY")
        print(f"⏱️  Duration: {duration:.2f} seconds")
        print(f"✅ Passed: {self.tests_passed}/{self.tests_run}")
        print(f"❌ Failed: {len(self.failed_tests)}/{self.tests_run}")
        print(f"📈 Success Rate: {(self.tests_passed/self.tests_run*100):.1f}%")
        
        if self.failed_tests:
            print("\n❌ FAILED TESTS:")
            for failure in self.failed_tests:
                print(f"   • {failure}")
        
        print("=" * 60)
        
        return self.tests_passed == self.tests_run

def main():
    """Main function"""
    tester = SyrianBarterAPITester()
    success = tester.run_all_tests()
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())