from unittest.mock import patch

from django.contrib.auth.models import User
from django.utils.timezone import now
from rest_framework import status
from rest_framework.test import APITestCase

from customers.models import Customer
from notifications.models import Notification


class SentNotificationActionsTests(APITestCase):
	def setUp(self):
		self.user = User.objects.create_user(username="owner", password="pass1234")
		self.client.force_authenticate(user=self.user)

		self.customer = Customer.objects.create(
			owner=self.user,
			name="Test Customer",
			email="test.customer@example.com",
			age=31,
			income=980000,
			credit_score=730,
			active_product="Savings Account",
			is_active=True,
		)

		self.sent_notification = Notification.objects.create(
			customer=self.customer,
			subject="Old subject",
			message="Old message",
			status="sent",
			sent_at=now(),
		)

	def test_sent_list_includes_message(self):
		response = self.client.get("/api/notifications/sent/")

		self.assertEqual(response.status_code, status.HTTP_200_OK)
		self.assertGreaterEqual(len(response.data), 1)
		self.assertIn("message", response.data[0])

	def test_edit_sent_notification(self):
		response = self.client.patch(
			f"/api/notifications/sent/edit/{self.sent_notification.id}/",
			{
				"subject": "Updated subject",
				"message": "Updated message",
			},
			format="json",
		)

		self.assertEqual(response.status_code, status.HTTP_200_OK)
		self.sent_notification.refresh_from_db()
		self.assertEqual(self.sent_notification.subject, "Updated subject")
		self.assertEqual(self.sent_notification.message, "Updated message")

	@patch("notifications.views.send_notification")
	def test_resend_sent_notification(self, mock_send_notification):
		response = self.client.post(
			f"/api/notifications/sent/resend/{self.sent_notification.id}/",
			format="json",
		)

		self.assertEqual(response.status_code, status.HTTP_200_OK)
		mock_send_notification.assert_called_once()
		self.assertIn("status", response.data)
