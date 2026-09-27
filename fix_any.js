const fs = require('fs');
const path = require('path');

const walkSync = (dir, filelist = []) => {
  fs.readdirSync(dir).forEach(file => {
    const dirFile = path.join(dir, file);
    try {
      filelist = walkSync(dirFile, filelist);
    } catch (err) {
      if (err.code === 'ENOTDIR' || err.code === 'EBADF') filelist.push(dirFile);
    }
  });
  return filelist;
};

const files = walkSync('src/app/(main)/admin');
files.forEach(f => {
  if (f.endsWith('.tsx')) {
    let content = fs.readFileSync(f, 'utf8');
    content = content.replace(/\(user: any\)/g, "(user: Record<string, any>)");
    content = content.replace(/\(listing: any\)/g, "(listing: Record<string, any>)");
    content = content.replace(/\(report: any\)/g, "(report: Record<string, any>)");
    content = content.replace(/\(order: any\)/g, "(order: Record<string, any>)");
    content = content.replace(/\(store: any\)/g, "(store: Record<string, any>)");
    content = content.replace(/\(app: any\)/g, "(app: Record<string, any>)");
    content = content.replace(/\(log: any\)/g, "(log: Record<string, any>)");
    content = content.replace(/\(req: any\)/g, "(req: Record<string, any>)");
    fs.writeFileSync(f, content);
  }
});
