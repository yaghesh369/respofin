import numpy as np
from sklearn.cluster import KMeans
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import silhouette_score

from customers.models import Customer


MIN_CUSTOMERS = 3
MAX_K = 6


def run_segmentation_for_user(user):
    customers = Customer.objects.filter(
        owner=user,
        age__isnull=False,
        income__isnull=False,
        credit_score__isnull=False,
    )

    if customers.count() < MIN_CUSTOMERS:
        raise ValueError("Not enough customers to run segmentation")

    # Feature matrix
    X = np.array([
        [c.age, c.income, c.credit_score]
        for c in customers
    ])

    # Scale features
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)

    # Auto-select best K
    best_k = 2
    best_score = -1

    max_k = min(MAX_K, len(X_scaled) - 1)

    for k in range(2, max_k + 1):
        model = KMeans(n_clusters=k, random_state=42, n_init=10)
        labels = model.fit_predict(X_scaled)

        score = silhouette_score(X_scaled, labels)
        if score > best_score:
            best_score = score
            best_k = k

    # Final model
    final_model = KMeans(
        n_clusters=best_k,
        random_state=42,
        n_init=10
    )
    final_labels = final_model.fit_predict(X_scaled)

    # Save labels
    for customer, label in zip(customers, final_labels):
        customer.segment_label = int(label)
        customer.save(update_fields=["segment_label"])

    return {
        "clusters": best_k,
        "customers_segmented": customers.count(),
        "silhouette_score": round(best_score, 3),
    }
