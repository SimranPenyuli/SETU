const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');

function readJSON(file) {
  try {
    return JSON.parse(fs.readFileSync(path.join(DATA_DIR, file), 'utf-8'));
  } catch (e) {
    return [];
  }
}

function writeJSON(file, data) {
  fs.writeFileSync(path.join(DATA_DIR, file), JSON.stringify(data, null, 2));
}

module.exports = { readJSON, writeJSON };
