const Papa = require('papaparse');
const fs = require('fs');

const properties = JSON.parse(fs.readFileSync('property_list_data.json'));
console.log('CHE: properties', properties);

var csv = Papa.unparse(properties, {
  columns: [
    'price',
    'size',
    'bedrooms',
    'bathrooms',
    'parking spaces',
    'location',
    'address',
    'href',
  ],
});
console.log('CHE: csv', csv);
fs.writeFileSync('property_list_data.csv', csv);