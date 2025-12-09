"""Tests for health check endpoints."""

import unittest
from fastapi.testclient import TestClient

from ark_sessions.main import app


class TestHealthEndpoints(unittest.TestCase):
    """Test cases for health check endpoints."""
    
    def setUp(self):
        """Set up test client."""
        self.client = TestClient(app)
    
    def test_health_check_success(self):
        """Test successful health check."""
        response = self.client.get("/health")
        
        # Assert response
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["status"], "healthy")
        self.assertEqual(data["service"], "ark-sessions")

