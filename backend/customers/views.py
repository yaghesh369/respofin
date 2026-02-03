from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from django.shortcuts import get_object_or_404
from django.db import IntegrityError
import csv
import io

from .models import Customer
from .serializers import CustomerCSVSerializer, CustomerSerializer


class CustomerListCreateView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        customers = Customer.objects.filter(owner=request.user)
        serializer = CustomerSerializer(customers, many=True)
        return Response(serializer.data)

    def post(self, request):
        serializer = CustomerSerializer(
            data=request.data,
            context={"request": request}
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class CustomerDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def get_object(self, request, pk):
        return get_object_or_404(
            Customer,
            pk=pk,
            owner=request.user
        )

    def get(self, request, pk):
        customer = self.get_object(request, pk)
        serializer = CustomerSerializer(customer)
        return Response(serializer.data)

    def patch(self, request, pk):
        customer = self.get_object(request, pk)
        serializer = CustomerSerializer(
            customer,
            data=request.data,
            partial=True
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)

    def delete(self, request, pk):
        customer = self.get_object(request, pk)
        customer.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)



class CustomerBulkUploadView(APIView):
    permission_classes = [IsAuthenticated]
    MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 MB
    MAX_ERRORS_RETURNED = 50

    def post(self, request):
        file = request.FILES.get("file")
        if not file or not file.name.lower().endswith(".csv"):
            return Response({"error": "Please upload a valid CSV file"}, status=status.HTTP_400_BAD_REQUEST)

        if file.size and file.size > self.MAX_FILE_SIZE:
            return Response({"error": "File too large"}, status=status.HTTP_400_BAD_REQUEST)

        data = file.read().decode("utf-8-sig")
        reader = csv.DictReader(io.StringIO(data))

        created = 0
        skipped = 0
        errors = []
        row_count = 0

        for row_number, row in enumerate(reader, start=1):
            row_count += 1
            # Normalize: strip text and convert empty numeric strings to None
            normalized = {k: (v.strip() if isinstance(v, str) else v) for k, v in row.items()}

            # Convert numeric fields where present
            for num_field in ("age", "income", "credit_score"):
                if normalized.get(num_field, "") == "":
                    normalized[num_field] = None
                else:
                    try:
                        if normalized[num_field] is not None:
                            if num_field in ("age", "credit_score"):
                                normalized[num_field] = int(normalized[num_field])
                            else:
                                normalized[num_field] = float(normalized[num_field])
                    except (ValueError, TypeError):
                        errors.append({"row": row_number, "errors": {num_field: "invalid number"}})
                        skipped += 1
                        normalized = None
                        break

            if normalized is None:
                continue

            serializer = CustomerCSVSerializer(data=normalized)
            if not serializer.is_valid():
                skipped += 1
                if len(errors) < self.MAX_ERRORS_RETURNED:
                    errors.append({"row": row_number, "errors": serializer.errors})
                continue

            validated = serializer.validated_data
            try:
                customer, was_created = Customer.objects.get_or_create(
                    owner=request.user,
                    email=validated["email"],
                    defaults={k: v for k, v in validated.items() if k != "email"}
                )
                if was_created:
                    created += 1
                else:
                    skipped += 1
            except IntegrityError:
                skipped += 1
                if len(errors) < self.MAX_ERRORS_RETURNED:
                    errors.append({"row": row_number, "errors": "database integrity error"})
            except Exception as exc:
                skipped += 1
                if len(errors) < self.MAX_ERRORS_RETURNED:
                    errors.append({"row": row_number, "errors": str(exc)})

        if row_count == 0:
            return Response({"error": "CSV contains no rows"}, status=status.HTTP_400_BAD_REQUEST)

        return Response({"created": created, "skipped": skipped, "errors": errors}, status=status.HTTP_201_CREATED)


class CustomerDeleteAllView(APIView):
    permission_classes = [IsAuthenticated]

    def delete(self, request):
        deleted_count, _ = Customer.objects.filter(owner=request.user).delete()
        return Response(
            {"deleted": deleted_count},
            status=status.HTTP_200_OK
        )
