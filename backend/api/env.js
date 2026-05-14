import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "../../");
dotenv.config({ path: path.join(rootDir, ".env") });

console.log("[Env] Root .env loaded");
