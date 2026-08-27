import fs from 'fs';
import path from 'path';

// Clean up the index.html for Customer
const customerHtmlPath = path.join(process.cwd(), 'dist', 'index.html');
if (fs.existsSync(customerHtmlPath)) {
  let html = fs.readFileSync(customerHtmlPath, 'utf8');
  // Remove the admin manifest
  html = html.replace(/<link rel="manifest" href="\/admin-manifest\.json">/g, '');
  fs.writeFileSync(customerHtmlPath, html);
  console.log('Cleaned customer index.html');
}

// Clean up the index.html for Admin
const adminHtmlPath = path.join(process.cwd(), 'dist', 'admin', 'index.html');
if (fs.existsSync(adminHtmlPath)) {
  let html = fs.readFileSync(adminHtmlPath, 'utf8');
  // Remove the customer manifest
  html = html.replace(/<link rel="manifest" href="\/manifest\.json">/g, '');
  fs.writeFileSync(adminHtmlPath, html);
  console.log('Cleaned admin index.html');
}
