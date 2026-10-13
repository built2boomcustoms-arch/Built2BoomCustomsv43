total += BOX[box];

  if (val(build, 'color') === 'Custom') total += 25;

  const count = Number((String(val(build, 'count')).match(/\d+/) || ['0'])[0]);
  if (!count) throw new Error('Invalid speaker count.');

  const brand = val(build, 'brand');
  if (!(brand in BRANDS)) throw new Error('Invalid speaker brand.');

  total += BRANDS[brand] * count / 2;

  const sub = val(build, 'sub') === 'Yes';
  const subCount = val(build, 'subCount') === '2 Subwoofers' ? 2 : (sub ? 1 : 0);

  if (sub) {
    const sb = val(build, 'subBrand');
    if (!(sb in SUB_BRANDS)) throw new Error('Invalid subwoofer brand.');
    total += SUB_BRANDS[sb] * subCount;
  }

  const power = val(build, 'power');
  if (!(power in POWER)) throw new Error('Invalid power selection.');

  total += POWER[power];
  total += Number((String(val(build, 'tweeters')).match(/\d+/) || ['0'])[0]) * 10;

  const extra = val(build, 'extra');
  const extras = extra === 'None' ? [] : String(extra).split(' + ').filter(Boolean);

  if (extras.includes('Battery Voltage and Charging Port')) total += 25;
  if (extras.includes('Custom Name / Logo')) total += 20;

  total += Math.ceil(count / 2) * 25 + subCount * 25;

  return Math.round(total);
}

function shipping(build) {
  const c = caseCode(build);
  if (!(c in SHIPPING)) throw new Error('Unable to calculate shipping.');
  return SHIPPING[c];
}

function applyPromo(build, promoCode) {
  const code = String(promoCode || '').trim().toUpperCase();
  const normalShipping = shipping(build);

  if (!code) {
    return { shipping: normalShipping, discount: 0, appliedCode: null };
  }

  const promo = Object.prototype.hasOwnProperty.call(PROMO_CODES, code)
    ? PROMO_CODES[code]
    : null;

  if (!promo) throw new Error('Invalid promo code.');

  return {
    shipping: promo.freeShipping ? 0 : normalShipping,
    discount: promo.freeShipping ? normalShipping : 0,
    appliedCode: code
  };
}

async function accessToken() {
  const id = process.env.PAYPAL_CLIENT_ID;
  const secret = process.env.PAYPAL_CLIENT_SECRET;

  if (!id || !secret) {
    throw new Error('PayPal is not connected yet.');
  }

  const base = process.env.PAYPAL_ENV === 'live'
    ? 'https://api-m.paypal.com'
    : 'https://api-m.sandbox.paypal.com';

  const r = await fetch(base + '/v1/oauth2/token', {
    method: 'POST',
    headers: {
      Authorization: 'Basic ' + Buffer.from(id + ':' + secret).toString('base64'),
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: 'grant_type=client_credentials'
  });

  const j = await r.json();
  if (!r.ok) throw new Error(j.error_description || 'PayPal authentication failed.');

  return { token: j.access_token, base };
}

app.post('/api/paypal/orders', async (req, res) => {
  try {
    const { customer, build, promoCode } = req.body || {};

    if (!customer?.name || !customer?.email || !customer?.phone ||
        !customer?.address1 || !customer?.city || !customer?.state ||
        !customer?.zip || !build) {
      throw new Error('Missing customer, shipping, or build information.');
    }

    const subtotal = calculate(build);
    const promo = applyPromo(build, promoCode);
    const ship = promo.shipping;
    const grand = subtotal + ship;

    const { token, base } = await accessToken();
    const site = process.env.PUBLIC_URL || `${req.protocol}://${req.get('host')}`;

    const compact = Object.values(build.selections || {})
      .map(x => x.value).filter(Boolean).join(' | ').slice(0, 120);

    const body = {
      intent: 'CAPTURE',
      purchase_units: [{
        description: 'Built2BoomCustoms Custom Speaker Build',
        custom_id: compact,
        amount: {
          currency_code: 'USD',
          value: grand.toFixed(2),
          breakdown: {
            item_total: { currency_code: 'USD', value: subtotal.toFixed(2) },
            shipping: { currency_code: 'USD', value: ship.toFixed(2) }
          }
        },
        items: [{
          name: 'Custom Speaker Build',
          quantity: '1',
          unit_amount: { currency_code: 'USD', value: subtotal.toFixed(2) }
        }],
        shipping: {
          name: { full_name: customer.name },
          address: {
            address_line_1: customer.address1,
            address_line_2: customer.address2 || undefined,
            admin_area_2: customer.city,
            admin_area_1: customer.state.toUpperCase(),
            postal_code: customer.zip,
            country_code: 'US'
          }
        }
      }],
      payment_source: {
        paypal: {
          experience_context: {
            brand_name: 'Built2BoomCustoms',
            shipping_preference: 'SET_PROVIDED_ADDRESS',
            user_action: 'PAY_NOW',
            return_url: `${site}/api/paypal/capture`,
            cancel_url: `${site}/payment.html`
          }
        }
      }
    };

    const r = await fetch(base + '/v2/checkout/orders', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer ' + token,
        'Content-Type': 'application/json',
        'PayPal-Request-Id': 'b2b-' + Date.now()
      },
      body: JSON.stringify(body)
    });

    const j = await r.json();
    if (!r.ok) throw new Error(j.message || 'Unable to create PayPal order.');

    const approve = j.links?.find(x =>
      x.rel === 'payer-action' || x.rel === 'approve'
    )?.href;

    if (!approve) throw new Error('PayPal approval link was not returned.');

    res.json({
      orderId: j.id,
      approveUrl: approve,
      subtotal,
      shipping: ship,
      shippingDiscount: promo.discount,
      promoCode: promo.appliedCode,
      total: grand
    });
  } catch (e) {
    res.status(400).json({ error: e.message || 'Unable to create payment.' });
  }
});

app.get('/api/paypal/capture', async (req, res) => {
  try {
    const orderID = req.query.token;
    if (!orderID) throw new Error('Missing PayPal order ID.');

    const { token, base } = await accessToken();

    const r = await fetch(
      `${base}/v2/checkout/orders/${encodeURIComponent(orderID)}/capture`,
      {
        method: 'POST',
        headers: {
          Authorization: 'Bearer ' + token,
          'Content-Type': 'application/json'
        }
      }
    );

    const j = await r.json();
    if (!r.ok || j.status !== 'COMPLETED') {
      throw new Error(j.message || 'Payment capture failed.');
    }

    res.redirect('/success.html?order_id=' + encodeURIComponent(orderID));
  } catch (e) {
    res.status(400).send('Payment could not be completed: ' + e.message);
  }
});

app.listen(PORT, () => {
  console.log(`Built2BoomCustoms running on ${PORT}`);
});
