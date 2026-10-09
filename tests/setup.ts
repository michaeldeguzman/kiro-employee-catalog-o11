/**
 * Global test setup — runs before every test file.
 * Loads environment variables from .env (if present) so tests can
 * reference process.env.OUTSYSTEMS_BASE_URL etc.
 */
import { config } from "dotenv";
import { resolve } from "node:path";

config({ path: resolve(process.cwd(), ".env") });
