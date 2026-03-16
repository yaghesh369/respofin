import numpy as np
from sklearn.cluster import KMeans
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import silhouette_score

from customers.models import Customer


MIN_CUSTOMERS = 3
MAX_K = 6
KMEANS_MAX_ITER = 100
SILHOUETTE_SAMPLE_LIMIT = 300


def _build_kmeans(n_clusters):
    return KMeans(
        n_clusters=n_clusters,
        random_state=42,
        n_init="auto",
        max_iter=KMEANS_MAX_ITER,
        algorithm="elkan",
    )


def run_segmentation_for_user(user):
    customers = list(
        Customer.objects.filter(
            owner=user,
            age__isnull=False,
            income__isnull=False,
            credit_score__isnull=False,
        ).only("id", "age", "income", "credit_score", "segment_label")
    )
    customer_count = len(customers)

    if customer_count < MIN_CUSTOMERS:
        raise ValueError("Not enough customers to run segmentation")

    # Feature matrix
    X = np.asarray([
        [c.age, c.income, c.credit_score]
        for c in customers
    ], dtype=np.float32)

    # Scale features
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X).astype(np.float32, copy=False)

    # Auto-select best K
    best_k = 2
    best_score = None

    max_k = min(MAX_K, customer_count - 1)
    sample_size = min(customer_count, SILHOUETTE_SAMPLE_LIMIT)

    if max_k < 2:
        raise ValueError("Not enough customers to determine valid clusters")

    for k in range(2, max_k + 1):
        model = _build_kmeans(k)
        labels = model.fit_predict(X_scaled)

        # Silhouette score requires at least 2 unique labels; for degenerate data,
        # skip scoring and keep searching for a valid cluster size.
        unique_label_count = len(np.unique(labels))
        if unique_label_count < 2:
            continue

        try:
            score = silhouette_score(
                X_scaled,
                labels,
                sample_size=sample_size,
                random_state=42,
            )
        except ValueError:
            continue

        if best_score is None or score > best_score:
            best_score = score
            best_k = k

    # Final model
    final_model = _build_kmeans(best_k)
    final_labels = final_model.fit_predict(X_scaled)

    # Save labels in bulk to avoid one update query per customer.
    for customer, label in zip(customers, final_labels):
        customer.segment_label = int(label)

    Customer.objects.bulk_update(customers, ["segment_label"], batch_size=500)

    return {
        "clusters": best_k,
        "customers_segmented": customer_count,
        "silhouette_score": round(best_score, 3) if best_score is not None else None,
    }
