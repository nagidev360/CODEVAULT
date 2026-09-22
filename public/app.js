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
  if(typeof QRCode==="undefined"){cv.width=120;cv.height=120;const x=cv.getContext("2d");x.font="12px Arial";x.fillText("QR LIBRARY ERROR",5,60)}else QRCode.toCanvas(cv,l.barcode||"CODEVAULT",{errorCorrectionLevel:$("#qrEc").value,margin:+$("#qrMargin").value,width:+$("#qrSize").value},()=>{});
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

function print(which){const list=which==="selected"?labels.filter((_,i)=>selected.has(i)):labels;if(!list.length){alert("No labels selected.");return}const grid=$("#previewGrid");grid.innerHTML="";list.forEach((l,i)=>grid.append(makeLabel(l,i)));applyCSS();document.body.classList.add("printing");const cleanup=()=>{document.body.classList.remove("printing");selected=new Set(labels.map((_,i)=>i));render()};window.addEventListener("afterprint",cleanup,{once:true});window.print();setTimeout(()=>{if(document.body.classList.contains("printing"))cleanup()},1500)}
$("#printAll").onclick=()=>print("all");
$("#printSelected").onclick=()=>print("selected");
$("#testPrint").onclick=()=>{const test={barcode:"565652",parent:"HH8-26",packet:"HH8-26.175",rough:"4.61",shape:"MQ",type:"short"};const old=labels;const oldSelected=selected;labels=[test];selected=new Set([0]);render();print("selected");setTimeout(()=>{labels=old;selected=oldSelected;render()},1700)};
$("#reset").onclick=()=>{for(const[k,v]of Object.entries(defaults)){if($("#"+k))$("#"+k).value=v}$("#border").checked=true;$("#barBold").checked=true;$("#template").dataset.manual="0";render()};
["labelW","labelH","gapX","gapY","cols","rows","pad","border","radius","scale","qrSize","qrEc","qrMargin","qrPos","qrText","barType","barWidth","barHeight","barFont","barText","barBold","barAlign","barMargin"].forEach(id=>{$("#"+id)?.addEventListener("input",render);$("#"+id)?.addEventListener("change",render)});
render();