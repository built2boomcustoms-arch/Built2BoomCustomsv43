
const state={};
const base=299;

const speakerConfigs={
  '1800':{counts:[[1,0]],sizes:[['6.5"',0],['6×9',15]],tweeters:[[0,0],[1,10],[2,20],[4,35]]},
  '2800':{counts:[[1,0]],sizes:[['6.5"',0],['6×9',15]],tweeters:[[0,0],[1,10],[2,20],[4,35]]},
  '3800':{counts:[[1,0],[2,35]],sizes:[['6.5"',0],['6×9',15]],tweeters:[[0,0],[1,10],[2,20],[4,35]]},
  '4800':{counts:[[1,0],[2,35]],sizes:[['6.5"',0],['6×9',15]],tweeters:[[0,0],[1,10],[2,20],[4,35]]},
  '5800':{counts:[[1,0],[2,35],[3,60],[4,85]],sizes:[['6.5"',0],['6×9',15]],tweeters:[[0,0],[1,10],[2,20],[4,35],[6,50]]},
  '9800':{counts:[[2,35],[4,85],[6,135],[8,190]],sizes:[['6.5"',0],['6×9',15]],tweeters:[[0,0],[1,10],[2,20],[4,35],[6,50],[8,65]]}
};

const subwooferSizes={
  '1800':[['4"',0],['5"',0],['6.5"',0]],
  '2800':[['4"',0],['5"',0],['6.5"',0]],
  '3800':[['8"',0]],
  '4800':[['4"',0],['5"',0],['6.5"',0]],
  '5800':[['8"',0],['10"',0],['12"',0]],
  '9800':[['8"',0],['10"',0],['12"',0]]
};

function updateSpeakerOptions(){
  const caseValue=(state.case||getDefault('case')).value;
  const baseCfg=speakerConfigs[caseValue]||speakerConfigs['1800'];
  let cfg={counts:baseCfg.counts.slice(),sizes:baseCfg.sizes.slice(),tweeters:baseCfg.tweeters.slice()};
  const twoSubs=state.subCount && state.subCount.value==='2 Subwoofers';
  const insideSubs=!state.subLocation || state.subLocation.value==='Inside Box';

  // Subwoofer configurations can reduce the amount of room available for speakers.
  if(caseValue==='9800' && twoSubs){
    // Two internal subs still allow up to 6 speakers; two external subs allow only 4.
    cfg.counts=baseCfg.counts.filter(x=>x[0] <= (insideSubs ? 6 : 4));
    cfg.tweeters=baseCfg.tweeters.filter(x=>x[0] <= 2);
  }
  if(caseValue==='5800' && state.sub && state.sub.value==='Yes'){
    cfg.counts=baseCfg.counts.filter(x=>x[0] <= 2);
  }

  const countBox=document.getElementById('speakerCountOptions');
  const sizeBox=document.getElementById('speakerSizeOptions');
  const tweeterBox=document.getElementById('tweeterOptions');
  const parsedCount=state.count?.value?.match(/\d+/);
  const currentCount=parsedCount&&cfg.counts.some(x=>x[0]===Number(parsedCount[0]))?Number(parsedCount[0]):cfg.counts[0][0];
  const currentSize=state.size&&cfg.sizes.some(x=>x[0]===state.size.value)?state.size.value:cfg.sizes[0][0];
  const tweeterNum=String(state.tweeters?.value||'').match(/\d+/);
  const currentTweeters=tweeterNum&&cfg.tweeters.some(x=>x[0]===Number(tweeterNum[0]))?Number(tweeterNum[0]):cfg.tweeters[0][0];
  state.count={value:String(currentCount)+(currentCount===1?' speaker':' speakers'),price:cfg.counts.find(x=>x[0]===currentCount)[1]};
  state.size={value:currentSize,price:cfg.sizes.find(x=>x[0]===currentSize)[1]};
  state.tweeters={value:currentTweeters===0?'None':String(currentTweeters),price:cfg.tweeters.find(x=>x[0]===currentTweeters)[1]};
  countBox.innerHTML=cfg.counts.map(x=>{const label=x[0]===1?'1 Speaker':x[0]+' Speakers';return `<button type="button" class="option ${currentCount===x[0]?'active':''}" data-dynamic-group="count" data-value="${label}" data-price="${x[1]}">${label}</button>`}).join('');
  sizeBox.innerHTML=cfg.sizes.map(x=>`<button type="button" class="option ${currentSize===x[0]?'active':''}" data-dynamic-group="size" data-value="${x[0]}" data-price="${x[1]}">${x[0]}</button>`).join('');
  tweeterBox.innerHTML=cfg.tweeters.map(x=>{const label=x[0]===0?'None':x[0]+' Tweeter'+(x[0]===1?'':'s');return `<button type="button" class="option ${currentTweeters===x[0]?'active':''}" data-dynamic-group="tweeters" data-value="${label}" data-price="${x[1]}">${label}</button>`}).join('');
  countBox.querySelectorAll('[data-dynamic-group]').forEach(btn=>btn.onclick=()=>{state.count={value:btn.dataset.value,price:Number(btn.dataset.price)};countBox.querySelectorAll('.option').forEach(x=>x.classList.remove('active'));btn.classList.add('active');render();});
  sizeBox.querySelectorAll('[data-dynamic-group]').forEach(btn=>btn.onclick=()=>{state.size={value:btn.dataset.value,price:Number(btn.dataset.price)};sizeBox.querySelectorAll('.option').forEach(x=>x.classList.remove('active'));btn.classList.add('active');render();});
  tweeterBox.querySelectorAll('[data-dynamic-group]').forEach(btn=>btn.onclick=()=>{state.tweeters={value:btn.dataset.value,price:Number(btn.dataset.price)};tweeterBox.querySelectorAll('.option').forEach(x=>x.classList.remove('active'));btn.classList.add('active');render();});
}

function getDefault(key){
  const el=document.querySelector(`[data-group="${key}"].active`);
  return el?{value:el.dataset.value,price:Number(el.dataset.price)}:null;
}

function updateSubwoofer(){
  const caseValue=(state.case||getDefault('case')).value;
  const sub=(state.sub||getDefault('sub')).value;
  const inline=document.getElementById('subLocationInline');
  const countInline=document.getElementById('subCountInline');
  const sizeStep=document.getElementById('subSizeStep');
  const sizeBox=document.getElementById('subSizeOptions');

  if(sub!=='Yes'){
    inline.style.display='none'; countInline.style.display='none'; sizeStep.style.display='none';
    delete state.subLocation; delete state.subSize; delete state.subCount;
    return;
  }

  inline.style.display='block'; sizeStep.style.display='block';
  if(caseValue==='9800'){
    countInline.style.display='block';
    if(!state.subCount) state.subCount={value:'1 Subwoofer',price:0};
    countInline.querySelectorAll('[data-group="subCount"]').forEach(x=>{x.classList.toggle('active',x.dataset.value===state.subCount.value); x.onclick=()=>{countInline.querySelectorAll('.option').forEach(y=>y.classList.remove('active'));x.classList.add('active');state.subCount={value:x.dataset.value,price:Number(x.dataset.price)};render();};});
  } else {
    countInline.style.display='none';
    state.subCount={value:'1 Subwoofer',price:0};
  }
  const sizes=subwooferSizes[caseValue]||subwooferSizes['1800'];
  const allowOutside=!['1800','2800','3800','4800'].includes(caseValue);
  const outside=inline.querySelector('[data-value="Outside Box"]');
  outside.style.display=allowOutside?'block':'none';
  if(!allowOutside){
    const inside=inline.querySelector('[data-value="Inside Box"]');
    inline.querySelectorAll('.option').forEach(x=>x.classList.remove('active'));
    inside.classList.add('active');
    state.subLocation={value:'Inside Box',price:0};
  } else if(!state.subLocation){
    state.subLocation={value:'Inside Box',price:0};
    inline.querySelector('[data-value="Inside Box"]').classList.add('active');
  }

  if(!state.subSize || !sizes.some(x=>x[0]===state.subSize.value)){
    state.subSize={value:sizes[0][0],price:sizes[0][1]};
  }

  sizeBox.innerHTML=sizes.map((x,i)=>`
    <button type="button" class="option ${state.subSize.value===x[0]?'active':''}" data-subsize="${x[0]}" data-price="${x[1]}">${x[0]}</button>
  `).join('');

  sizeBox.querySelectorAll('[data-subsize]').forEach(btn=>{
    btn.onclick=(e)=>{
      e.preventDefault();
      e.stopPropagation();
      state.subSize={value:btn.dataset.subsize,price:Number(btn.dataset.price)};
      sizeBox.querySelectorAll('[data-subsize]').forEach(x=>x.classList.toggle('active',x===btn));
      render();
    };
  });
}

const caseInfo={
  '1800':{name:'Small',dims:'9.25 × 7.5 × 4.375 in',colors:['Black'],image:'case_1800.png'},
  '2800':{name:'Small Medium',dims:'13.5 × 11.375 × 6 in',colors:['Black','Orange','Tan'],image:'case_2800.png'},
  '3800':{name:'Medium',dims:'16.5 × 13 × 6.75 in',colors:['Black','Orange','Tan'],image:'case_3800.png'},
  '4800':{name:'Largeish',dims:'20.3125 × 15.5 × 7.375 in',colors:['Black','Green','Orange','Tan','Yellow'],image:'case_4800.png'},
  '5800':{name:'Large on Wheels',dims:'21.875 × 13.75 × 9 in',colors:['Black'],image:'case_5800.png'},
  '9800':{name:'Big Daddy',dims:'53 × 16 × 6.125 in',colors:['Black','Tan','Green'],image:'case_9800.png'}
};

function updateColorOptions(){
  const caseValue=(state.case||getDefault('case')).value;
  const info=caseInfo[caseValue]||caseInfo['1800'];
  const box=document.getElementById('colorOptions');
  const current=state.color&&(info.colors.includes(state.color.value)||state.color.value==='Custom')?state.color.value:info.colors[0];
  state.color={value:current,price:current==='Custom'?25:0};
  box.innerHTML=info.colors.map(c=>`<button class="option color-option ${current===c?'active':''}" data-color="${c}"><span class="swatch ${c.toLowerCase()}"></span>${c}</button>`).join('')+
    `<button class="option color-option ${current==='Custom'?'active':''}" data-color="Custom"><span class="swatch" style="background:linear-gradient(135deg,#f44,#4cf,#fd4,#7f7,#c7f)"></span>Custom</button>`;
  box.querySelectorAll('[data-color]').forEach(btn=>btn.onclick=()=>{
    state.color={value:btn.dataset.color,price:btn.dataset.color==='Custom'?25:0};
    box.querySelectorAll('.option').forEach(x=>x.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById('customColorWrap').style.display=btn.dataset.color==='Custom'?'block':'none';
    document.getElementById('customPaintNote').style.display=btn.dataset.color==='Custom'?'block':'none';
    if(btn.dataset.color!=='Custom') delete state.customColor;
    render();
  });
  document.getElementById('customColorWrap').style.display=current==='Custom'?'block':'none';
  document.getElementById('customPaintNote').style.display=current==='Custom'?'block':'none';
  if(current==='Custom' && !state.customColor) state.customColor={value:'',price:0};
}

function openCaseModal(){
  const caseValue=(state.case||getDefault('case')).value;
  const info=caseInfo[caseValue]||caseInfo['1800'];
  document.getElementById('caseModalImage').src=info.image;
  document.getElementById('caseModalImage').alt=`${info.name} closed case`;
  document.getElementById('caseModalTitle').textContent=info.name;
  document.getElementById('caseModalDims').textContent=`${info.dims} • Closed case preview • Click outside or × to close`;
  const modal=document.getElementById('caseModal');
  modal.classList.add('open'); modal.setAttribute('aria-hidden','false');
}

function closeCaseModal(){
  const modal=document.getElementById('caseModal');
  modal.classList.remove('open'); modal.setAttribute('aria-hidden','true');
}

function render(){
  const buildCase=(state.case||getDefault('case')).value;
  const buildInfo=caseInfo[buildCase]||caseInfo['1800'];
  const buildImage=document.getElementById('buildCaseImage');
  if(buildImage){
    buildImage.src=buildInfo.image;
    buildImage.alt=`${buildInfo.name} closed case`;
  }
  updateSpeakerOptions();
  updateColorOptions();
  updateSubwoofer();
  const logoWrap=document.getElementById('logoWrap');
  logoWrap.style.display=(state.extra||getDefault('extra'))?.value==='Custom Name / Logo'?'block':'none';
  const logoLocation=document.getElementById('logoLocation');
  const multiSpeakers=Number((state.count||{}).value?.match(/\d+/)?.[0]||1)>1;
  [...logoLocation.options].forEach(o=>{if(o.value==='Below and Between the Speakers') o.hidden=!multiSpeakers;});
  if(!multiSpeakers && state.customLogoLocation?.value==='Below and Between the Speakers'){delete state.customLogoLocation;logoLocation.value='';}
  const groups=[
    ['case','Box Size'],['color','Color'],['count','Speakers'],['sub','Subwoofer'],['subCount','Subwoofers'],['subLocation','Sub Location'],['tweeters','Tweeters'],['size','Speaker Size'],
    ['power','Power System'],['otherPower','Custom Power Brand'],['brand','Speaker Brand'],['customColor','Custom Color'],['subSize','Sub Size'],['extra','Extras'],['customLogoText','Logo Text'],['customLogoFont','Logo Font'],['customLogoLocation','Logo Location'],['chargingType','Charging Type']
  ];
  let total=base, html='';
  groups.forEach(([key,label])=>{
    if((key==='subLocation'||key==='subSize'||key==='subCount') && (!state.sub || state.sub.value!=='Yes')) return;
    if(key==='subCount' && (state.case||getDefault('case')).value!=='9800') return;
    if(key==='otherPower' && (!state.power || state.power.value!=='Other')) return;
    if(key==='customColor' && (!state.color || state.color.value!=='Custom')) return;
    if(['customLogoText','customLogoFont','customLogoLocation'].includes(key) && (!state.extra || state.extra.value!=='Custom Name / Logo')) return;
    if(key==='chargingType' && (!state.extra || !['Charging Port','Battery Voltage and Charging Port'].includes(state.extra.value))) return;
    const x=state[key]||getDefault(key); if(!x || x.value==='')return;
    total+=x.price; html+=`<div class="line"><span>${label}</span><span>${x.value}</span></div>`;
  });
  document.getElementById('summaryLines').innerHTML=html;
  document.getElementById('total').textContent='$'+Math.max(0,total).toFixed(0);
}

document.querySelectorAll('[data-group="case"]').forEach(btn=>{
  btn.addEventListener('click',()=>{
    setTimeout(openCaseModal,0);
  });
});
document.getElementById('caseModal').addEventListener('click',e=>{if(e.target.id==='caseModal')closeCaseModal();});
document.getElementById('caseModalClose').addEventListener('click',closeCaseModal);
document.addEventListener('keydown',e=>{if(e.key==='Escape')closeCaseModal();});

document.querySelectorAll('.option[data-group]').forEach(btn=>{
  btn.addEventListener('click',()=>{
    const group=btn.dataset.group;
    document.querySelectorAll(`[data-group="${group}"]`).forEach(x=>x.classList.remove('active'));
    btn.classList.add('active');
    state[group]={value:btn.dataset.value,price:Number(btn.dataset.price)};
    if(group==='power'){
      document.getElementById('otherPowerWrap').style.display=btn.dataset.value==='Other'?'block':'none';
      if(btn.dataset.value!=='Other') delete state.otherPower;
    }
    if(group==='extra'){
      const needsCharging=btn.dataset.value==='Charging Port'||btn.dataset.value==='Battery Voltage and Charging Port';
      const needsLogo=btn.dataset.value==='Custom Name / Logo';
      document.getElementById('chargingPortWrap').style.display=needsCharging?'block':'none';
      document.getElementById('logoWrap').style.display=needsLogo?'block':'none';
      if(!needsCharging) delete state.chargingType;
      else if(!state.chargingType) state.chargingType={value:'Type C',price:0};
      if(!needsLogo){delete state.customLogoText;delete state.customLogoFont;delete state.customLogoLocation;}
    }
    render();
  });
});

document.querySelectorAll('[data-group="chargingType"]').forEach(btn=>{
  btn.addEventListener('click',()=>{
    document.querySelectorAll('[data-group="chargingType"]').forEach(x=>x.classList.remove('active'));
    btn.classList.add('active');
    state.chargingType={value:btn.dataset.value,price:Number(btn.dataset.price)};
    render();
  });
});

document.getElementById('otherPower').addEventListener('input',e=>{
  state.otherPower={value:e.target.value||'Other',price:0};
  render();
});

document.getElementById('customColor').addEventListener('input',e=>{
  state.customColor={value:e.target.value||'',price:0};
  render();
});

document.getElementById('logoText').addEventListener('input',e=>{state.customLogoText={value:e.target.value||'',price:0};render();});
document.getElementById('logoFont').addEventListener('input',e=>{state.customLogoFont={value:e.target.value||'',price:0};render();});
document.getElementById('logoLocation').addEventListener('change',e=>{state.customLogoLocation={value:e.target.value||'',price:0};render();});

render();

