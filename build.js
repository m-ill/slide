import { readFileSync, writeFileSync, mkdirSync, cpSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Create dist directory
const distDir = join(__dirname, 'dist');
if (!existsSync(distDir)) {
  mkdirSync(distDir, { recursive: true });
}

// Copy index.html
cpSync(join(__dirname, 'index.html'), join(distDir, 'index.html'));

// Bundle TypeScript/React code into a single file
const indexContent = readFileSync(join(__dirname, 'index.tsx'), 'utf-8');

// Create a simple bundle (for Cloudflare Pages, we'll use the ES modules directly)
const bundleContent = indexContent;

writeFileSync(join(distDir, 'index.js'), bundleContent);

console.log('Build completed! Files are in the dist/ directory.');