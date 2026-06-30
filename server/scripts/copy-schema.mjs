// Cross-platform copy of the SQL schema into the build output.
// (tsc only compiles .ts files, so schema.sql must be copied separately.)
import { copyFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const src = join(root, 'src', 'db', 'schema.sql');
const dest = join(root, 'dist', 'db', 'schema.sql');

mkdirSync(dirname(dest), { recursive: true });
copyFileSync(src, dest);
console.log('Copied schema.sql -> dist/db/schema.sql');
