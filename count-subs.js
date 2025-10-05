const fs = require('fs');
const categories = JSON.parse(fs.readFileSync('data/categories.json', 'utf-8'));
let count = 0;
categories.forEach(cat => {
  if (cat.subs) {
    cat.subs.forEach(sub => {
      if (!sub.subs) { // Only L2
        count++;
        console.log(`Sub: ${sub.name} (${sub.slug}) -> ${cat.name}`);
      }
    });
  }
});
console.log(`Total L2 subcategories: ${count}`);
