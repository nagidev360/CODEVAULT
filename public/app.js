const $=s=>document.querySelector(s);
const license=$("#license"),app=$("#app"),status=$("#status"),logout=$("#logout");
let labels=[],selected=new Set();
const defaults={labelW:37,labelH:15,gapX:2,gapY:2,cols:2,rows:8,pad:1,radius:1,qrSize:100,qrEc:"M",qrMargin:2,qrPos:"left",qrText:"on",barType:"CODE128",barWidth:2,barHeight:45,barFont:10,barMargin:2,scale:"100"};

function unlock(){license.classList.add("hidden");app.classList.remove("hidden");logout.classList.remove("hidden");status.textContent="";sessionStorage.setItem("cv_license","1")}
if(sessionStorage.getItem("cv_license")==="1")unlock();

$("#verify").onclick=async()=>{
 const key=$("#key").value.trim();if(!key){status.textContent="Enter a NAGI.KEY license.";return}
 status.textContent="Verifying…";
 try{const r=await fetch("/api/license/verify",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({key})});const d=await r.json();if(!r.ok||!d.valid)throw Error(d.reason||"INVALID_KEY");unlock()}catch(e){status.textContent="Verification failed: "+e.message}
};
logout.onclick=()=>{sessionStorage.removeItem("cv_license");location.reload()};

function detectDelimiter(line){const a=[",",";","\t"];return a.sort((x,y)=>(line.split(y).length-1)-(line.split(x).length-1))[0]}
function parseCSV(text){
 text=String(text||"").replace(/^\uFEFF/,"").replace(/\r\n/g,"\n").replace(/\r/g,"\n");
 const first=text.split("\n").find(x=>x.trim())||"",delimiter=detectDelimiter(first),rows=[];let row=[],cell="",q=false;
 for(let i=0;i<text.length;i++){const c=text[i],n=text[i+1];
  if(c==="\""&&q&&n==="\""){cell+="\"";i++;continue}
  if(c==="\""){q=!q;continue}
  if(c===delimiter&&!q){row.push(cell.trim());cell="";continue}
  if(c==="\n"&&!q){row.push(cell.trim());if(row.some(v=>v!==""))rows.push(row);row=[];cell="";continue}
  cell+=c;
 }
 if(cell.length||row.length){row.push(cell.trim());if(row.some(v=>v!==""))rows.push(row)}
 return rows;
}
function norm(h){return String(h||"").replace(/^\uFEFF/,"").trim().toLowerCase().replace(/[\s_\-./]+/g,"").replace("barcord","barcode").replace("barcod","barcode").replace("shep","shape").replace("shap","shape").replace("claryty","clarity").replace("clarty","clarity").replace("perentno","parentno").replace("parentnumber","parentno").replace("packetnumber","packetno").replace("roughcarat","roughcts").replace("polishcarat","polishcts")}
function rowToLabel(h,r,type){const o={};h.forEach((x,i)=>o[norm(x)]=String(r[i]??"").trim());const first=String(r[0]??"").trim();return{barcode:o.barcode||o.id||first,parent:o.parentno||o.parent||"",packet:o.packetno||o.packet||"",rough:o.roughcts||o.rough||"",polish:o.polishcts||o.polish||"",shape:o.shape||"",colour:o.colour||o.color||"",clarity:o.clarity||"",cut:o.cut||"",type:type||"full"}}
function detectTemplate(h){const n=h.map(norm);if(n.includes("clarity")||n.includes("polishcts")||n.includes("cut")||n.includes("colour"))return"full";if(n.includes("parentno")&&n.includes("roughcts"))return"short";return"barcode"}
function labelText(l){if(l.type==="full")return[l.parent,l.packet,l.rough&&l.rough+" CTS",l.polish&&l.polish+" P",l.shape,l.colour,l.clarity,l.cut].filter(Boolean).join(" • ");if(l.type==="short")return[l.parent,l.packet,l.rough&&l.rough+" CTS"].filter(Boolean).join(" • ");return[l.packet,l.rough&&l.rough+" CTS",l.shape].filter(Boolean).join(" • ")}
function fullLabelInfo(l){
 const box=document.createElement("div");box.className="full-info";
 const a=document.createElement("div");a.className="info-line";a.textContent=[l.parent,l.rough].filter(Boolean).join("  ");
 const b=document.createElement("div");b.className="info-line";b.textContent=[l.packet,l.polish].filter(Boolean).join("  ");
 const d=document.createElement("div");d.className="info-line strong";d.textContent=[l.shape,l.colour,l.clarity,l.cut].filter(Boolean).join("·");
 [a,b,d].forEach(x=>box.append(x));return box;
}

function makeLabel(l,i){
 const el=document.createElement("div");el.className="print-label";el.dataset.i=i;
 el.innerHTML='<label class="select-mark"><input type="checkbox"> SELECT</label><div class="code-area"></div><div class="label-info"></div>';
 const cb=el.querySelector("input");cb.checked=selected.has(i);cb.onchange=()=>{cb.checked?selected.add(i):selected.delete(i);updateCount()};
 const info=el.querySelector(".label-info");
 if(l.type==="full"&&$("#qrText").value!=="off") info.replaceWith(fullLabelInfo(l)); else info.textContent=$("#qrText").value==="off"&&l.type!=="barcode"?"":labelText(l);
 if(l.image){const im=new Image();im.src=l.image;im.className="uploaded-code";el.querySelector(".code-area").append(im)}
 else if(l.type==="barcode"){
  const svg=document.createElementNS("http://www.w3.org/2000/svg","svg");el.querySelector(".code-area").append(svg);
  try{if(typeof JsBarcode!=="function")throw Error("Barcode library not loaded");JsBarcode(svg,l.barcode||"000000",{format:$("#barType").value,width:+$("#barWidth").value,height:+$("#barHeight").value,displayValue:$("#barText").value==="on",fontSize:+$("#barFont").value,fontOptions:$("#barBold").checked?"bold":"","textAlign":$("#barAlign").value,margin:+$("#barMargin").value})}catch(e){svg.textContent=l.barcode||"INVALID"}
 }else{
  const cv=document.createElement("canvas"),area=el.querySelector(".code-area");area.style.justifyContent=$("#qrPos").value==="right"?"flex-end":$("#qrPos").value==="left"?"flex-start":"center";area.append(cv);
  if(typeof QRCode==="undefined"){cv.width=120;cv.height=120;const x=cv.getContext("2d");x.font="12px Arial";x.fillText("QR LIBRARY ERROR",5,60)}else {const payload=l.type==="full"?[l.barcode,l.parent,l.packet,l.rough,l.polish,l.shape,l.colour,l.clarity,l.cut].map(v=>v??"").join("|"):l.type==="short"?[l.barcode,l.parent,l.packet,l.rough].map(v=>v??"").join("|"):(l.barcode||"CODEVAULT");QRCode.toCanvas(cv,payload,{errorCorrectionLevel:$("#qrEc").value,margin:+$("#qrMargin").value,width:+$("#qrSize").value},()=>{});}
 }
 return el;
}
function applyCSS(){document.documentElement.style.setProperty("--lw",Math.max(10,+$("#labelW").value||37)+"mm");document.documentElement.style.setProperty("--lh",Math.max(5,+$("#labelH").value||15)+"mm");document.documentElement.style.setProperty("--gx",Math.max(0,+$("#gapX").value||0)+"mm");document.documentElement.style.setProperty("--gy",Math.max(0,+$("#gapY").value||0)+"mm");document.documentElement.style.setProperty("--pad",Math.max(0,+$("#pad").value||0)+"mm");document.documentElement.style.setProperty("--rad",Math.max(0,+$("#radius").value||0)+"mm");document.documentElement.style.setProperty("--cols",Math.max(1,+$("#cols").value||1));$("#sizeOut").textContent=(+$("#labelW").value||37)+" × "+(+$("#labelH").value||15)+" mm";document.documentElement.style.setProperty("--scale",$("#scale").value==="fit"?"0.98":"1")}
function updateCount(){$("#count").textContent=labels.length+" label(s) loaded • "+selected.size+" selected"}
function render(){applyCSS();const grid=$("#previewGrid");grid.innerHTML="";labels.forEach((l,i)=>grid.append(makeLabel(l,i)));updateCount()}

function filesToImages(fs,type){labels=[];selected.clear();let pending=fs.length;if(!pending)return;[...fs].forEach(f=>{if(!f.type.startsWith("image/")){pending--;return}const rd=new FileReader();rd.onload=()=>{labels.push({barcode:f.name.replace(/\.[^.]+$/,""),packet:"",rough:"",shape:"",type:type==="barcode"?"barcode":"full",image:rd.result});pending--;if(pending<=0){selected=new Set(labels.map((_,i)=>i));render()}};rd.readAsDataURL(f)})}

async function fileRows(file){
 const name=file.name.toLowerCase();
 if(/\\.(xlsx|xls)$/.test(name)){
  if(typeof XLSX==="undefined")throw Error("Excel library not loaded");
  const wb=XLSX.read(await file.arrayBuffer(),{type:"array"}); const ws=wb.Sheets[wb.SheetNames[0]];
  return XLSX.utils.sheet_to_json(ws,{header:1,defval:"",raw:false}).filter(r=>r.some(v=>String(v).trim()));
 }
 return parseCSV(await file.text());
}
$("#files").onchange=async e=>{
 const fs=[...e.target.files];if(!fs.length)return;const mode=$("#inputType").value;if(mode!=="csv"){filesToImages(fs,mode);return}
 labels=[];selected.clear();const errors=[];
 for(const f of fs){try{const rows=await fileRows(f);if(rows.length<2){errors.push(f.name+": no data rows");continue}
  const h=rows[0].map(v=>String(v??""));const auto=detectTemplate(h);if($("#template").dataset.manual!=="1")$("#template").value=auto;
  const t=$("#template").value,type=t==="short"?"short":t==="barcode"?"barcode":"full";
  rows.slice(1).forEach(r=>{if(!r.some(v=>String(v).trim()))return;labels.push(rowToLabel(h,r,type))});
 }catch(err){errors.push(f.name+": "+err.message)}}
 selected=new Set(labels.map((_,i)=>i));render();
 $("#count").textContent=labels.length+" label(s) loaded • "+selected.size+" selected"+(errors.length?" • "+errors.join(" | "):"");
};
$("#template").onchange=()=>{$("#template").dataset.manual="1";const t=$("#template").value;labels.forEach(l=>l.type=t==="short"?"short":t==="barcode"?"barcode":"full");render()};
$("#inputType").onchange=()=>{$("#files").value="";labels=[];selected.clear();$("#template").dataset.manual="0";render()};
$("#previewBtn").onclick=()=>$("#previewGrid").scrollIntoView({behavior:"smooth",block:"center"});
$("#selectAll").onclick=()=>{selected=new Set(labels.map((_,i)=>i));render()};
$("#clearSelected").onclick=()=>{selected.clear();render()};

function openPrintDialog(list){
 const items=Array.isArray(list)?list:[];
 if(!items.length){alert("No labels selected.");return}
 const w=window.open("","CODEVAULT_PRINT","width=1000,height=800");
 if(!w){alert("Popup blocked. Please allow popups for CODEVAULT, then click Print again.");return}

 const root=getComputedStyle(document.documentElement);
 const cols=root.getPropertyValue("--cols").trim()||"2";
 const lw=root.getPropertyValue("--lw").trim()||"37mm";
 const lh=root.getPropertyValue("--lh").trim()||"15mm";
 const gx=root.getPropertyValue("--gx").trim()||"2mm";
 const gy=root.getPropertyValue("--gy").trim()||"2mm";
 const pad=root.getPropertyValue("--pad").trim()||"1mm";
 const rad=root.getPropertyValue("--rad").trim()||"1mm";

 const css=`
  @page{size:auto;margin:0}
  html,body{margin:0;padding:0;background:#fff}
  .print-grid{display:grid;grid-template-columns:repeat(${cols},${lw});gap:${gy} ${gx};justify-content:start}
  .print-label{box-sizing:border-box;position:relative;width:${lw};height:${lh};padding:${pad};border:1px solid #999;border-radius:${rad};background:#fff;color:#111;overflow:hidden;display:flex;flex-direction:row;align-items:center;gap:1mm;break-inside:avoid;page-break-inside:avoid}
  .select-mark{display:none!important}
  .code-area{width:36%;height:100%;display:flex;align-items:center;justify-content:center;overflow:hidden;flex:none}
  .code-area canvas,.code-area svg{width:auto!important;height:auto!important;max-width:100%;max-height:92%;display:block}
  .uploaded-code{max-width:100%;max-height:92%;object-fit:contain}
  .label-info,.full-info{width:64%;font:700 5.2pt Arial,sans-serif;line-height:1.15;text-align:left;white-space:nowrap;overflow:hidden}
  .full-info{display:flex;flex-direction:column;justify-content:center;gap:.7mm}
  .full-info .info-line{font:700 5.2pt Arial,sans-serif;line-height:1.05;white-space:nowrap}
 `;

 w.document.open();
 w.document.write("<!doctype html><html><head><meta charset='utf-8'><title>CODEVAULT PRINT</title><style>"+css+"</style></head><body><div id='p' class='print-grid'></div></body></html>");
 w.document.close();

 const staging=document.createElement("div");
 staging.style.cssText="position:fixed;left:-100000px;top:0;width:1px;height:1px;overflow:hidden;visibility:hidden";
 document.body.appendChild(staging);
 const source=document.createElement("div");
 source.className="print-grid";
 source.style.cssText="display:grid;grid-template-columns:repeat("+cols+","+lw+");gap:"+gy+" "+gx;
 staging.appendChild(source);
 items.forEach((l,i)=>source.append(makeLabel(l,i)));

 setTimeout(()=>{
  const target=w.document.getElementById("p");
  [...source.children].forEach(node=>{
   const clone=node.cloneNode(true);
   const canvases=node.querySelectorAll("canvas");
   const cloneCanvases=clone.querySelectorAll("canvas");
   canvases.forEach((cv,i)=>{
    try{
     const img=w.document.createElement("img");
     img.src=cv.toDataURL("image/png");
     img.style.cssText="width:auto;height:auto;max-width:100%;max-height:92%;display:block";
     if(cloneCanvases[i])cloneCanvases[i].replaceWith(img);
    }catch(e){}
   });
   target.appendChild(clone);
  });
  staging.remove();

  const imgs=[...target.querySelectorAll("img")];
  let printed=false;
  const doPrint=()=>{
   if(printed)return;
   printed=true;
   w.focus();
   w.print();
  };
  if(!imgs.length){setTimeout(doPrint,150)}
  else{
   let left=imgs.length;
   const one=()=>{left--;if(left<=0)setTimeout(doPrint,100)};
   imgs.forEach(img=>{if(img.complete)one();else{img.onload=one;img.onerror=one}});
   setTimeout(doPrint,1200);
  }
 },350);
}

function print(which){
 const list=which==="selected"
  ? labels.filter((_,i)=>selected.has(i))
  : labels.slice();
 if(!list.length){
  alert(which==="selected"?"No labels selected.":"No labels available to print.");
  return;
 }
 openPrintDialog(list);
}

$("#printAll").onclick=function(e){e.preventDefault();print("all")};
$("#printSelected").onclick=function(e){e.preventDefault();print("selected")};
$("#testPrint").onclick=function(e){
 e.preventDefault();
 const test={barcode:"565652",parent:"HH8-26",packet:"HH8-26.175",rough:"4.61",polish:"",shape:"MQ",colour:"G",clarity:"VS2",cut:"MQ",type:"short"};
 openPrintDialog([test]);
};

$("#reset").onclick=()=>{for(const[k,v]of Object.entries(defaults)){if($("#"+k))$("#"+k).value=v}$("#border").checked=true;$("#barBold").checked=true;$("#template").dataset.manual="0";render()};
["labelW","labelH","gapX","gapY","cols","rows","pad","border","radius","scale","qrSize","qrEc","qrMargin","qrPos","qrText","barType","barWidth","barHeight","barFont","barText","barBold","barAlign","barMargin"].forEach(id=>{$("#"+id)?.addEventListener("input",render);$("#"+id)?.addEventListener("change",render)});
render();