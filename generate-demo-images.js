const fs = require('fs');
const path = require('path');

function createSvg(text, bgColor, textColor) {
  return `<svg width="800" height="600" xmlns="http://www.w3.org/2000/svg">
  <rect width="100%" height="100%" fill="${bgColor}"/>
  <text x="50%" y="50%" font-family="Arial, sans-serif" font-size="48" fill="${textColor}" text-anchor="middle" dominant-baseline="middle">${text}</text>
</svg>`;
}

const products = [
  { id: 'iphone', text: 'iPhone 13 128GB', bg: '#fef2f2', textC: '#991b1b' },
  { id: 'macbook', text: 'MacBook Air M1', bg: '#f0fdf4', textC: '#166534' },
  { id: 'nike', text: 'Nike Air Force 1', bg: '#eff6ff', textC: '#1e40af' },
  { id: 'camry', text: 'Toyota Camry 70', bg: '#fffbeb', textC: '#92400e' }
];

const stores = [
  { id: 'techstore', text: 'TechStore', bg: '#10b981', textC: '#ffffff' },
  { id: 'autohouse', text: 'AutoHouse', bg: '#3b82f6', textC: '#ffffff' },
  { id: 'homecomfort', text: 'Home', bg: '#f59e0b', textC: '#ffffff' },
  { id: 'stylekg', text: 'Style', bg: '#ec4899', textC: '#ffffff' }
];

products.forEach(p => {
  fs.writeFileSync(path.join(__dirname, 'public/demo/products', `${p.id}.svg`), createSvg(p.text, p.bg, p.textC));
});

stores.forEach(s => {
  fs.writeFileSync(path.join(__dirname, 'public/demo/stores', `${s.id}.svg`), createSvg(s.text, s.bg, s.textC));
});

console.log("Demo images generated successfully!");
