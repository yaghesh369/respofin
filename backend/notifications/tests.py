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


class SendDraftsViewTests(APITestCase):
	def setUp(self):
		self.user = User.objects.create_user(username="owner_send", password="pass1234")
		self.other_user = User.objects.create_user(username="other_send", password="pass1234")
		self.client.force_authenticate(user=self.user)

		self.customer = Customer.objects.create(
			owner=self.user,
			name="Owner Customer",
			email="owner.customer@example.com",
			age=31,
			income=980000,
			credit_score=730,
			active_product="Savings Account",
			is_active=True,
		)
		self.other_customer = Customer.objects.create(
			owner=self.other_user,
			name="Other Customer",
			email="other.customer@example.com",
			age=31,
			income=980000,
			credit_score=730,
			active_product="Savings Account",
			is_active=True,
		)

		self.draft_one = Notification.objects.create(
			customer=self.customer,
			subject="Draft one",
			message="Draft message one",
			status="draft",
		)
		self.draft_two = Notification.objects.create(
			customer=self.customer,
			subject="Draft two",
			message="Draft message two",
			status="draft",
		)
		self.other_draft = Notification.objects.create(
			customer=self.other_customer,
			subject="Other draft",
			message="Other draft message",
			status="draft",
		)
		self.sent_notification = Notification.objects.create(
			customer=self.customer,
			subject="Already sent",
			message="Sent message",
			status="sent",
			sent_at=now(),
		)

	@patch("notifications.views.send_notifications_batch")
	def test_send_all_drafts_returns_counts(self, mock_send_notifications_batch):
		mock_send_notifications_batch.return_value = {
			"sent": 2,
			"failed": 0,
		}

		response = self.client.post("/api/notifications/send-all/", {}, format="json")

		self.assertEqual(response.status_code, status.HTTP_200_OK)
		self.assertEqual(response.data["total"], 2)
		self.assertEqual(response.data["sent"], 2)
		self.assertEqual(response.data["failed"], 0)

		mock_send_notifications_batch.assert_called_once()
		sent_notifications, sent_user = mock_send_notifications_batch.call_args[0]
		self.assertEqual(sent_user, self.user)
		self.assertEqual({n.id for n in sent_notifications}, {self.draft_one.id, self.draft_two.id})

	@patch("notifications.views.send_notifications_batch")
	def test_send_selected_drafts_filters_and_reports_skipped(self, mock_send_notifications_batch):
		mock_send_notifications_batch.return_value = {
			"sent": 1,
			"failed": 1,
		}

		response = self.client.post(
			"/api/notifications/send-all/",
			{
				"notification_ids": [
					self.draft_one.id,
					self.draft_two.id,
					self.other_draft.id,
					999999,
					self.draft_one.id,
				]
			},
			format="json",
		)

		self.assertEqual(response.status_code, status.HTTP_200_OK)
		self.assertEqual(response.data["requested"], 4)
		self.assertEqual(response.data["total"], 2)
		self.assertEqual(response.data["sent"], 1)
		self.assertEqual(response.data["failed"], 1)
		self.assertEqual(response.data["skipped"], 2)

		mock_send_notifications_batch.assert_called_once()
		sent_notifications, _ = mock_send_notifications_batch.call_args[0]
		self.assertEqual({n.id for n in sent_notifications}, {self.draft_one.id, self.draft_two.id})

	@patch("notifications.views.send_notifications_batch")
	def test_send_selected_includes_stop_reason_metadata(self, mock_send_notifications_batch):
		mock_send_notifications_batch.return_value = {
			"sent": 0,
			"failed": 2,
			"stop_reason": "provider_sending_limit",
			"stop_message": "Daily user sending limit exceeded",
		}

		response = self.client.post(
			"/api/notifications/send-all/",
			{"notification_ids": [self.draft_one.id, self.draft_two.id]},
			format="json",
		)

		self.assertEqual(response.status_code, status.HTTP_200_OK)
		self.assertEqual(response.data["stop_reason"], "provider_sending_limit")
		self.assertIn("Daily user sending limit exceeded", response.data["stop_message"])

	def test_send_selected_requires_list(self):
		response = self.client.post(
			"/api/notifications/send-all/",
			{"notification_ids": "invalid"},
			format="json",
		)

		self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
		self.assertEqual(response.data["error"], "notification_ids must be a list")
