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

const basePath = 'C:\\FINPRO\\SBD Prak (Kalceria)\\Kalceria\\backend';
const files = walk(basePath);
let replacedFiles = 0;

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  if (content.includes('import prisma from')) {
    
    const dir = path.dirname(file);
    let relativeToLib = path.relative(dir, path.join(basePath, 'lib/prisma.js')).replace(/\\/g, '/');
    if (!relativeToLib.startsWith('.')) {
      relativeToLib = './' + relativeToLib;
    }
    
    const oldContent = content;
    content = content.replace(/import\s+prisma\s+from\s+['"][^'"]+['"];?/g, `import prisma from '${relativeToLib}';`);
    
    if (oldContent !== content) {
      fs.writeFileSync(file, content);
      replacedFiles++;
      console.log('Fixed path in:', file, '->', relativeToLib);
    }
  }
});
console.log('Total files fixed:', replacedFiles);
