const fs = require('fs');
const path = require('path');

const walkSync = (dir, filelist = []) => {
  fs.readdirSync(dir).forEach(file => {
    const dirFile = path.join(dir, file);
    if (fs.statSync(dirFile).isDirectory()) {
      filelist = walkSync(dirFile, filelist);
    } else {
      filelist.push(dirFile);
    }
  });
  return filelist;
};

const mapReplacements = {
  'users': {
    type: 'type UserRow = { id: string, full_name: string | null, role: string, is_banned: boolean, created_at: string };\n',
  },
  'listings': {
    type: 'type ListingRow = { id: string, title: string, price: number, status: string, created_at: string, profiles: { full_name: string | null } | null };\n',
  },
  'reports': {
    type: 'type ReportRow = { id: string, target_type: string, target_id: string, reason: string, status: string, created_at: string, reporter: { full_name: string | null } | null };\n',
  },
  'orders': {
    type: 'type OrderRow = { id: string, status: string, total_amount: number, created_at: string, buyer: { full_name: string | null } | null, store: { name: string | null } | null };\n',
  },
  'stores': {
    type: 'type StoreRow = { id: string, name: string, status: string, created_at: string, owner: { full_name: string | null } | null };\n',
  },
  'requests': {
    type: 'type AppRow = { id: string, company_name: string, tax_id: string, status: string, created_at: string, applicant: { full_name: string | null } | null };\n',
  },
  'audit-logs': {
    type: 'type LogRow = { id: string, action: string, target_type: string, target_id: string, reason: string, created_at: string, actor: { full_name: string | null, role: string | null } | null };\n',
  },
  'account-deletions': {
    type: 'type ReqRow = { user_id: string, status: string, started_at: string | null, completed_at: string | null, error_details: string | undefined, profiles: { full_name: string | null } | null };\n',
  }
};

const files = walkSync('src/app/(main)/admin');
files.forEach(f => {
  if (f.endsWith('page.tsx')) {
    let content = fs.readFileSync(f, 'utf8');
    const parts = f.split(path.sep);
    const section = parts[parts.length - 2];
    
    if (mapReplacements[section]) {
      const rep = mapReplacements[section];
      const typeRegex = new RegExp(`type ${rep.type.split(' ')[1]} =.*?;\\n`);
      content = content.replace(typeRegex, rep.type);
      fs.writeFileSync(f, content);
    }
  }
});
