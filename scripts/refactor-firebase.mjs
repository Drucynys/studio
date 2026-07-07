import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const projectRoot = path.join(__dirname, '..');
const apiDir = path.join(projectRoot, 'src', 'app', 'api');

function getFilesRecursively(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach((file) => {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat && stat.isDirectory()) {
      results = results.concat(getFilesRecursively(fullPath));
    } else if (file.endsWith('.ts') || file.endsWith('.tsx')) {
      results.push(fullPath);
    }
  });
  return results;
}

const files = getFilesRecursively(apiDir);
console.log(`Found ${files.length} TypeScript files in api directory.`);

files.forEach((filePath) => {
  let content = fs.readFileSync(filePath, 'utf8');

  if (
    !content.includes("import admin from 'firebase-admin'") &&
    !content.includes('import admin from "firebase-admin"')
  ) {
    return;
  }

  console.log(`Processing: ${path.relative(projectRoot, filePath)}`);

  // 1. Replace the import statement
  content = content.replace(
    /import admin from ['"]firebase-admin['"];/g,
    "import { db, auth, FieldValue } from '@/lib/firebase-admin';"
  );

  // 2. Remove the initialization block
  // Matches if (!admin.apps.length) { ... } block
  content = content.replace(/if\s*\(\s*!admin\.apps\.length\s*\)\s*\{[\s\S]*?\}\s*\}/g, '');
  // Matches if (!admin.apps.length) { ... } with trailing } if regex missed it
  content = content.replace(
    /\/\/\s*Re-initialize Firebase Admin[\s\S]*?if\s*\(!admin\.apps\.length\)[\s\S]*?\}\n\}/g,
    ''
  );
  // General cleanup of leftover comments and if block if formatted differently
  content = content.replace(/if\s*\(!admin\.apps\.length\)[\s\S]*?\}\s*\}\s*/g, '');
  content = content.replace(
    /\/\/\s*Re-initialize Firebase Admin SDK and Auth if not already initialized\s*/g,
    ''
  );
  content = content.replace(
    /\/\/\s*Re-initialize Firebase Admin SDK if not already initialized\s*/g,
    ''
  );

  // 3. Replace db initialization
  content = content.replace(/const db\s*=\s*admin\.firestore\(\);/g, '');
  content = content.replace(/const dbAdmin\s*=\s*admin\.firestore\(\);/g, 'const dbAdmin = db;');

  // 4. Replace auth initialization
  content = content.replace(/const authAdmin\s*=\s*admin\.auth\(\);/g, 'const authAdmin = auth;');

  // 5. Replace FieldValue namespace
  content = content.replace(/admin\.firestore\.FieldValue/g, 'FieldValue');

  // 6. Replace admin.firestore() direct calls
  content = content.replace(/admin\.firestore\(\)/g, 'db');

  fs.writeFileSync(filePath, content, 'utf8');
});

console.log('Refactoring complete!');
