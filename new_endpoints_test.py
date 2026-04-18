#!/usr/bin/env python3
"""
AI Power Lab NEW Backend Endpoints Testing Suite
Testing NEW endpoints specifically mentioned in review_request
"""

import requests
import json
import sys
import time
from datetime import datetime

# Test configuration
BACKEND_URL = "https://ai-power-lab.onrender.com"
ADMIN_EMAIL = "admin@aipowerlab.com"
ADMIN_PASSWORD = "admin123"

class NewEndpointsTester:
    def __init__(self):
        self.session = requests.Session()
        self.test_results = []
        self.admin_logged_in = False
        
    def log_result(self, test_name, success, message="", response_data=None):
        """Log test result"""
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status} {test_name}: {message}")
        self.test_results.append({
            "test": test_name,
            "success": success,
            "message": message,
            "response_data": response_data
        })
        
    def login_admin(self):
        """Login with admin credentials"""
        print("\n=== ADMIN LOGIN ===")
        try:
            login_data = {
                "email": ADMIN_EMAIL,
                "password": ADMIN_PASSWORD
            }
            response = self.session.post(f"{BACKEND_URL}/auth/login", json=login_data)
            if response.status_code == 200:
                self.admin_logged_in = True
                self.log_result("Admin Login", True, "Successfully logged in as admin")
                return True
            else:
                self.log_result("Admin Login", False, f"Status: {response.status_code}, Response: {response.text}")
                return False
        except Exception as e:
            self.log_result("Admin Login", False, f"Exception: {str(e)}")
            return False
    
    def test_subscription_plans_new(self):
        """Test NEW subscription plans endpoint - should return 4 plans"""
        print("\n=== 1. NEW SUBSCRIPTION PLANS (4 plans) ===")
        
        try:
            response = self.session.get(f"{BACKEND_URL}/subscription/plans")
            if response.status_code == 200:
                plans_data = response.json()
                print(f"Raw response: {json.dumps(plans_data, indent=2)}")
                
                # Check if we have 4 plans: monthly, quarterly, half_yearly, yearly
                expected_plans = {
                    "monthly": 299,
                    "quarterly": 799, 
                    "half_yearly": 1499,
                    "yearly": 2499
                }
                
                if isinstance(plans_data, dict) and "plans" in plans_data:
                    plans = plans_data["plans"]
                    found_plans = {}
                    
                    for plan_name, expected_price in expected_plans.items():
                        if plan_name in plans:
                            actual_price = plans[plan_name].get("price_inr", 0)
                            found_plans[plan_name] = actual_price
                            if actual_price == expected_price:
                                self.log_result(f"Plan {plan_name}", True, f"₹{actual_price} (correct)")
                            else:
                                self.log_result(f"Plan {plan_name}", False, f"₹{actual_price} (expected ₹{expected_price})")
                        else:
                            self.log_result(f"Plan {plan_name}", False, "Plan not found")
                    
                    if len(found_plans) == 4:
                        self.log_result("GET /api/subscription/plans", True, f"All 4 plans found: {found_plans}")
                    else:
                        self.log_result("GET /api/subscription/plans", False, f"Expected 4 plans, found {len(found_plans)}: {found_plans}")
                else:
                    self.log_result("GET /api/subscription/plans", False, f"Invalid response structure: {plans_data}")
            else:
                self.log_result("GET /api/subscription/plans", False, f"Status: {response.status_code}, Response: {response.text}")
        except Exception as e:
            self.log_result("GET /api/subscription/plans", False, f"Exception: {str(e)}")
    
    def test_notifications(self):
        """Test NEW notifications endpoints"""
        print("\n=== 2. NEW NOTIFICATIONS ===")
        
        if not self.admin_logged_in:
            self.log_result("Notifications Test", False, "Admin not logged in")
            return
            
        # GET /api/notifications (auth required)
        try:
            response = self.session.get(f"{BACKEND_URL}/notifications")
            if response.status_code == 200:
                notifications_data = response.json()
                print(f"Notifications response: {json.dumps(notifications_data, indent=2)}")
                
                # Should return notifications list and unread_count
                if isinstance(notifications_data, dict):
                    if "notifications" in notifications_data and "unread_count" in notifications_data:
                        notifications = notifications_data["notifications"]
                        unread_count = notifications_data["unread_count"]
                        self.log_result("GET /api/notifications", True, f"Found {len(notifications)} notifications, {unread_count} unread")
                    else:
                        self.log_result("GET /api/notifications", False, f"Missing required fields. Got: {list(notifications_data.keys())}")
                else:
                    self.log_result("GET /api/notifications", False, f"Invalid response type: {type(notifications_data)}")
            else:
                self.log_result("GET /api/notifications", False, f"Status: {response.status_code}, Response: {response.text}")
        except Exception as e:
            self.log_result("GET /api/notifications", False, f"Exception: {str(e)}")
            
        # PUT /api/notifications/read-all (auth required)
        try:
            response = self.session.put(f"{BACKEND_URL}/notifications/read-all")
            if response.status_code in [200, 204]:
                self.log_result("PUT /api/notifications/read-all", True, f"Status: {response.status_code}")
            else:
                self.log_result("PUT /api/notifications/read-all", False, f"Status: {response.status_code}, Response: {response.text}")
        except Exception as e:
            self.log_result("PUT /api/notifications/read-all", False, f"Exception: {str(e)}")
    
    def test_search(self):
        """Test NEW search endpoints"""
        print("\n=== 3. NEW SEARCH ===")
        
        # GET /api/search?q=blog - should return tools, products, ebooks matching "blog"
        try:
            response = self.session.get(f"{BACKEND_URL}/search?q=blog")
            if response.status_code == 200:
                search_data = response.json()
                print(f"Search 'blog' response: {json.dumps(search_data, indent=2)}")
                
                # Should return tools, products, ebooks
                expected_categories = ["tools", "products", "ebooks"]
                found_categories = []
                
                if isinstance(search_data, dict):
                    for category in expected_categories:
                        if category in search_data:
                            found_categories.append(category)
                            items = search_data[category]
                            self.log_result(f"Search 'blog' - {category}", True, f"Found {len(items)} {category}")
                        else:
                            self.log_result(f"Search 'blog' - {category}", False, f"Category {category} not found")
                    
                    if len(found_categories) >= 1:  # At least one category should be found
                        self.log_result("GET /api/search?q=blog", True, f"Search working, found categories: {found_categories}")
                    else:
                        self.log_result("GET /api/search?q=blog", False, f"No expected categories found: {list(search_data.keys())}")
                else:
                    self.log_result("GET /api/search?q=blog", False, f"Invalid response type: {type(search_data)}")
            else:
                self.log_result("GET /api/search?q=blog", False, f"Status: {response.status_code}, Response: {response.text}")
        except Exception as e:
            self.log_result("GET /api/search?q=blog", False, f"Exception: {str(e)}")
            
        # GET /api/search?q=business - should find AI Business Generator tool
        try:
            response = self.session.get(f"{BACKEND_URL}/search?q=business")
            if response.status_code == 200:
                search_data = response.json()
                print(f"Search 'business' response: {json.dumps(search_data, indent=2)}")
                
                # Should find AI Business Generator tool
                business_tool_found = False
                if isinstance(search_data, dict) and "tools" in search_data:
                    tools = search_data["tools"]
                    for tool in tools:
                        if "business" in tool.get("name", "").lower() or "business" in tool.get("id", "").lower():
                            business_tool_found = True
                            self.log_result("Search 'business' - AI Business Generator", True, f"Found: {tool.get('name', tool.get('id'))}")
                            break
                
                if business_tool_found:
                    self.log_result("GET /api/search?q=business", True, "AI Business Generator tool found")
                else:
                    self.log_result("GET /api/search?q=business", False, "AI Business Generator tool not found in search results")
            else:
                self.log_result("GET /api/search?q=business", False, f"Status: {response.status_code}, Response: {response.text}")
        except Exception as e:
            self.log_result("GET /api/search?q=business", False, f"Exception: {str(e)}")
    
    def test_enhanced_dashboard(self):
        """Test NEW enhanced dashboard endpoint"""
        print("\n=== 4. NEW ENHANCED DASHBOARD ===")
        
        if not self.admin_logged_in:
            self.log_result("Enhanced Dashboard Test", False, "Admin not logged in")
            return
            
        # GET /api/dashboard/full (auth required)
        try:
            response = self.session.get(f"{BACKEND_URL}/dashboard/full")
            if response.status_code == 200:
                dashboard_data = response.json()
                print(f"Enhanced dashboard response: {json.dumps(dashboard_data, indent=2)}")
                
                # Should return: total_uses, wallet_balance, my_purchases, my_products, my_ebooks, unread_notifications, recent_payments
                expected_fields = [
                    "total_uses", 
                    "wallet_balance", 
                    "my_purchases", 
                    "my_products", 
                    "my_ebooks", 
                    "unread_notifications", 
                    "recent_payments"
                ]
                
                found_fields = []
                missing_fields = []
                
                for field in expected_fields:
                    if field in dashboard_data:
                        found_fields.append(field)
                        self.log_result(f"Dashboard field '{field}'", True, f"Value: {dashboard_data[field]}")
                    else:
                        missing_fields.append(field)
                        self.log_result(f"Dashboard field '{field}'", False, "Field missing")
                
                if len(missing_fields) == 0:
                    self.log_result("GET /api/dashboard/full", True, f"All required fields present: {found_fields}")
                else:
                    self.log_result("GET /api/dashboard/full", False, f"Missing fields: {missing_fields}")
            else:
                self.log_result("GET /api/dashboard/full", False, f"Status: {response.status_code}, Response: {response.text}")
        except Exception as e:
            self.log_result("GET /api/dashboard/full", False, f"Exception: {str(e)}")
    
    def test_admin_analytics(self):
        """Test NEW admin analytics endpoint"""
        print("\n=== 5. NEW ADMIN ANALYTICS ===")
        
        if not self.admin_logged_in:
            self.log_result("Admin Analytics Test", False, "Admin not logged in")
            return
            
        # GET /api/admin/analytics (admin auth required)
        try:
            response = self.session.get(f"{BACKEND_URL}/admin/analytics")
            if response.status_code == 200:
                analytics_data = response.json()
                print(f"Admin analytics response: {json.dumps(analytics_data, indent=2)}")
                
                # Should return: total_users, premium_users, free_users, new_users_week, total_revenue, sub_revenue, wallet_revenue, top_tools, category_usage, marketplace_sales
                expected_fields = [
                    "total_users",
                    "premium_users", 
                    "free_users",
                    "new_users_week",
                    "total_revenue",
                    "sub_revenue",
                    "wallet_revenue",
                    "top_tools",
                    "category_usage",
                    "marketplace_sales"
                ]
                
                found_fields = []
                missing_fields = []
                
                for field in expected_fields:
                    if field in analytics_data:
                        found_fields.append(field)
                        value = analytics_data[field]
                        if isinstance(value, (list, dict)):
                            self.log_result(f"Analytics field '{field}'", True, f"Type: {type(value).__name__}, Length: {len(value)}")
                        else:
                            self.log_result(f"Analytics field '{field}'", True, f"Value: {value}")
                    else:
                        missing_fields.append(field)
                        self.log_result(f"Analytics field '{field}'", False, "Field missing")
                
                if len(missing_fields) == 0:
                    self.log_result("GET /api/admin/analytics", True, f"All required fields present: {found_fields}")
                else:
                    self.log_result("GET /api/admin/analytics", False, f"Missing fields: {missing_fields}")
            else:
                self.log_result("GET /api/admin/analytics", False, f"Status: {response.status_code}, Response: {response.text}")
        except Exception as e:
            self.log_result("GET /api/admin/analytics", False, f"Exception: {str(e)}")
    
    def run_all_tests(self):
        """Run all NEW endpoint tests"""
        print("🚀 Starting AI Power Lab NEW Backend Endpoints Testing...")
        print(f"🔗 Base URL: {BACKEND_URL}")
        print(f"👤 Admin: {ADMIN_EMAIL}")
        
        # Login first
        if not self.login_admin():
            print("❌ Cannot proceed without admin login")
            return 0, 1
        
        # Run NEW endpoint tests
        self.test_subscription_plans_new()
        self.test_notifications()
        self.test_search()
        self.test_enhanced_dashboard()
        self.test_admin_analytics()
        
        # Summary
        print("\n" + "="*60)
        print("📊 NEW ENDPOINTS TEST SUMMARY")
        print("="*60)
        
        passed = sum(1 for result in self.test_results if result["success"])
        total = len(self.test_results)
        
        print(f"✅ PASSED: {passed}/{total} tests")
        print(f"❌ FAILED: {total - passed}/{total} tests")
        
        if total - passed > 0:
            print("\n🔍 FAILED TESTS:")
            for result in self.test_results:
                if not result["success"]:
                    print(f"   ❌ {result['test']}: {result['message']}")
        
        print(f"\n🎯 Success Rate: {(passed/total)*100:.1f}%")
        
        return passed, total

if __name__ == "__main__":
    tester = NewEndpointsTester()
    passed, total = tester.run_all_tests()
    
    # Exit with appropriate code
    sys.exit(0 if passed == total else 1)