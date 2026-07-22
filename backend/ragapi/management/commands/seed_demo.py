import os

from django.conf import settings
from django.core.files import File
from django.core.management.base import BaseCommand

from ragapi.models import Document
from ragapi.services.ingest import ingest_document

DEMO_FILES = [
    "equipment_registry.txt",
    "manuals/manual_HX-301.txt",
    "manuals/manual_P-101.txt",
    "manuals/manual_T-201.txt",
    "inspection_records/inspection_records_2024.txt",
    "work_orders/work_orders_HX-301_T-201.txt",
    "work_orders/work_orders_P-101.txt",
]


class Command(BaseCommand):
    help = "Ingests the pre-loaded demo plant corpus (data/) into the vector store."

    def handle(self, *args, **options):
        data_dir = settings.REPO_ROOT / "data"

        if Document.objects.exists():
            self.stdout.write(self.style.WARNING(
                "Documents already exist — skipping seed. "
                "Use the 'Clear all' button in the UI first if you want to reseed."
            ))
            return

        for rel_path in DEMO_FILES:
            file_path = data_dir / rel_path
            if not file_path.exists():
                self.stdout.write(self.style.WARNING(f"Skipping missing file: {file_path}"))
                continue

            name = os.path.basename(rel_path)
            with open(file_path, "rb") as f:
                document = Document.objects.create(
                    file=File(f, name=f"uploads/{name}"),
                    original_name=name,
                    status="uploaded",
                )
            ingest_document(document)
            self.stdout.write(self.style.SUCCESS(f"Ingested {name} ({document.num_chunks} chunks)"))

        self.stdout.write(self.style.SUCCESS("Demo corpus ready."))
