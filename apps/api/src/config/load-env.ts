import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { config } from 'dotenv';

function loadEnvFiles(): void {
  const candidates = [
    resolve(process.cwd(), '.env'),
    resolve(process.cwd(), '../../.env'),
    resolve(dirname(fileURLToPath(import.meta.url)), '../../../.env'),
  ];

  for (const envPath of candidates) {
    if (existsSync(envPath)) {
      config({ path: envPath });
    }
  }
}

loadEnvFiles();
