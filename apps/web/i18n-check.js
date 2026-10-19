const fs = require('fs');
const path = require('path');

function walkSync(dir, filelist = []) {
  if (dir.includes('node_modules') || dir.includes('.next')) return filelist;
  fs.readdirSync(dir).forEach(file => {
    const dirFile = path.join(dir, file);
    if (fs.statSync(dirFile).isDirectory()) {
      filelist = walkSync(dirFile, filelist);
    } else {
      if (dirFile.endsWith('.tsx') || dirFile.endsWith('.ts')) {
        filelist.push(dirFile);
      }
    }
  });
  return filelist;
}

function getFlattenedKeys(obj, prefix = '') {
  let keys = [];
  for (const k in obj) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (typeof obj[k] === 'object' && obj[k] !== null) {
      keys = keys.concat(getFlattenedKeys(obj[k], key));
    } else {
      keys.push(key);
    }
  }
  return keys;
}

function getNestedValue(obj, keyPath) {
  return keyPath.split('.').reduce((o, k) => (o || {})[k], obj);
}

try {
  const ru = JSON.parse(fs.readFileSync('./messages/ru.json', 'utf8'));
  const ky = JSON.parse(fs.readFileSync('./messages/ky.json', 'utf8'));
  let hasError = false;

  const ruKeys = getFlattenedKeys(ru);
  const kyKeys = getFlattenedKeys(ky);

  const missingInKy = ruKeys.filter(k => getNestedValue(ky, k) === undefined);
  const missingInRu = kyKeys.filter(k => getNestedValue(ru, k) === undefined);

  if (missingInKy.length > 0) {
    console.error('ERROR: Missing keys in ky.json:', missingInKy);
    hasError = true;
  }
  
  if (missingInRu.length > 0) {
    console.error('ERROR: Missing keys in ru.json:', missingInRu);
    hasError = true;
  }

  for (const k of kyKeys) {
    const val = getNestedValue(ky, k);
    if (typeof val === 'string' && val.trim() === '') {
      console.error(`ERROR: Empty translation in ky.json for key: "${k}"`);
      hasError = true;
    }
  }

  // Check codebase for missing keys
  const files = walkSync('src');
  const codeKeys = new Set();
  files.forEach(f => {
    const content = fs.readFileSync(f, 'utf8');
    const regex = /\bt\(['"`](.*?)['"`]\)/g;
    let match;
    while ((match = regex.exec(content)) !== null) {
      codeKeys.add(match[1]);
    }
  });

  const missingInCode = Array.from(codeKeys).filter(k => getNestedValue(ru, k) === undefined);
  if (missingInCode.length > 0) {
    // We only warn here because some keys might be dynamic t(`...${variable}`)
    console.warn(`WARNING: ${missingInCode.length} keys found in code but missing from JSON dictionaries (might be dynamic).`);
  }

  if (hasError) {
    process.exit(1);
  }

  console.log('i18n check passed.');
  process.exit(0);
} catch (e) {
  console.error('i18n check failed:', e);
  process.exit(1);
}
