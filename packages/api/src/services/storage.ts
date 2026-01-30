import * as fs from 'fs-extra';
import * as path from 'path';

const DATA_DIR = path.join(__dirname, '../../data');

// Ensure data directory exists
fs.ensureDirSync(DATA_DIR);

/**
 * Read JSON file safely
 */
export async function readJson<T = any>(filename: string): Promise<T> {
  const filepath = path.join(DATA_DIR, filename);
  try {
    return await fs.readJson(filepath);
  } catch (error) {
    // Return empty object if file doesn't exist
    return {} as T;
  }
}

/**
 * Write JSON file atomically
 */
export async function writeJson<T = any>(filename: string, data: T): Promise<void> {
  const filepath = path.join(DATA_DIR, filename);
  await fs.writeJson(filepath, data, { spaces: 2 });
}

/**
 * Upsert by key
 */
export async function upsertByKey<T = any>(
  filename: string,
  key: string,
  value: T
): Promise<void> {
  const data = await readJson<Record<string, T>>(filename);
  data[key] = value;
  await writeJson(filename, data);
}

/**
 * Get value by key
 */
export async function getByKey<T = any>(filename: string, key: string): Promise<T | null> {
  const data = await readJson<Record<string, T>>(filename);
  return data[key] || null;
}

/**
 * Check if key exists
 */
export async function hasKey(filename: string, key: string): Promise<boolean> {
  const data = await readJson<Record<string, any>>(filename);
  return key in data;
}
