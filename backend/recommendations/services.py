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
FALLBACK_PRODUCTS = ["Debit Card", "Investment Plan", "Fixed Deposit", "SME Account"]

PRODUCT_FAMILIES = {
    "credit card": {
        "credit card",
        "credit card silver",
        "credit card gold",
        "credit card platinum",
        "travel credit card",
    },
    "fixed deposit": {
        "fixed deposit",
        "premium fixed deposit",
        "tax saver fd",
    },
    "savings account": {
        "savings account",
        "basic savings",
        "premium savings",
        "digital savings",
        "salary account plus",
        "salary account premium",
        "family savings plan",
        "senior savings plus",
    },
    "wealth management": {
        "wealth management",
        "portfolio advisory",
    },
}


def _normalize_product_name(value):
    return " ".join(str(value or "").strip().lower().split())


def _canonical_product_name(value):
    normalized = _normalize_product_name(value)
    for canonical, family in PRODUCT_FAMILIES.items():
        if normalized in family:
            return canonical
    return normalized


def _exclude_active_product(products, active_product):
    active_key = _canonical_product_name(active_product)
    if not active_key:
        return list(products)

    return [
        product
        for product in products
        if _canonical_product_name(product) != active_key
    ]


def _fallback_products(active_product):
    fallback_products = _exclude_active_product(FALLBACK_PRODUCTS, active_product)
    return fallback_products[:2] if fallback_products else ["Investment Plan"]


def sanitize_products_for_customer(customer: Customer, products):
    sanitized_products = _exclude_active_product(products or [], customer.active_product)
    return sanitized_products if sanitized_products else _fallback_products(customer.active_product)


def _upsert_current_recommendation(customer: Customer, segment: int, products):
    existing_recommendations = list(
        Recommendation.objects.filter(customer=customer)
        .only("id", "segment_label", "recommended_products")
        .order_by("-created_at")
    )

    current_recommendation = None
    stale_recommendation_ids = []

    for recommendation in existing_recommendations:
        if recommendation.segment_label == segment and current_recommendation is None:
            current_recommendation = recommendation
            continue

        stale_recommendation_ids.append(recommendation.id)

    if current_recommendation:
        if current_recommendation.recommended_products != products:
            current_recommendation.recommended_products = products
            current_recommendation.save(update_fields=["recommended_products"])
        recommendation = current_recommendation
    else:
        recommendation = Recommendation.objects.create(
            customer=customer,
            segment_label=segment,
            recommended_products=products,
        )

    if stale_recommendation_ids:
        Recommendation.objects.filter(id__in=stale_recommendation_ids).delete()

    return recommendation


def _products_for_customer(customer: Customer):
    products = SEGMENT_PRODUCT_MAP.get(
        customer.segment_label,
        DEFAULT_PRODUCTS
    ).copy()
    return sanitize_products_for_customer(customer, products)

def generate_recommendation(customer: Customer):
    if customer.segment_label is None:
        raise ValueError("Customer is not segmented")

    segment = customer.segment_label
    products = _products_for_customer(customer)

    recommendation = _upsert_current_recommendation(customer, segment, products)

    # Auto-create draft notification with recommendation email
    subject, message = compose_recommendation_email(customer, products)
    all_drafts = list(
        Notification.objects
        .filter(customer=customer, status="draft")
        .only("id", "subject", "message")
        .order_by("-created_at")
    )
    latest_draft = all_drafts[0] if all_drafts else None
    duplicate_draft_ids = [d.id for d in all_drafts[1:]]

    if latest_draft:
        updated_fields = []
        if latest_draft.subject != subject:
            latest_draft.subject = subject
            updated_fields.append("subject")
        if latest_draft.message != message:
            latest_draft.message = message
            updated_fields.append("message")
        if updated_fields:
            latest_draft.save(update_fields=updated_fields)

        if duplicate_draft_ids:
            Notification.objects.filter(id__in=duplicate_draft_ids).delete()
    else:
        Notification.objects.create(
            customer=customer,
            status="draft",
            subject=subject,
            message=message,
        )

    return recommendation


def generate_recommendations_for_customers(customers):
    eligible_customers = [
        customer
        for customer in customers
        if customer.segment_label is not None
    ]

    if not eligible_customers:
        return {
            "failed": 0,
            "recommended": 0,
        }

    payload_by_customer_id = {}
    failed = 0

    for customer in eligible_customers:
        try:
            products = _products_for_customer(customer)
            subject, message = compose_recommendation_email(customer, products)
        except Exception:
            failed += 1
            continue

        payload_by_customer_id[customer.id] = {
            "customer": customer,
            "message": message,
            "products": products,
            "segment_label": customer.segment_label,
            "subject": subject,
        }

    if not payload_by_customer_id:
        return {
            "failed": failed,
            "recommended": 0,
        }

    customer_ids = list(payload_by_customer_id.keys())

    existing_recommendations = list(
        Recommendation.objects.filter(customer_id__in=customer_ids)
        .order_by("customer_id", "-created_at")
    )
    recommendations_by_customer_id = {}
    stale_recommendation_ids = []

    for recommendation in existing_recommendations:
        payload = payload_by_customer_id.get(recommendation.customer_id)
        if payload is None:
            continue

        if recommendation.customer_id in recommendations_by_customer_id:
            stale_recommendation_ids.append(recommendation.id)
            continue

        if recommendation.segment_label == payload["segment_label"]:
            recommendations_by_customer_id[recommendation.customer_id] = recommendation
        else:
            stale_recommendation_ids.append(recommendation.id)

    recommendations_to_create = []
    recommendations_to_update = []

    for customer_id, payload in payload_by_customer_id.items():
        existing = recommendations_by_customer_id.get(customer_id)

        if existing:
            if existing.recommended_products != payload["products"]:
                existing.recommended_products = payload["products"]
                recommendations_to_update.append(existing)
        else:
            recommendations_to_create.append(
                Recommendation(
                    customer=payload["customer"],
                    segment_label=payload["segment_label"],
                    recommended_products=payload["products"],
                )
            )

    if recommendations_to_update:
        Recommendation.objects.bulk_update(
            recommendations_to_update,
            ["recommended_products"],
            batch_size=500,
        )

    if recommendations_to_create:
        Recommendation.objects.bulk_create(
            recommendations_to_create,
            batch_size=500,
            ignore_conflicts=True,
        )

    if stale_recommendation_ids:
        Recommendation.objects.filter(id__in=stale_recommendation_ids).delete()

    draft_notifications = Notification.objects.filter(
        customer_id__in=customer_ids,
        status="draft",
    ).order_by("customer_id", "-created_at")

    latest_draft_by_customer_id = {}
    duplicate_draft_ids = []

    for draft in draft_notifications:
        if draft.customer_id in latest_draft_by_customer_id:
            duplicate_draft_ids.append(draft.id)
            continue

        latest_draft_by_customer_id[draft.customer_id] = draft

    drafts_to_create = []
    drafts_to_update = []

    for customer_id, payload in payload_by_customer_id.items():
        latest_draft = latest_draft_by_customer_id.get(customer_id)
        if latest_draft:
            has_changes = False
            if latest_draft.subject != payload["subject"]:
                latest_draft.subject = payload["subject"]
                has_changes = True
            if latest_draft.message != payload["message"]:
                latest_draft.message = payload["message"]
                has_changes = True

            if has_changes:
                drafts_to_update.append(latest_draft)
            continue

        drafts_to_create.append(
            Notification(
                customer=payload["customer"],
                status="draft",
                subject=payload["subject"],
                message=payload["message"],
            )
        )

    if drafts_to_update:
        Notification.objects.bulk_update(
            drafts_to_update,
            ["subject", "message"],
            batch_size=500,
        )

    if drafts_to_create:
        Notification.objects.bulk_create(drafts_to_create, batch_size=500)

    if duplicate_draft_ids:
        Notification.objects.filter(id__in=duplicate_draft_ids).delete()

    return {
        "failed": failed,
        "recommended": len(payload_by_customer_id),
    }
