const fs = require('fs');
const path = require('path');

let server = fs.readFileSync(path.join(__dirname, 'server.js'), 'utf8');

// Add significance endpoint to the health check list
if (!server.includes('api/abtest/significance')) {
  const oldList = "'/api/abtest/config (POST/GET)', '/api/abtest/reset (POST)',
          '/api/abtest/stats (GET)', '/api/abtest/export (GET)',";
  const newList = "'/api/abtest/config (POST/GET)', '/api/abtest/reset (POST)',
          '/api/abtest/stats (GET)', '/api/abtest/significance (GET)',
          '/api/abtest/export (GET)',";
  if (server.includes(oldList)) {
    server = server.replace(oldList, newList);
    console.log('Added significance to health check list');
  } else {
    console.log('Could not find endpoint list');
  }
}

fs.writeFileSync(path.join(__dirname, 'server.js'), server);
console.log('Done');
