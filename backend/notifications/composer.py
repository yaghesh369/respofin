def compose_recommendation_email(customer, products):
    subject = "Personalized Product Recommendation for You"

    product_lines = "\n".join(
        f"- {product}" for product in products
    )

    message = f"""
Hello {customer.name},

Based on your profile and recent analysis, we have identified products that may be valuable for you.

Recommended products:
{product_lines}

If you would like more details or assistance, please reply to this email.

Best regards,
{customer.owner.username}'s Team
"""

    return subject.strip(), message.strip()
