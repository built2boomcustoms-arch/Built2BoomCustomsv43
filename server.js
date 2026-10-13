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
  'Include Battery & Charger': 60,
  'Battery and Charger Bundle': 60,
  'DeWalt': 15,
  'DeWalt 20V': 15,
  'Milwaukee': 15,
  'Milwaukee M18': 15,
  'Hart': 15,
  'Hart 20V': 15,
  'Ryobi': 15,
  'Ryobi 18V': 15,
  'Makita': 15,
  'Makita 18V': 15,
  'Hercules': 15,
  'Hercules 20V': 15,
  'Other': 15
};

// GET BUILD SELECTION
function val(build, key) {
  return build?.selections?.[key]?.value ?? '';
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

  if (!Object.prototype.hasOwnProperty.call(BOX, box)) {
    throw new Error('Invalid box selection.');
  }

  total += BOX[box];

  if (val(build, 'color') === 'Custom') {
    total += 25;
  }

  const count = Number(
    (String(val(build, 'count')).match(/\d+/) || ['0'])[0]
  );

  if (!count) {
    throw new Error('Invalid speaker count.');
  }

  const brand = val(build, 'brand');

  if (!Object.prototype.hasOwnProperty.call(BRANDS, brand)) {
    throw new Error('Invalid speaker brand.');
  }

  total += BRANDS[brand] * count / 2;

  const sub = val(build, 'sub') === 'Yes';

  const subCount = sub
    ? (val(build, 'subCount') === '2 Subwoofers' ? 2 : 1)
    : 0;

  if (sub) {
    const subBrand = val(build, 'subBrand');

    if (!Object.prototype.hasOwnProperty.call(SUB_BRANDS, subBrand)) {
      throw new Error('Invalid subwoofer brand.');
    }

    total += SUB_BRANDS[subBrand] * subCount;
  }

  const power = val(build, 'power');

  if (!Object.prototype.hasOwnProperty.call(POWER, power)) {
    throw new Error('Invalid power selection.');
  }

  total += POWER[power];

  const tweeters = Number(
    (String(val(build, 'tweeters')).match(/\d+/) || ['0'])[0]
  );

  total += tweeters * 10;

  const extra = val(build, 'extra');

  const extras = extra === 'None'
    ? []
    : String(extra).split(' + ').filter(Boolean);

  if (extras.includes('Battery Voltage and Charging Port')) {
    total += 25;
  }

  if (extras.includes('Custom Name / Logo')) {
    total += 20;
  }

  // AMPLIFIER AND SUBWOOFER INSTALLATION
  total += Math.ceil(count / 2) * 25;
  total += subCount * 25;

  return Math.round(total);
}

// CALCULATE NORMAL SHIPPING
function shipping(build) {
  const box = caseCode(build);

  if (!Object.prototype.hasOwnProperty.call(SHIPPING, box)) {
    throw new Error('Unable to calculate shipping.');
  }

  return SHIPPING[box];
}

// APPLY PROMO CODE
function applyPromo(build, promoCode) {
  const code = String(promoCode || '')
    .trim()
    .toUpperCase();

  const normalShipping = shipping(build);

  if (!code) {
    return {
      shipping: normalShipping,
      discount: 0,
      appliedCode: null
    };
  }

  const promo = Object.prototype.hasOwnProperty.call(PROMO_CODES, code)
    ? PROMO_CODES[code]
    : null;

  if (!promo) {
    throw new Error('Invalid promo code.');
  }

  if (promo.freeShipping) {
    return {
      shipping: 0,
      discount: normalShipping,
      appliedCode: code
    };
  }

  return {
    shipping: normalShipping,
    discount: 0,
    appliedCode: code
  };
}

// PAYPAL ACCESS TOKEN
async function accessToken() {
  const id = process.env.PAYPAL_CLIENT_ID;
  const secret = process.env.PAYPAL_CLIENT_SECRET;

  if (!id || !secret) {
    throw new Error(
      'PayPal is not connected yet. Add PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET to the server environment.'
    );
  }

  const base = process.env.PAYPAL_ENV === 'live'
    ? 'https://api-m.paypal.com'
    : 'https://api-m.sandbox.paypal.com';

  const response = await fetch(base + '/v1/oauth2/token', {
    method: 'POST',
    headers: {
      Authorization: 'Basic ' +
        Buffer.from(id + ':' + secret).toString('base64'),
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: 'grant_type=client_credentials'
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(
      result.error_description || 'PayPal authentication failed.'
    );
  }

  return {
    token: result.access_token,
    base
  };
}

// CREATE PAYPAL ORDER
app.post('/api/paypal/orders', async (req, res) => {
  try {
    const { customer, build, promoCode } = req.body || {};

    if (
      !customer?.name ||
      !customer?.email ||
      !customer?.phone ||
      !customer?.address1 ||
      !customer?.city ||
      !customer?.state ||
      !customer?.zip ||
      !build
    ) {
      throw new Error(
        'Missing customer, shipping, or build information.'
      );
    }

    // CALCULATE PRICES ON SERVER
    const subtotal = calculate(build);

    // APPLY PROMO CODE
    const promo = applyPromo(build, promoCode);

    const ship = promo.shipping;
    const grand = subtotal + ship;

    // Require the amount shown at checkout to match the server price.
    const displayedSubtotal = Number(build.total);
    if (
      !Number.isFinite(displayedSubtotal) ||
      Math.abs(displayedSubtotal - subtotal) > 0.01
    ) {
      throw new Error(
        'The checkout total does not match the build price. Please return to the builder and refresh your build before paying.'
      );
    }

    const { token, base } = await accessToken();

    const compact = Object.values(build.selections || {})
      .map(selection => selection.value)
      .filter(Boolean)
      .join(' | ')
      .slice(0, 120);

    const paypalBody = {
      intent: 'CAPTURE',

      purchase_units: [
        {
          description: 'Built2BoomCustoms Custom Speaker Build',
          custom_id: compact,

          amount: {
            currency_code: 'USD',
            value: grand.toFixed(2),

            breakdown: {
              item_total: {
                currency_code: 'USD',
                value: subtotal.toFixed(2)
              },
              shipping: {
                currency_code: 'USD',
                value: ship.toFixed(2)
              }
            }
          },

          items: [
            {
              name: 'Custom Speaker Build',
              quantity: '1',
              unit_amount: {
                currency_code: 'USD',
                value: subtotal.toFixed(2)
              }
            }
          ],

          shipping: {
            name: {
              full_name: customer.name
            },

            address: {
              address_line_1: customer.address1,
              address_line_2: customer.address2 || undefined,
              admin_area_2: customer.city,
              admin_area_1: customer.state.toUpperCase(),
              postal_code: customer.zip,
              country_code: 'US'
            }
          }
        }
      ]
    };

    const response = await fetch(
      base + '/v2/checkout/orders',
      {
        method: 'POST',
        headers: {
          Authorization: 'Bearer ' + token,
          'Content-Type': 'application/json',
          'PayPal-Request-Id': 'b2b-' + Date.now()
        },
        body: JSON.stringify(paypalBody)
      }
    );

    const result = await response.json();

    if (!response.ok) {
      throw new Error(
        result.message || 'Unable to create PayPal order.'
      );
    }

    res.json({
      orderId: result.id,
      subtotal,
      shipping: ship,
      shippingDiscount: promo.discount,
      promoCode: promo.appliedCode,
      total: grand
    });

  } catch (error) {
    res.status(400).json({
      error: error.message || 'Unable to create payment.'
    });
  }
});

// PUBLIC PAYPAL CLIENT CONFIG FOR JS SDK
app.get('/api/paypal/config', (req, res) => {
  const clientId = process.env.PAYPAL_CLIENT_ID;

  if (!clientId) {
    return res.status(503).json({
      error: 'PayPal is not configured.'
    });
  }

  res.json({
    clientId,
    currency: 'USD'
  });
});

// CAPTURE PAYPAL PAYMENT FROM JS SDK
app.post('/api/paypal/capture', async (req, res) => {
  try {
    const orderID = req.body?.orderID;

    if (!orderID) {
      throw new Error('Missing PayPal order ID.');
    }

    const { token, base } = await accessToken();

    const response = await fetch(
      `${base}/v2/checkout/orders/${encodeURIComponent(orderID)}/capture`,
      {
        method: 'POST',
        headers: {
          Authorization: 'Bearer ' + token,
          'Content-Type': 'application/json'
        }
      }
    );

    const result = await response.json();

    if (!response.ok || result.status !== 'COMPLETED') {
      throw new Error(
        result.message || 'Payment capture failed.'
      );
    }

    res.json({
      success: true,
      orderId: orderID,
      status: result.status,
      redirectUrl: '/success.html?order_id=' + encodeURIComponent(orderID)
    });

  } catch (error) {
    res.status(400).json({
      error: error.message || 'Payment capture failed.'
    });
  }
});

// START SERVER
app.listen(PORT, () => {
  console.log(`Built2BoomCustoms running on ${PORT}`);
});
