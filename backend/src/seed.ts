import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import { getAllDocuments, createDocument } from './db.js';
import { ingestDocument } from './services/ingest.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from root or backend
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config();

const DATA_DIR = path.resolve(__dirname, '../../data');
const UPLOADS_DIR = path.resolve(__dirname, '../uploads');

if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

const DEMO_FILES = [
  'equipment_registry.txt',
  'manuals/manual_HX-301.txt',
  'manuals/manual_P-101.txt',
  'manuals/manual_T-201.txt',
  'inspection_records/inspection_records_2024.txt',
  'work_orders/work_orders_HX-301_T-201.txt',
  'work_orders/work_orders_P-101.txt'
];

async function seed() {
  const existingDocs = getAllDocuments();
  if (existingDocs.length > 0) {
    console.log('Documents already exist — skipping seed. Use the "Clear all" button in the UI first if you want to reseed.');
    return;
  }

  console.log('Seeding demo plant corpus...');

  for (const relPath of DEMO_FILES) {
    const filePath = path.join(DATA_DIR, relPath);
    if (!fs.existsSync(filePath)) {
      console.warn(`Skipping missing file: ${filePath}`);
      continue;
    }

    const name = path.basename(relPath);
    const destPath = path.join(UPLOADS_DIR, name);
    fs.copyFileSync(filePath, destPath);

    const doc = createDocument(name, destPath, 'uploaded');
    await ingestDocument(doc);
    console.log(`Ingested ${name} (${doc.num_chunks} chunks)`);
  }

  console.log('Demo corpus ready.');
}

seed().catch((err) => {
  console.error('Seeding failed:', err);
  process.exit(1);
});

