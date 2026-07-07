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

function removeIfBlock(content) {
  // Try to find the start of the block
  const searchStr = 'if (!admin.apps.length)';
  const index = content.indexOf(searchStr);
  if (index === -1) return content;

  // Find the opening brace of the if block
  const openBraceIndex = content.indexOf('{', index + searchStr.length);
  if (openBraceIndex === -1) return content;

  let braceCount = 1;
  let i = openBraceIndex + 1;
  while (braceCount > 0 && i < content.length) {
    if (content[i] === '{') {
      braceCount++;
    } else if (content[i] === '}') {
      braceCount--;
    }
    i++;
  }

  if (braceCount === 0) {
    // We found the matching closing brace at i - 1.
    // Let's remove from index to i (inclusive of trailing newline if possible)
    let end = i;
    // Consume trailing whitespace/newlines
    while (
      end < content.length &&
      (content[end] === ' ' || content[end] === '\n' || content[end] === '\r')
    ) {
      end++;
    }
    const before = content.substring(0, index);
    const after = content.substring(end);
    return before + after;
  }

  return content;
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

  // 1. Remove the admin initialization block safely using brace-depth counting
  content = removeIfBlock(content);

  // 2. Remove standard db = admin.firestore() definitions
  content = content.replace(/const db\s*=\s*admin\.firestore\(\);\s*/g, '');
  content = content.replace(
    /const dbAdmin\s*=\s*admin\.firestore\(\);\s*/g,
    'const dbAdmin = db;\n'
  );

  // 3. Dynamic imports based on what is used
  let imports = ['db'];

  if (content.includes('admin.firestore.FieldValue')) {
    content = content.replace(/admin\.firestore\.FieldValue/g, 'FieldValue');
    imports.push('FieldValue');
  }

  if (content.includes('admin.auth()') || content.includes('admin.auth(')) {
    content = content.replace(/admin\.auth\(\)/g, 'auth');
    content = content.replace(/admin\.auth\(/g, 'auth(');
    imports.push('auth');
  }

  // Replace other admin.firestore() calls with db
  content = content.replace(/admin\.firestore\(\)/g, 'db');

  // 4. Replace the import statement
  const importReplacement = `import { ${imports.join(', ')} } from '@/lib/firebase-admin';`;
  content = content.replace(
    /import admin from ['"]firebase-admin['"];\s*/g,
    importReplacement + '\n'
  );

  fs.writeFileSync(filePath, content, 'utf8');
});

console.log('Safe refactoring complete!');
