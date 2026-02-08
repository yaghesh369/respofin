from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.http import HttpResponse

# ReportLab is an optional dependency used only for PDF export; import lazily

from .services import full_analytics


class AnalyticsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        data = full_analytics(request.user)
        return Response(data)



class AnalyticsPDFView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        data = full_analytics(request.user)

        # Import ReportLab lazily to allow running tests without the package
        try:
            from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table
            from reportlab.lib.styles import getSampleStyleSheet
        except Exception:
            return Response({"detail": "PDF export requires reportlab package."}, status=400)

        response = HttpResponse(content_type="application/pdf")
        response["Content-Disposition"] = "attachment; filename=analytics_report.pdf"

        doc = SimpleDocTemplate(response)
        styles = getSampleStyleSheet()
        story = []

        # Title
        story.append(Paragraph("Customer Analytics Report", styles["Title"]))
        story.append(Spacer(1, 12))

        # Customers
        story.append(Paragraph("<b>Customer Overview</b>", styles["Heading2"]))
        story.append(Paragraph(
            f"Total: {data['customers']['total']}<br/>"
            f"Active: {data['customers']['active']}<br/>"
            f"Inactive: {data['customers']['inactive']}",
            styles["Normal"]
        ))
        story.append(Spacer(1, 12))

        # Segments Table
        story.append(Paragraph("<b>Segments</b>", styles["Heading2"]))
        segment_table = [["Segment", "Customers"]]
        for s in data["segments"]:
            segment_table.append([s["segment_label"], s["count"]])
        story.append(Table(segment_table))
        story.append(Spacer(1, 12))

        # Recommendations
        story.append(Paragraph("<b>Top Recommended Products</b>", styles["Heading2"]))
        product_table = [["Product", "Count"]]
        for p in data["recommendations"]["top_products"]:
            product_table.append([p["product"], p["count"]])
        story.append(Table(product_table))

        doc.build(story)
        return response