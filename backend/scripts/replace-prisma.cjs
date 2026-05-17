const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory() && !file.includes('node_modules') && !file.endsWith('prisma')) {
      results = results.concat(walk(file));
    } else if (file.endsWith('.js') && !file.includes('lib\\prisma.js') && !file.includes('lib/prisma.js')) {
      results.push(file);
    }
  });
  return results;
}

const basePath = path.resolve('c:/FINPRO/SBD Prak (Kalceria)/Kalceria/backend');
const files = walk(basePath);
let replacedFiles = 0;

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  if (content.includes('new PrismaClient()') && content.includes('@prisma/client')) {
    
    // Calculate the relative path to lib/prisma.js
    const dir = path.dirname(file);
    const relativeToLib = path.relative(dir, path.join(basePath, 'lib/prisma.js')).replace(/\\/g, '/');
    let importPath = relativeToLib;
    if (!importPath.startsWith('.')) {
      importPath = './' + importPath;
    }
    
    content = content.replace(/import\s+\{\s*PrismaClient\s*\}\s+from\s+['"]@prisma\/client['"];?\r?\n?/g, '');
    content = content.replace(/const\s+prisma\s*=\s*new\s+PrismaClient\(\);?/g, `import prisma from '${importPath}';`);
    
    fs.writeFileSync(file, content);
    replacedFiles++;
    console.log('Updated:', file);
  }
});
console.log('Total files updated:', replacedFiles);
