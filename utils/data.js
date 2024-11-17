const fs = require('fs');
const path = require('path');

const dataFilePath = path.join(__dirname, '../data.json');

function loadData() {
  if (!fs.existsSync(dataFilePath)) {
    return { affaires: [] };
  }
  return JSON.parse(fs.readFileSync(dataFilePath, 'utf-8'));
}

function saveData(data) {
  fs.writeFileSync(dataFilePath, JSON.stringify(data, null, 2), 'utf-8');
}

function saveAffair(affair) {
  const data = loadData();
  data.affaires.push(affair);
  saveData(data);
}

module.exports = { loadData, saveData, saveAffair };
