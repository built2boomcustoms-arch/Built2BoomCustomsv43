const express = require('express');
const app=express();
const PORT=process.env.PORT||3000;

app.use(express.json({limit:'100kb'}));
app.use(express.static(__dirname));

const BOX={
  1800:25,
  2800:40,
  3800:50,
  4800:70,
  5800:100,
  9800:160
};

const SHIPPING={
  1800:20,
  2800:20,
  3800:25,
  4800:35,
  5800:50,
  9800:95
};

const BRANDS={
  'Scosche':50,
  'Kenwood':50,
  'Pyle':50,
  'Skar Audio':60,
  'Pioneer':60,
  'Boss Audio':60,
  'DS18':70,
  'Memphis Audio':85,
  'Kicker':90,
  'JBL':90,
  'Infinity':90,
  'Rockford Fosgate':100,
  'Wet Sounds':160,
  'JL Audio':190
};

// Pair prices by speaker size. Unlisted brands retain their existing pair prices.
const SPEAKER_PAIR_PRICES={
  '6.5"':{'Pyle':45,'Skar Audio':60,'DS18':85,'Memphis Audio':105,'JBL':115,'Infinity':115,'Scosche':50},
  '6×9':{'Scosche':60,'Kenwood':60,'Pyle':65,'Skar Audio':75,'Pioneer':45,'Boss Audio':55,'DS18':85,'Memphis Audio':110,'Kicker':100,'JBL':115,'Infinity':130,'Rockford Fosgate':115,'Wet Sounds':650,'JL Audio':200}
};

const SUB_BRANDS_BY_SIZE={
  '4"':{
    'Generic-Amazon':35
  },
  '5"':{
    'Generic-Amazon':35
  },
  '6.5"':{
    'Pyle':55,
    'Skar Audio':95,
    'CT Sounds':100,
    'PRV Audio':100,
    'DS18':135
  },
  '8"':{
    'Generic-Amazon':35,
    'Pyle':65,
    'Skar Audio':105,
    'Kicker':125,
    'Rockford Fosgate':175,
    'Pioneer':185,
    'JL Audio':225,
    'Memphis Audio':225
  },
  '10"':{
    'Pyle':120,
    'Skar Audio':145,
    'Kicker':175,
    'Rockford Fosgate':170,
    'Pioneer':205,
    'JBL':160,
    'JL Audio':170,
    'DS18':170,
    'Wet Sounds':440
  },
  '12"':{
    'Pyle':140,
    'Skar Audio':165,
    'Kicker':185,
    'Rockford Fosgate':225,
    'Pioneer':175,
    'JBL':170,
    'JL Audio':190,
    'DS18':175,
    'Wet Sounds':550
  }
};

const POWER={
  'Include Battery and Charger Bundle':60,
  'DeWalt 20V':15,
  'Milwaukee M18':15,
  'Hart 20V':15,
  'Ryobi 18V':15,
  'Makita 18V':15,
  'Other':15
};

const TWEETER_PRICES={
  0:0,
  1:20,
  2:40,
  3:55,
  4:70
};

const SMALL_BOX_BRANDS=[
  'Pyle',
  'Boss Audio',
  'Skar Audio',
  'DS18',
  'Kicker',
  'Kenwood',
  'Pioneer',
  'Rockford Fosgate'
];

function val(build,key){
  return build?.selections?.[key]?.value??'';
}

function caseCode(build){
  const code=String(val(build,'case'));
  return Object.hasOwn(BOX,code)?code:'';
}

function calculate(build){
  let total=0;

  const box=caseCode(build);
  if(!(box in BOX)){
    throw new Error('Invalid box selection.');
  }
  total+=BOX[box];

  const count=Number(
    (String(val(build,'count')).match(/\d+/)||['0'])[0]
  );

  if(!count){
    throw new Error('Invalid speaker count.');
  }

  if(box==='1800'){
    if(![1,2].includes(count)){
      throw new Error(
        'Small box supports only 1 or 2 speakers.'
      );
    }
    if(val(build,'size')!=='4"'){
      throw new Error(
        'Small box requires 4-inch speakers.'
      );
    }
    if(val(build,'sub')==='Yes'){
      throw new Error(
        'Small box cannot have a subwoofer.'
      );
    }
  }

  if(val(build,'color')==='Custom'){
    total+=35;
  }

  const brand=val(build,'brand');
  if(!Object.hasOwn(BRANDS,brand)){
    throw new Error('Invalid speaker brand.');
  }

  if(
    box==='1800' &&
    !SMALL_BOX_BRANDS.includes(brand)
  ){
    throw new Error(
      'Choose an available 4-inch speaker brand for the Small box.'
    );
  }

  const speakerSize=val(build,'size');
  if(box!=='1800' && !['6.5"','6×9'].includes(speakerSize)){
    throw new Error('Invalid speaker size.');
  }
  const pairPrice=SPEAKER_PAIR_PRICES[speakerSize]?.[brand]??BRANDS[brand];
  total+=pairPrice*count/2;

  const sub=val(build,'sub')==='Yes';
  const subCount=
    val(build,'subCount')==='2 Subwoofers'
      ? 2
      : (sub?1:0);

  if(sub){
    const sb=val(build,'subBrand');
    const size=val(build,'subSize');
    const available=SUB_BRANDS_BY_SIZE[size];

    if(
      !available ||
      !Object.hasOwn(available,sb)
    ){
      throw new Error(
        'Invalid subwoofer brand for selected size.'
      );
    }

    total+=available[sb]*subCount;
  }

  const power=val(build,'power');
  if(!Object.hasOwn(POWER,power)){
    throw new Error('Invalid power selection.');
  }
  // Big Daddy needs two power systems; other boxes need one.
  total+=POWER[power]*(box==='9800'?2:1);

  const tweeterCount=Number(
    (String(val(build,'tweeters')).match(/\d+/)||['0'])[0]
  );

  if(!Object.hasOwn(TWEETER_PRICES,tweeterCount)){
    throw new Error('Invalid tweeter count.');
  }
  total+=TWEETER_PRICES[tweeterCount];

  const extra=val(build,'extra');
  const extras=extra==='None'
    ? []
    : String(extra).split(' + ').filter(Boolean);

  if(extras.includes('Battery Voltage and Charging Port')){
    total+=35;
  }
  if(extras.includes('Custom Name / Logo')){
    total+=30;
  }

  total+=Math.ceil(count/2)*35+subCount*35;

  return Math.round(total);
}

function shipping(build){
  const code=caseCode(build);
  if(!(code in SHIPPING)){
    throw new Error('Unable to calculate shipping.');
  }
  return SHIPPING[code];
}

async function accessToken(){
  const id=process.env.PAYPAL_CLIENT_ID;
  const secret=process.env.PAYPAL_CLIENT_SECRET;

  if(!id||!secret){
    throw new Error(
      'PayPal is not connected yet. Add PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET to the server environment.'
    );
  }

  const base=process.env.PAYPAL_ENV==='live'
    ? 'https://api-m.paypal.com'
    : 'https://api-m.sandbox.paypal.com';

  const response=await fetch(base+'/v1/oauth2/token',{
    method:'POST',
    headers:{
      Authorization:'Basic '+
        Buffer.from(id+':'+secret).toString('base64'),
      'Content-Type':'application/x-www-form-urlencoded'
    },
    body:'grant_type=client_credentials'
  });

  const data=await response.json();

  if(!response.ok){
    throw new Error(
      data.error_description||'PayPal authentication failed.'
    );
  }

  return {
    token:data.access_token,
    base
  };
}

// Google Sheets is the durable record for each checkout.
// No local disk storage.
async function sheetsRequest(action,orderId,order){
  const url=process.env.GOOGLE_SHEETS_URL;
  const secret=process.env.ORDER_API_SECRET;

  if(!url||!secret){
    throw new Error(
      'Google Sheets connection is not configured.'
    );
  }

  const controller=new AbortController();
  const timer=setTimeout(
    ()=>controller.abort(),
    15000
  );

  try{
    const response=await fetch(url,{
      method:'POST',
      headers:{
        'Content-Type':'text/plain;charset=utf-8'
      },
      body:JSON.stringify({
        secret,
        action,
        orderId,
        order
      }),
      redirect:'follow',
      signal:controller.signal
    });

    const raw=await response.text();

    let result;

    try{
      result=JSON.parse(raw);
    }catch{
      throw new Error(
        'Google Sheets returned a non-JSON response. Check the Apps Script deployment and access settings.'
      );
    }

    if(!response.ok||!result.success){
      throw new Error(
        result.error||'Google Sheets rejected the order.'
      );
    }

    return result;

  }finally{
    clearTimeout(timer);
  }
}

function emailHtml(order){
  const escape=s=>String(s??'')
    .replace(/[&<>"']/g,c=>({
      '&':'&amp;',
      '<':'&lt;',
      '>':'&gt;',
      '"':'&quot;',
      "'":'&#39;'
    }[c]));

  const rows=Object.entries(
    order.build?.selections||{}
  ).map(([k,v])=>
    `<tr>
      <td style="padding:7px;border:1px solid #ddd">
        ${escape(k)}
      </td>
      <td style="padding:7px;border:1px solid #ddd">
        ${escape(v?.value??v)}
      </td>
    </tr>`
  ).join('');

  const c=order.customer||{};

  const addr=[
    c.address1,
    c.address2,
    c.city,
    c.state,
    c.zip
  ].filter(Boolean).join(', ');

  return `
    <h2>Paid Built2BoomCustoms Order</h2>

    <p>
      <b>PayPal order:</b> ${escape(order.orderId)}
    </p>

    <p>
      <b>Customer:</b> ${escape(c.name)}<br>
      <b>Email:</b> ${escape(c.email)}<br>
      <b>Phone:</b> ${escape(c.phone)}<br>
      <b>Ship to:</b> ${escape(addr)}
    </p>

    <table style="border-collapse:collapse">
      ${rows}
    </table>

    <p>
      <b>Subtotal:</b> $${escape(order.subtotal)}<br>
      <b>Promo code:</b> ${escape(order.promoCode||'None')}<br>
      <b>Discount:</b> -$${escape(Number(order.discount||0).toFixed(2))}<br>
      <b>Shipping:</b> $${escape(order.shipping)}<br>
      <b>Total paid:</b> $${escape(order.total)}
    </p>

    <p>
      See your Google Sheet for the parts checklist
      and order status.
    </p>
  `;
}

async function sendOrderEmail(order){
  const key=process.env.RESEND_API_KEY;

  // Uses your existing Render environment variable.
  const from=
    process.env.ORDER_EMAIL_FROM||
    process.env.RESEND_FROM_EMAIL;

  const to=
    process.env.ORDER_NOTIFICATION_EMAIL||
    'built2boomcustoms@gmail.com';

  if(!key||!from){
    throw new Error(
      'Resend email settings are missing.'
    );
  }

  const response=await fetch(
    'https://api.resend.com/emails',
    {
      method:'POST',
      headers:{
        Authorization:'Bearer '+key,
        'Content-Type':'application/json'
      },
      body:JSON.stringify({
        from,
        to:[to],
        subject:
          'PAID Built2BoomCustoms order '+
          order.orderId,
        html:emailHtml(order)
      })
    }
  );

  const result=await response.json();

  if(!response.ok){
    throw new Error(
      result.message||'Resend rejected the email.'
    );
  }

  return result;
}

async function afterSuccessfulCapture(orderID){
  // Google Sheets already contains the pending build.
  // Marking it paid returns the original order.
  // Never mark an order paid without verifying PayPal.
  const saved=await sheetsRequest('paid',orderID);

  if(!saved.order){
    throw new Error(
      'Paid order was not found in Google Sheets.'
    );
  }

  if(saved.emailSent){
    return;
  }

  await sendOrderEmail(saved.order);
  await sheetsRequest('email_sent',orderID);
}

async function capturePayPalOrder(orderID){
  const {token,base}=await accessToken();

  const response=await fetch(
    `${base}/v2/checkout/orders/${encodeURIComponent(orderID)}/capture`,
    {
      method:'POST',
      headers:{
        Authorization:'Bearer '+token,
        'Content-Type':'application/json',
        'PayPal-Request-Id':
          'b2b-capture-'+orderID
      }
    }
  );

  const data=await response.json();

  if(
    response.ok&&
    data.status==='COMPLETED'
  ){
    return data;
  }

  // A retry can find a previously completed capture.
  // Verify with PayPal before treating it as paid.
  const check=await fetch(
    `${base}/v2/checkout/orders/${encodeURIComponent(orderID)}`,
    {
      headers:{
        Authorization:'Bearer '+token
      }
    }
  );

  const details=await check.json();

  if(
    check.ok&&
    details.status==='COMPLETED'&&
    details.purchase_units?.some(u=>
      u.payments?.captures?.some(
        c=>c.status==='COMPLETED'
      )
    )
  ){
    return details;
  }

  throw new Error(
    data.message||'Payment was not completed.'
  );
}

// Return the public PayPal Client ID to payment.html.
app.get('/api/paypal/config',(req,res)=>{
  const clientId=process.env.PAYPAL_CLIENT_ID;

  if(!clientId){
    return res.status(503).json({
      error:
        'PayPal Client ID is not configured on the server.'
    });
  }

  res.json({clientId});
});

// Create the PayPal order.
app.post('/api/paypal/orders',async(req,res)=>{
  try{
    const {
      customer,
      build,
      promoCode
    }=req.body||{};

    if(
      !customer?.name||
      !customer?.email||
      !customer?.phone||
      !customer?.address1||
      !customer?.city||
      !customer?.state||
      !customer?.zip||
      !build
    ){
      throw new Error(
        'Missing customer, shipping, or build information.'
      );
    }

    const subtotal=calculate(build);
    const appliedPromoCode=String(promoCode||'').trim().toUpperCase();
    if(appliedPromoCode && !['KALVEN','BOOMER'].includes(appliedPromoCode)){
      throw new Error('Invalid promo code.');
    }
    // BOOMER discounts the build only, not shipping.
    const discount=appliedPromoCode==='BOOMER'
      ? Math.round(subtotal*15)/100
      : 0;
    const ship=appliedPromoCode==='KALVEN'?0:shipping(build);
    const grand=Math.round((subtotal-discount+ship)*100)/100;

    const {token,base}=await accessToken();

    const site=
      process.env.PUBLIC_URL||
      `${req.protocol}://${req.get('host')}`;

    const compact=[
      val(build,'batteryVoltage')
        ? 'Battery '+val(build,'batteryVoltage')
        : '',
      val(build,'otherPower')
        ? 'Power '+val(build,'otherPower')
        : '',
      ...Object.entries(build.selections||{})
        .filter(([key])=>
          ![
            'batteryVoltage',
            'otherPower'
          ].includes(key)
        )
        .map(([,item])=>item.value)
    ]
      .filter(Boolean)
      .join(' | ')
      .slice(0,120);

    const body={
      intent:'CAPTURE',
      purchase_units:[
        {
          description:
            'Built2BoomCustoms Custom Speaker Build',

          custom_id:compact,

          amount:{
            currency_code:'USD',
            value:grand.toFixed(2),

            breakdown:{
              item_total:{
                currency_code:'USD',
                value:subtotal.toFixed(2)
              },

              shipping:{
                currency_code:'USD',
                value:ship.toFixed(2)
              },
              discount:{
                currency_code:'USD',
                value:discount.toFixed(2)
              }
            }
          },

          items:[
            {
              name:'Custom Speaker Build',
              quantity:'1',

              unit_amount:{
                currency_code:'USD',
                value:subtotal.toFixed(2)
              }
            }
          ],

          shipping:{
            name:{
              full_name:customer.name
            },

            address:{
              address_line_1:customer.address1,
              address_line_2:
                customer.address2||undefined,
              admin_area_2:customer.city,
              admin_area_1:
                customer.state.toUpperCase(),
              postal_code:customer.zip,
              country_code:'US'
            }
          }
        }
      ],

      payment_source:{
        paypal:{
          experience_context:{
            brand_name:'Built2BoomCustoms',
            shipping_preference:
              'SET_PROVIDED_ADDRESS',
            user_action:'PAY_NOW',
            return_url:
              `${site}/api/paypal/capture`,
            cancel_url:
              `${site}/payment.html`
          }
        }
      }
    };

    const response=await fetch(
      base+'/v2/checkout/orders',
      {
        method:'POST',

        headers:{
          Authorization:'Bearer '+token,
          'Content-Type':'application/json',
          'PayPal-Request-Id':
            'b2b-'+Date.now()
        },

        body:JSON.stringify(body)
      }
    );

    const data=await response.json();

    if(!response.ok){
      throw new Error(
        data.message||
        'Unable to create PayPal order.'
      );
    }

    const approve=data.links?.find(
      link=>
        link.rel==='payer-action'||
        link.rel==='approve'
    )?.href;

    if(!approve){
      throw new Error(
        'PayPal approval link was not returned.'
      );
    }

    // Save the complete build before payment.
    // If saving fails, stop checkout rather than
    // risk losing the customer's selections.
    await sheetsRequest(
      'pending',
      data.id,
      {
        orderId:data.id,
        customer,
        build,
        subtotal,
        discount,
        shipping:ship,
        total:grand,
        promoCode:appliedPromoCode,
        createdAt:new Date().toISOString()
      }
    );

    res.json({
      orderId:data.id,
      approveUrl:approve,
      subtotal,
      discount,
      shipping:ship,
      total:grand
    });

  }catch(error){
    console.error(
      'Order creation failed:',
      error.message
    );

    res.status(400).json({
      error:
        error.message||
        'Unable to create payment.'
    });
  }
});

// Capture payment when the PayPal button is approved.
app.post('/api/paypal/capture',async(req,res)=>{
  const orderID=req.body?.orderID;

  if(
    typeof orderID!=='string'||
    !/^[-A-Za-z0-9]+$/.test(orderID)
  ){
    return res.status(400).json({
      error:'Invalid PayPal order ID.'
    });
  }

  try{
    await capturePayPalOrder(orderID);
  }catch(error){
    return res.status(400).json({
      error:
        error.message||
        'Payment capture failed.'
    });
  }

  // A successful payment must not be reported
  // as failed just because email or Sheets fails.
  try{
    await afterSuccessfulCapture(orderID);
  }catch(error){
    console.error(
      'PAID ORDER NEEDS FOLLOW-UP',
      orderID,
      error.message
    );
  }

  res.json({
    status:'COMPLETED',
    orderID
  });
});

// Support PayPal's redirect return flow.
app.get('/api/paypal/capture',async(req,res)=>{
  const orderID=req.query.token;

  if(
    typeof orderID!=='string'||
    !/^[-A-Za-z0-9]+$/.test(orderID)
  ){
    return res.status(400).send(
      'Invalid PayPal order ID.'
    );
  }

  try{
    await capturePayPalOrder(orderID);
  }catch(error){
    return res.status(400).send(
      'Payment could not be completed. Please contact support.'
    );
  }

  try{
    await afterSuccessfulCapture(orderID);
  }catch(error){
    console.error(
      'PAID ORDER NEEDS FOLLOW-UP',
      orderID,
      error.message
    );
  }

  res.redirect(
    '/success.html?order_id='+
    encodeURIComponent(orderID)
  );
});

app.listen(PORT,()=>{
  console.log(
    `Built2BoomCustoms running on ${PORT}`
  );
});
