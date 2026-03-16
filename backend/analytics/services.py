from django.db.models import Count, Q
from django.db.models.functions import TruncDate
from typing import Any, Dict, List

from customers.models import Customer
from recommendations.models import Recommendation
from notifications.models import Notification


def _serialize_timeline(qs) -> List[Dict[str, Any]]:
    return [
        {"date": item["date"].isoformat() if item.get("date") is not None else None, "count": item["count"]}
        for item in qs
    ]


def full_analytics(user, top_n: int = 10, include_timeline: bool = True) -> Dict[str, Any]:
    """Return aggregated analytics for a given user.

    Improvements over earlier implementation:
    - Reuses recommendation queryset to avoid duplicate DB hits.
    - Robustly handles different shapes for `recommended_products`.
    - Adds segment percentage when customer total is available.
    - Aggregates notification counts in a single query.
    - Limits `top_products` to `top_n`.
    """

    # Customers
    customer_counts = Customer.objects.filter(owner=user).aggregate(
        total=Count("id"),
        active=Count("id", filter=Q(is_active=True)),
    )
    total_customers = customer_counts.get("total") or 0
    active_customers = customer_counts.get("active") or 0
    inactive_customers = max(0, total_customers - active_customers)

    # Segments (include percentage)
    segment_data = list(
        Customer.objects.filter(owner=user, segment_label__isnull=False)
        .values("segment_label")
        .annotate(count=Count("id"))
        .order_by("segment_label")
    )

    segments = [
        {
            "segment_label": segment["segment_label"],
            "count": segment["count"],
            "percentage": round((segment["count"] / total_customers) * 100, 2) if total_customers else 0.0,
        }
        for segment in segment_data
    ]

    # Recommendations: reuse queryset
    rec_qs = Recommendation.objects.filter(customer__owner=user)
    recommendations_by_segment = list(
        rec_qs.values("segment_label").annotate(count=Count("id")).order_by("segment_label")
    )
    total_recommendations = sum(item["count"] for item in recommendations_by_segment)

    # Flatten products robustly
    product_counter: Dict[str, int] = {}
    recommendation_products = list(rec_qs.values_list("recommended_products", flat=True))

    for products in recommendation_products:
        products = products or []
        # If JSONField stores a dict mapping product->count
        if isinstance(products, dict):
            for k, v in products.items():
                try:
                    product_counter[str(k)] = product_counter.get(str(k), 0) + int(v)
                except Exception:
                    product_counter[str(k)] = product_counter.get(str(k), 0) + 1
        else:
            # Assume iterable (list of product identifiers)
            try:
                for product in products:
                    key = product if isinstance(product, (str, int)) else str(product)
                    product_counter[str(key)] = product_counter.get(str(key), 0) + 1
            except Exception:
                # Unexpected shape, coerce to string
                key = str(products)
                product_counter[key] = product_counter.get(key, 0) + 1

    top_products = [
        {"product": k, "count": v}
        for k, v in sorted(product_counter.items(), key=lambda x: x[1], reverse=True)[:top_n]
    ]

    # Notifications: aggregate in one query
    notif_qs = list(
        Notification.objects.filter(customer__owner=user)
        .values("status")
        .annotate(count=Count("id"))
    )
    notification_stats = {"draft": 0, "sent": 0, "failed": 0}
    for n in notif_qs:
        notification_stats[n["status"]] = n["count"]

    timeline = {
        "customers": [],
        "recommendations": [],
    }

    if include_timeline:
        # Timeline (for charts)
        customer_timeline = list(
            Customer.objects.filter(owner=user)
            .annotate(date=TruncDate("created_at"))
            .values("date")
            .annotate(count=Count("id"))
            .order_by("date")
        )

        recommendation_timeline = list(
            rec_qs.annotate(date=TruncDate("created_at")).values("date").annotate(count=Count("id")).order_by("date")
        )

        timeline = {
            "customers": _serialize_timeline(customer_timeline),
            "recommendations": _serialize_timeline(recommendation_timeline),
        }

    return {
        "customers": {"total": total_customers, "active": active_customers, "inactive": inactive_customers},
        "segments": segments,
        "recommendations": {
            "total": total_recommendations,
            "by_segment": recommendations_by_segment,
            "top_products": top_products,
        },
        "notifications": notification_stats,
        "timeline": timeline,
    }
