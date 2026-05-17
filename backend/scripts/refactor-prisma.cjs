const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(function(file) {
    file = dir + '/' + file;
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(file));
    } else {
      if(file.endsWith('.js') && !file.includes('node_modules') && !file.includes('lib/prisma.js')) results.push(file);
    }
  });
  return results;
}

const files = walk('./');
files.forEach(f => {
  let content = fs.readFileSync(f, 'utf8');
  if (content.includes('new PrismaClient()')) {
    // Calculate relative path to lib/prisma.js
    const dirDepth = (f.match(/\//g) || []).length;
    let importPath = '../lib/prisma.js';
    if (dirDepth === 1) importPath = './lib/prisma.js';
    else if (dirDepth === 3) importPath = '../../lib/prisma.js';
    
    content = content.replace(/import\s+\{\s*PrismaClient\s*\}\s+from\s+['"]@prisma\/client['"];?/g, `import prisma from '${importPath}';`);
    content = content.replace(/const\s+prisma\s*=\s*new\s+PrismaClient\(\);?/g, '');
    fs.writeFileSync(f, content);
    console.log('Updated', f);
  }
});
