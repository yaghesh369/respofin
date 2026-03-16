from django.contrib.auth.models import User
from rest_framework import status
from rest_framework.test import APITestCase

from customers.models import Customer
from notifications.models import Notification
from recommendations.models import Recommendation


class CustomerDeleteAllViewTests(APITestCase):
	def setUp(self):
		self.user = User.objects.create_user(username="owner", password="pass1234")
		self.other_user = User.objects.create_user(username="other", password="pass1234")
		self.client.force_authenticate(user=self.user)

	def test_delete_all_returns_only_customer_count(self):
		customers = []
		for idx in range(3):
			customer = Customer.objects.create(
				owner=self.user,
				name=f"User Customer {idx}",
				email=f"user{idx}@example.com",
				is_active=True,
				segment_label=idx,
			)
			customers.append(customer)

		for customer in customers:
			Notification.objects.create(
				customer=customer,
				subject="Hello",
				message="Test notification",
				status="draft",
			)
			Recommendation.objects.create(
				customer=customer,
				segment_label=customer.segment_label,
				recommended_products=["Card", "Loan"],
			)

		Customer.objects.create(
			owner=self.other_user,
			name="Other Customer",
			email="other@example.com",
			is_active=True,
		)

		response = self.client.delete("/api/customers/delete-all/")

		self.assertEqual(response.status_code, status.HTTP_200_OK)
		self.assertEqual(response.data["deleted"], 3)
		self.assertEqual(Customer.objects.filter(owner=self.user).count(), 0)
		self.assertEqual(Customer.objects.filter(owner=self.other_user).count(), 1)
		self.assertEqual(Notification.objects.filter(customer__owner=self.user).count(), 0)
		self.assertEqual(Recommendation.objects.filter(customer__owner=self.user).count(), 0)
