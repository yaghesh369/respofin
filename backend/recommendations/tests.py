from django.contrib.auth.models import User
from django.test import TestCase
from rest_framework import status
from rest_framework.test import APITestCase

from customers.models import Customer
from notifications.models import Notification
from recommendations.models import Recommendation
from recommendations.services import generate_recommendation


class RecommendationServiceTests(TestCase):
	def setUp(self):
		self.user = User.objects.create_user(username="owner", password="pass1234")

	def test_generate_recommendation_excludes_active_product_family(self):
		customer = Customer.objects.create(
			owner=self.user,
			name="Family Match Customer",
			email="family.match@example.com",
			age=29,
			income=850000,
			credit_score=710,
			active_product="Premium Savings",
			segment_label=0,
			is_active=True,
		)

		recommendation = generate_recommendation(customer)

		self.assertEqual(recommendation.recommended_products, ["Debit Card"])

	def test_generate_recommendation_replaces_stale_segment_rows(self):
		customer = Customer.objects.create(
			owner=self.user,
			name="Segment Shift Customer",
			email="segment.shift@example.com",
			age=34,
			income=1300000,
			credit_score=760,
			active_product="Premium Savings",
			segment_label=0,
			is_active=True,
		)

		first_recommendation = generate_recommendation(customer)
		self.assertEqual(first_recommendation.recommended_products, ["Debit Card"])

		customer.segment_label = 1
		customer.save(update_fields=["segment_label"])

		second_recommendation = generate_recommendation(customer)

		self.assertEqual(second_recommendation.recommended_products, ["Credit Card"])

		recommendations = Recommendation.objects.filter(customer=customer)
		self.assertEqual(recommendations.count(), 1)
		self.assertEqual(recommendations.get().segment_label, 1)


class RecommendationListViewTests(APITestCase):
	def setUp(self):
		self.user = User.objects.create_user(username="owner_api", password="pass1234")
		self.client.force_authenticate(user=self.user)

	def test_list_returns_latest_recommendation_per_customer(self):
		customer = Customer.objects.create(
			owner=self.user,
			name="Latest Only Customer",
			email="latest.only@example.com",
			age=31,
			income=960000,
			credit_score=735,
			active_product="Premium Savings",
			segment_label=1,
			is_active=True,
		)

		Recommendation.objects.create(
			customer=customer,
			segment_label=0,
			recommended_products=["Savings Account", "Debit Card"],
		)
		Recommendation.objects.create(
			customer=customer,
			segment_label=1,
			recommended_products=["Credit Card"],
		)

		response = self.client.get("/api/recommendations/list/")

		self.assertEqual(response.status_code, status.HTTP_200_OK)
		self.assertEqual(len(response.data), 1)
		self.assertEqual(response.data[0]["recommended_products"], ["Credit Card"])

	def test_list_sanitizes_same_family_products_from_saved_rows(self):
		customer = Customer.objects.create(
			owner=self.user,
			name="Sanitized List Customer",
			email="sanitized.list@example.com",
			age=28,
			income=780000,
			credit_score=702,
			active_product="Senior Savings Plus",
			segment_label=0,
			is_active=True,
		)

		Recommendation.objects.create(
			customer=customer,
			segment_label=0,
			recommended_products=["Savings Account", "Debit Card"],
		)

		response = self.client.get("/api/recommendations/list/")

		self.assertEqual(response.status_code, status.HTTP_200_OK)
		self.assertEqual(len(response.data), 1)
		self.assertEqual(response.data[0]["recommended_products"], ["Debit Card"])


class RecommendationAutoSegmentationViewTests(APITestCase):
	def setUp(self):
		self.user = User.objects.create_user(username="owner_auto", password="pass1234")
		self.client.force_authenticate(user=self.user)

	def _create_ready_customers(self):
		return [
			Customer.objects.create(
				owner=self.user,
				name="Auto Segment One",
				email="auto.segment.one@example.com",
				age=24,
				income=320000,
				credit_score=560,
				active_product="Basic Savings",
				is_active=True,
			),
			Customer.objects.create(
				owner=self.user,
				name="Auto Segment Two",
				email="auto.segment.two@example.com",
				age=33,
				income=980000,
				credit_score=705,
				active_product="Credit Card Silver",
				is_active=True,
			),
			Customer.objects.create(
				owner=self.user,
				name="Auto Segment Three",
				email="auto.segment.three@example.com",
				age=51,
				income=2550000,
				credit_score=835,
				active_product="Fixed Deposit",
				is_active=True,
			),
		]

	def test_recommend_all_auto_segments_and_generates_drafts(self):
		customers = self._create_ready_customers()

		response = self.client.post("/api/recommendations/all/", format="json")

		self.assertEqual(response.status_code, status.HTTP_200_OK)
		self.assertTrue(response.data["auto_segmented"])
		self.assertEqual(response.data["recommended"], len(customers))

		for customer in customers:
			customer.refresh_from_db()
			self.assertIsNotNone(customer.segment_label)

		self.assertEqual(
			Recommendation.objects.filter(customer__owner=self.user).count(),
			len(customers),
		)
		self.assertEqual(
			Notification.objects.filter(customer__owner=self.user, status="draft").count(),
			len(customers),
		)

	def test_recommend_single_auto_segments_customer(self):
		customers = self._create_ready_customers()
		target = customers[0]

		response = self.client.post(f"/api/recommendations/customer/{target.id}/", format="json")

		self.assertEqual(response.status_code, status.HTTP_200_OK)
		self.assertTrue(response.data["auto_segmented"])
		target.refresh_from_db()
		self.assertIsNotNone(target.segment_label)
		self.assertEqual(
			Recommendation.objects.filter(customer=target).count(),
			1,
		)
