import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const DATA_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), '../../data');
const TRUCKS_FILE = path.join(DATA_DIR, 'trucks.json');

export function readLocalTrucks() {
  try {
    if (!fs.existsSync(TRUCKS_FILE)) return [];
    const trucks = JSON.parse(fs.readFileSync(TRUCKS_FILE, 'utf8') || '[]');
    return Array.isArray(trucks) ? trucks : [];
  } catch (error) {
    console.warn('[Truck storage] Local truck read failed:', error.message);
    return [];
  }
}

export function writeLocalTrucks(trucks) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(TRUCKS_FILE, JSON.stringify(trucks, null, 2), 'utf8');
}

export function saveLocalTruck(truck) {
  const trucks = readLocalTrucks();
  trucks.unshift(truck);
  writeLocalTrucks(trucks);
  return truck;
}

export function updateLocalTruck(id, updater) {
  const trucks = readLocalTrucks();
  const index = trucks.findIndex(truck => String(truck.id) === String(id));
  if (index === -1) return null;
  trucks[index] = updater(trucks[index]);
  writeLocalTrucks(trucks);
  return trucks[index];
}

export function deleteLocalTruck(id) {
  const trucks = readLocalTrucks();
  const remaining = trucks.filter(truck => String(truck.id) !== String(id));
  if (remaining.length === trucks.length) return false;
  writeLocalTrucks(remaining);
  return true;
}
