const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '100kb' }));
app.use(express.static(__dirname));

// BOX PRICES
const BOX = {
  1800: 15,
  2800: 30,
  3800: 40,
  4800: 60,
  5800: 90,
  9800: 150
};

// SHIPPING PRICES
const SHIPPING = {
  1800: 15,
  2800: 20,
  3800: 25,
  4800: 35,
  5800: 50,
  9800: 95
};

// PROMO CODES
const PROMO_CODES = {
  KALVEN: {
    freeShipping: true
  }
};

// SPEAKER BRANDS
const BRANDS = {
  'Customer Supplied': 0,
  'Kenwood': 40,
  'Pyle': 40,
  'Skar Audio': 50,
  'Pioneer': 50,
  'Boss Audio': 50,
  'DS18': 60,
  'Memphis Audio': 75,
  'Kicker': 80,
  'JBL': 80,
  'Infinity': 80,
  'Rockford Fosgate': 90,
  'Wet Sounds': 150,
  'JL Audio': 180
};

// SUBWOOFER BRANDS
const SUB_BRANDS = {
  'Kicker': 120,
  'Rockford Fosgate': 130,
  'JBL': 110,
  'DS18': 100,
  'Skar Audio': 90,
  'Memphis Audio': 130,
  'Wet Sounds': 250,
  'JL Audio': 250,
  'Kenwood': 100,
  'Pioneer': 100,
  'Infinity': 110,
  'Boss Audio': 50,
  'Pyle': 40,
  'Customer Supplied': 0
};

// POWER SYSTEMS
const POWER = {
  'Include Battery and Charger Bundle': 60,
  'DeWalt 20V': 15,
  'Milwaukee M18': 15,
  'Hart 20V': 15,
  'Ryobi 18V': 15,
  'Makita 18V': 15,
  'Other': 15
};

// GET BUILD SELECTION
function val(b, k) {
  return b?.selections?.[k]?.value ?? '';
}

// GET CASE CODE
function caseCode(build) {
  return String(val(build, 'case'))
    .match(/1800|2800|3800|4800|5800|9800/)?.[0] || '';
}

// CALCULATE BUILD PRICE
function calculate(build) {
  let total = 0;

  const box = caseCode(build);

  if (!(box in BOX)) {
    throw new Error('Invalid box selection.');
  }

  total
