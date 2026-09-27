const fs = require('fs');
const path = require('path');

const files = [
  'src/app/(main)/admin/account-deletions/page.tsx',
  'src/app/(main)/admin/audit-logs/page.tsx',
  'src/app/(main)/admin/listings/page.tsx',
  'src/app/(main)/admin/orders/page.tsx',
  'src/app/(main)/admin/reports/page.tsx',
  'src/app/(main)/admin/requests/page.tsx',
  'src/app/(main)/admin/stores/page.tsx',
  'src/app/(main)/admin/users/page.tsx'
];

files.forEach(f => {
  if (fs.existsSync(f)) {
    let content = fs.readFileSync(f, 'utf8');
    
    // Cast the destructured data to the correct type to override Supabase inferences
    content = content.replace(/const \{ data: (.*?), error \} = await dbQuery/g, (match, p1) => {
      let typeName = 'UserRow[]';
      if (f.includes('listings')) typeName = 'ListingRow[]';
      if (f.includes('reports')) typeName = 'ReportRow[]';
      if (f.includes('orders')) typeName = 'OrderRow[]';
      if (f.includes('stores')) typeName = 'StoreRow[]';
      if (f.includes('requests')) typeName = 'AppRow[]';
      if (f.includes('audit-logs')) typeName = 'LogRow[]';
      if (f.includes('account-deletions')) typeName = 'ReqRow[]';
      
      return `const { data, error } = await dbQuery;\n  const ${p1} = data as unknown as ${typeName}`;
    });
    
    fs.writeFileSync(f, content);
  }
});
