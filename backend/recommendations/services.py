from .models import Recommendation
from customers.models import Customer
from notifications.models import Notification
from notifications.composer import compose_recommendation_email

# Segment → product mapping
SEGMENT_PRODUCT_MAP = {
    0: ["Savings Account", "Debit Card"],
    1: ["Credit Card"],
    2: ["Personal Loan", "Investment Plan"],
    3: ["Wealth Management", "Fixed Deposit"],
    4: ["Business Loan", "SME Account"],
    5: ["Retirement Plan", "Tax Saver FD"],
}

DEFAULT_PRODUCTS = ["Savings Account"]

def generate_recommendation(customer: Customer):
    if customer.segment_label is None:
        raise ValueError("Customer is not segmented")

    segment = customer.segment_label

    products = SEGMENT_PRODUCT_MAP.get(
        segment,
        DEFAULT_PRODUCTS
    ).copy()

    # Remove already active product
    if customer.active_product in products:
        products.remove(customer.active_product)

    if not products:
        products = DEFAULT_PRODUCTS.copy()

    recommendation, _ = Recommendation.objects.update_or_create(
        customer=customer,
        segment_label=segment,
        defaults={
            "recommended_products": products
        }
    )

    # Auto-create draft notification with recommendation email
    subject, message = compose_recommendation_email(customer, products)
    Notification.objects.update_or_create(
        customer=customer,
        status="draft",
        defaults={
            "subject": subject,
            "message": message,
        }
    )

    return recommendation
