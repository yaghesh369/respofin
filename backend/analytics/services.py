from django.db.models import Count
from django.db.models.functions import TruncDate
from typing import Any, Dict, List

from customers.models import Customer
from recommendations.models import Recommendation
from notifications.models import Notification


def _serialize_timeline(qs) -> List[Dict[str, Any]]:
    return [
        {"date": item["date"].isoformat() if item.get("date") is not None else None, "count": item["count"]}
        for item in list(qs)
    ]


def full_analytics(user, top_n: int = 10) -> Dict[str, Any]:
    """Return aggregated analytics for a given user.

    Improvements over earlier implementation:
    - Reuses recommendation queryset to avoid duplicate DB hits.
    - Robustly handles different shapes for `recommended_products`.
    - Adds segment percentage when customer total is available.
    - Aggregates notification counts in a single query.
    - Limits `top_products` to `top_n`.
    """

    # Customers
    total_customers = Customer.objects.filter(owner=user).count()
    active_customers = Customer.objects.filter(owner=user, is_active=True).count()
    inactive_customers = max(0, total_customers - active_customers)

    # Segments (include percentage)
    segment_data = (
        Customer.objects.filter(owner=user, segment_label__isnull=False)
        .values("segment_label")
        .annotate(count=Count("id"))
        .order_by("segment_label")
    )

    segments = []
    for s in segment_data:
        pct = round((s["count"] / total_customers) * 100, 2) if total_customers else 0.0
        segments.append({
            "segment_label": s["segment_label"],
            "count": s["count"],
            "percentage": pct,
        })

    # Recommendations: reuse queryset
    rec_qs = Recommendation.objects.filter(customer__owner=user)
    total_recommendations = rec_qs.count()
    recommendations_by_segment = (
        rec_qs.values("segment_label").annotate(count=Count("id")).order_by("segment_label")
    )

    # Flatten products robustly
    product_counter: Dict[str, int] = {}
    for rec in rec_qs:
        products = rec.recommended_products or []
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
    notif_qs = Notification.objects.filter(customer__owner=user).values("status").annotate(count=Count("id"))
    notification_stats = {"draft": 0, "sent": 0, "failed": 0}
    for n in notif_qs:
        notification_stats[n["status"]] = n["count"]

    # Timeline (for charts)
    customer_timeline = (
        Customer.objects.filter(owner=user)
        .annotate(date=TruncDate("created_at"))
        .values("date")
        .annotate(count=Count("id"))
        .order_by("date")
    )

    recommendation_timeline = (
        rec_qs.annotate(date=TruncDate("created_at")).values("date").annotate(count=Count("id")).order_by("date")
    )

    return {
        "customers": {"total": total_customers, "active": active_customers, "inactive": inactive_customers},
        "segments": segments,
        "recommendations": {
            "total": total_recommendations,
            "by_segment": list(recommendations_by_segment),
            "top_products": top_products,
        },
        "notifications": notification_stats,
        "timeline": {"customers": _serialize_timeline(customer_timeline), "recommendations": _serialize_timeline(recommendation_timeline)},
    }
