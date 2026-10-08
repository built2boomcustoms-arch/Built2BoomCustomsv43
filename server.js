const express=require('express');
const path=require('path');

const app=express();
const PORT=process.env.PORT||3000;

app.use(express.json({limit:'100kb'}));
app.use(express.static(__dirname));

const BOX={1800:15,2800:30,3800:40,4800:60,5800:90,9800:150};
const SHIPPING={1800:15,2800:20,3800:25,4800:35,5800:50,9800:95};

const BRANDS={
'Customer Supplied':0,
'Kenwood':40,
'Pyle':40,
'Skar Audio':50,
'Pioneer':50,
'Boss Audio':50,
'DS18':60,
'Memphis Audio':75,
'Kicker':80,
'JBL':80,
'Infinity':80,
'Rockford Fosgate':90,
'Wet Sounds':150,
'JL Audio':180
};

const SUB_BRANDS={
'Kicker':120,
'Rockford Fosgate':130,
'JBL':110,
'DS18':100,
'Skar Audio':90,
'Memphis Audio':130,
'Wet Sounds':250,
'JL Audio':250,
'Kenwood':100,
'Pioneer':100,
'Infinity':110,
'Boss Audio':50,
'Pyle':40,
'Customer Supplied':0
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

const pendingOrders=new Map();

function val(b,k){
return b?.selections?.[k]?.value??'';
}

function caseCode(build){
return String(val(build,'case')).match(/1800|2800|3800|4800|5800|9800/)?.[0]||'';
}

function calculate(build){
let total=0;

const box=caseCode(build);

if(!(box in BOX))
throw new Error('Invalid box selection.');

total+=BOX[box];

if(val(build,'color')==='Custom')
total+=25;

const count=Number((val(build,'count').match(/\d+/)||['0'])[0]);

if(!count)
throw new Error('Invalid speaker count.');

const brand=val(build,'brand');

if(!(brand in BRANDS))
throw new Error('Invalid speaker brand.');

total+=BRANDS[brand]*count/2;

const sub=val(build,'sub')==='Yes';

const subCount=
val(build,'subCount')==='2 Subwoofers'
?2
:(sub?1:0);

if(sub){
const sb=val(build,'subBrand');

if(!(sb in SUB_BRANDS))
throw new Error('Invalid subwoofer brand.');

total+=SUB_BRANDS[sb]*subCount;
}

const power=val(build,'power');

if(!(power in POWER))
throw new Error('Invalid power selection.');

total+=POWER[power];

total+=Number(
(val(build,'tweeters').match(/\d+/)||['0'])[0]
)*10;

const extra=val(build,'extra');

const extras=
extra==='None'
?[]
:extra.split(' + ').filter(Boolean);

if(extras.includes('Battery Voltage and Charging Port'))
total+=25;

if(extras.includes('Custom Name / Logo'))
total+=20;

total+=Math.ceil(count/2)*25+subCount*25;

return Math.round(total);
}

function shipping(build){
const c=caseCode(build);

if(!(c in SHIPPING))
throw new Error('Unable to calculate shipping.');

return SHIPPING[c];
}

function esc(v){
return String(v??'').replace(
/[&<>"']/g,
c=>({
'&':'&amp;',
'<':'&lt;',
'>':'&gt;',
'"':'&quot;',
"'":'&#39;'
}[c])
);
}

function money(v){
return '$'+Number(v||0).toFixed(2);
}

function buildRows(build){

const labels={
case:'Case Size',
color:'Case Color',
customColor:'Custom Color',
sub:'Subwoofer',
subCount:'Number of Subwoofers',
subBrand:'Subwoofer Brand',
subLocation:'Subwoofer Location',
subSize:'Subwoofer Size',
count:'Number of Speakers',
tweeters:'Extra Tweeters',
power:'Power System',
otherPower:'Custom Power Brand',
brand:'Speaker Brand',
size:'Speaker Size',
extra:'Extras',
customLogoText:'Custom Name / Logo',
customLogoFont:'Logo Font',
customLogoLocation:'Logo Location'
};

const order=[
'case',
'color',
'customColor',
'count',
'brand',
'size',
'tweeters',
'sub',
'subCount',
'subBrand',
'subSize',
'subLocation',
'power',
'otherPower',
'extra',
'customLogoText',
'customLogoFont',
'customLogoLocation'
];

return order
.filter(key=>{
const item=build?.selections?.[key];
return item && item.value!=='' && item.value!==undefined;
})
.map(key=>{

const item=build.selections[key];
const label=labels[key]||key;
const value=item.value;

return `
<tr>
<td style="padding:9px;border-bottom:1px solid #ddd">
<b>${esc(label)}</b>
</td>

<td style="padding:9px;border-bottom:1px solid #ddd">
${esc(value)}
</td>
</tr>
`;

})
.join('');
}

async function sendOrderEmail(order){

const apiKey=process.env.RESEND_API_KEY;

if(!apiKey){
console.error(
'Order email skipped: RESEND_API_KEY is missing.'
);
return;
}

const c=order.customer||{};
const capture=order.capture||{};

const captureID=
capture?.purchase_units?.[0]
?.payments?.captures?.[0]?.id
||'Not provided';

const status=capture?.status||'COMPLETED';

const address=[
c.address1,
c.address2,
[c.city,c.state,c.zip]
.filter(Boolean)
.join(', ')
]
.filter(Boolean)
.map(esc)
.join('<br>');

const html=`
<div style="font-family:Arial,sans-serif;max-width:760px;margin:auto">

<h1>🔊 New Built2BoomCustoms Order</h1>

<p style="font-size:18px">
A new order has been <b>paid successfully</b> and is ready to be built.
</p>

<hr>

<h2>Customer Information</h2>

<p>
<b>Name:</b> ${esc(c.name)}<br>
<b>Email:</b> ${esc(c.email)}<br>
<b>Phone:</b> ${esc(c.phone)}
</p>

<h2>Shipping Address</h2>

<p>
${address}<br>
United States
</p>

<hr>

<h2>Payment Information</h2>

<p>
<b>Payment Status:</b> ${esc(status)}<br>
<b>PayPal Order ID:</b> ${esc(order.orderID)}<br>
<b>PayPal Capture ID:</b> ${esc(captureID)}
</p>

<h2>Build Details</h2>

<table style="border-collapse:collapse;width:100%">
${buildRows(order.build)}
</table>

<h2>Payment</h2>

<p>
<b>Subtotal:</b> ${money(order.subtotal)}<br>
<b>Shipping:</b> ${money(order.shipping)}<br>
<b>Total Paid:</b> ${money(order.total)}
</p>

</div>
`;

const r=await fetch(
'https://api.resend.com/emails',
{
method:'POST',

headers:{
Authorization:'Bearer '+apiKey,
'Content-Type':'application/json'
},

body:JSON.stringify({

from:
process.env.ORDER_EMAIL_FROM
||'Built2BoomCustoms <onboarding@resend.dev>',

to:[
'built2boomcustoms@gmail.com'
],

subject:
`PAID ORDER - ${c.name||'Customer'} - ${money(order.total)} - Built2BoomCustoms`,

html

})
}
);

if(!r.ok){

const body=await r.text();

throw new Error(
'Resend email failed: '+body
);

}

}

async function emailCapturedOrder(orderID,capture){

const order=pendingOrders.get(orderID);

if(!order){

console.error(
'Order email skipped: no saved order details for '+orderID
);

return;

}

try{

await sendOrderEmail({
...order,
orderID,
capture
});

pendingOrders.delete(orderID);

}catch(e){

console.error(
'Order payment succeeded, but notification email failed:',
e.message
);

}

}

async function accessToken(){

const id=process.env.PAYPAL_CLIENT_ID;
const secret=process.env.PAYPAL_CLIENT_SECRET;

if(!id||!secret)
throw new Error(
'PayPal is not connected yet. Add PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET to the server environment.'
);

const base=
process.env.PAYPAL_ENV==='live'
?'https://api-m.paypal.com'
:'https://api-m.sandbox.paypal.com';

const r=await fetch(
base+'/v1/oauth2/token',
{
method:'POST',

headers:{
Authorization:
'Basic '+
Buffer.from(id+':'+secret).toString('base64'),

'Content-Type':
'application/x-www-form-urlencoded'
},

body:'grant_type=client_credentials'
}
);

const j=await r.json();

if(!r.ok)
throw new Error(
j.error_description||
'PayPal authentication failed.'
);

return {
token:j.access_token,
base
};

}

app.get(
'/api/paypal/config',
(req,res)=>{

const id=process.env.PAYPAL_CLIENT_ID;

if(!id)
return res.status(500).json({
error:'PayPal client ID is not configured.'
});

res.json({
clientId:id,
env:
process.env.PAYPAL_ENV==='live'
?'live'
:'sandbox'
});

}
);

app.post(
'/api/paypal/orders',
async(req,res)=>{

try{

const {customer,build}=req.body||{};

if(
!customer?.name||
!customer?.email||
!customer?.phone||
!customer?.address1||
!customer?.city||
!customer?.state||
!customer?.zip||
!build
)
throw new Error(
'Missing customer, shipping, or build information.'
);

const subtotal=calculate(build);
const ship=shipping(build);
const grand=subtotal+ship;

const {token,base}=await accessToken();

const compact=
Object.values(build.selections||{})
.map(x=>x.value)
.filter(Boolean)
.join(' | ')
.slice(0,120);

const body={

intent:'CAPTURE',

purchase_units:[{

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
}

}

},

items:[{

name:'Custom Speaker Build',

quantity:'1',

unit_amount:{
currency_code:'USD',
value:subtotal.toFixed(2)
}

}],

shipping:{

name:{
full_name:customer.name
},

address:{

address_line_1:
customer.address1,

address_line_2:
customer.address2||undefined,

admin_area_2:
customer.city,

admin_area_1:
customer.state.toUpperCase(),

postal_code:
customer.zip,

country_code:'US'

}

}

}]

};

const r=await fetch(
base+'/v2/checkout/orders',
{

method:'POST',

headers:{

Authorization:
'Bearer '+token,

'Content-Type':
'application/json',

'PayPal-Request-Id':
'b2b-'+Date.now()

},

body:JSON.stringify(body)

}
);

const j=await r.json();

if(!r.ok)
throw new Error(
j.message||
'Unable to create PayPal order.'
);

pendingOrders.set(
j.id,
{
customer,
build,
subtotal,
shipping:ship,
total:grand,
createdAt:Date.now()
}
);

res.json({
orderId:j.id,
subtotal,
shipping:ship,
total:grand
});

}catch(e){

res.status(400).json({
error:
e.message||
'Unable to create payment.'
});

}

}
);

app.post(
'/api/paypal/orders/:orderID/capture',
async(req,res)=>{

try{

const orderID=req.params.orderID;

if(!orderID)
throw new Error(
'Missing PayPal order ID.'
);

const {token,base}=await accessToken();

const r=await fetch(
`${base}/v2/checkout/orders/${encodeURIComponent(orderID)}/capture`,
{

method:'POST',

headers:{
Authorization:'Bearer '+token,
'Content-Type':'application/json'
}

}
);

const j=await r.json();

if(!r.ok)
throw new Error(
j.message||
'Payment capture failed.'
);

await emailCapturedOrder(
orderID,
j
);

res.json(j);

}catch(e){

res.status(400).json({
error:
e.message||
'Payment could not be completed.'
});

}

}
);

app.get(
'/api/paypal/capture',
async(req,res)=>{

try{

const orderID=req.query.token;

if(!orderID)
throw new Error(
'Missing PayPal order ID.'
);

const {token,base}=await accessToken();

const r=await fetch(
`${base}/v2/checkout/orders/${encodeURIComponent(orderID)}/capture`,
{

method:'POST',

headers:{
Authorization:'Bearer '+token,
'Content-Type':'application/json'
}

}
);

const j=await r.json();

if(!r.ok)
throw new Error(
j.message||
'Payment capture failed.'
);

await emailCapturedOrder(
orderID,
j
);

res.redirect(
'/success.html?order_id='+
encodeURIComponent(orderID)
);

}catch(e){

res.status(400).send(
'Payment could not be completed: '+
e.message
);

}

}
);

app.listen(
PORT,
()=>console.log(
`Built2BoomCustoms running on ${PORT}`
)
);
