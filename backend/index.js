import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Explicitly load .env file from the backend folder FIRST before importing app and db modules
dotenv.config({ path: path.join(__dirname, '.env') });

const { default: app } = await import('./src/app.js');
const { isNeonConnected, initNeonTables } = await import('./src/config/neonDb.js');

const PORT = process.env.PORT || 5001;

app.listen(PORT, async () => {
  console.log(`[LoopPack Exchange API] Server running on http://localhost:${PORT}`);
  console.log(`[Env Config] GEMINI_API_KEY loaded: ${process.env.GEMINI_API_KEY ? 'YES (configured)' : 'NO (missing)'}`);
  console.log(`[Database] Neon PostgreSQL Serverless: ${isNeonConnected ? 'CONNECTED' : 'LOCAL JSON DB (DATABASE_URL ready)'}`);

  if (isNeonConnected) {
    await initNeonTables();
  }
});
