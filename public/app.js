const $=s=>document.querySelector(s);
const license=$("#license"),app=$("#app"),status=$("#status"),logout=$("#logout");
let labels=[],selected=new Set();
function unlock(){license.classList.add("hidden");app.classList.remove("hidden");logout.classList.remove("hidden");status.textContent="";sessionStorage.setItem("cv_license","1")}
if(sessionStorage.getItem("cv_license")==="1")unlock();
$("#verify").onclick=async()=>{const key=$("#key").value.trim();if(!key){status.textContent="Enter a NAGI.KEY license.";return}status.textContent="Verifying…";try{const r=await fetch("/api/license/verify",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({key})});const d=await r.json();if(!r.ok||!d.valid)throw Error(d.reason||"INVALID_KEY");unlock()}catch(e){status.textContent="Verification failed: "+e.message}};
logout.onclick=()=>{sessionStorage.removeItem("cv_license");location.reload()};
function parseCSV(text){
 text=text.replace(/^\uFEFF/,"").replace(/\r\n/g,"\n").replace(/\r/g,"\n");
 const rows=[];let row=[],cell="",q=false;
 for(let i=0;i<text.length;i++){const c=text[i],n=text[i+1];
  if(c==='"'&&q&&n==='"'){cell+='"';i++;continue}
  if(c==='"'){q=!q;continue}
  if(c===","&&!q){row.push(cell.trim());cell="";continue}
  if(c==="\n"&&!q){row.push(cell.trim());if(row.some(v=>v!==''))rows.push(row);row=[];cell="";continue}
  cell+=c;
 }
 if(cell.length||row.length){row.push(cell.trim());if(row.some(v=>v!==''))rows.push(row)}
 return rows;
}
function norm(h){return String(h||"").replace(/^\uFEFF/,"").toLowerCase().replace(/[\s_\-]+/g,"").replace("barcord","barcode").replace("shep","shape").replace("claryty","clarity").replace("perentno","parentno").replace("roughcts","roughcts").replace("polishcts","polishcts")}
function rowToLabel(h,r,type){const o={};h.forEach((x,i)=>o[norm(x)]=String(r[i]??"").trim());return{barcode:o.barcode||"",parent:o.parentno||"",packet:o.packetno||"",rough:o.roughcts||"",polish:o.polishcts||"",shape:o.shape||"",colour:o.colour||"",clarity:o.clarity||"",cut:o.cut||"",type:type||"full"}}
function labelText(l){if(l.type==="full")return[l.parent,l.packet,l.rough&&l.rough+" CTS",l.polish&&l.polish+" P",l.shape,l.colour,l.clarity,l.cut].filter(Boolean).join(" • ");if(l.type==="short")return[l.parent,l.packet,l.rough&&l.rough+" CTS"].filter(Boolean).join(" • ");return[l.packet,l.rough&&l.rough+" CTS",l.shape].filter(Boolean).join(" • ")}
function makeLabel(l,i){const el=document.createElement("div");el.className="print-label";el.dataset.i=i;el.innerHTML='<div class="code-area"></div><div class="label-info"></div>';el.querySelector(".label-info").textContent=labelText(l);if(l.image){const im=new Image();im.src=l.image;im.className="uploaded-code";el.querySelector(".code-area").append(im)}else if(l.type==="barcode"){const svg=document.createElementNS("http://www.w3.org/2000/svg","svg");el.querySelector(".code-area").append(svg);try{JsBarcode(svg,l.barcode||"000000",{format:$("#barType").value,width:+$("#barWidth").value,height:+$("#barHeight").value,displayValue:$("#barText").value==="on",fontSize:+$("#barFont").value,fontOptions:$("#barBold").checked?"bold":"","textAlign":$("#barAlign").value,margin:+$("#barMargin").value})}catch(e){svg.textContent=l.barcode||"INVALID"}}else{const cv=document.createElement("canvas");el.querySelector(".code-area").append(cv);QRCode.toCanvas(cv,l.barcode||"CODEVAULT",{errorCorrectionLevel:$("#qrEc").value,margin:+$("#qrMargin").value,width:+$("#qrSize").value},()=>{})}return el}
function applyCSS(){document.documentElement.style.setProperty("--lw",$("#labelW").value+"mm");document.documentElement.style.setProperty("--lh",$("#labelH").value+"mm");document.documentElement.style.setProperty("--gx",$("#gapX").value+"mm");document.documentElement.style.setProperty("--gy",$("#gapY").value+"mm");document.documentElement.style.setProperty("--pad",$("#pad").value+"mm");document.documentElement.style.setProperty("--rad",$("#radius").value+"mm");document.documentElement.style.setProperty("--cols",$("#cols").value);document.documentElement.style.setProperty("--rows",$("#rows").value);document.documentElement.style.setProperty("--border",$("#border").checked?"1px solid #999":"0");$("#sizeOut").textContent=$("#labelW").value+" × "+$("#labelH").value+" mm"}
function render(){applyCSS();const grid=$("#previewGrid");grid.innerHTML="";selected=new Set(labels.map((_,i)=>i));labels.slice(0,Math.max(1,+$("#cols").value*+$("#rows").value)).forEach((l,i)=>grid.append(makeLabel(l,i)));$("#count").textContent=labels.length+" label(s) loaded • "+selected.size+" selected"}
function filesToImages(fs,type){labels=[];[...fs].forEach(f=>{if(!f.type.startsWith("image/"))return;const rd=new FileReader();rd.onload=()=>{labels.push({barcode:f.name.replace(/\.[^.]+$/,""),packet:"",rough:"",shape:"",type:type==="barcode"?"barcode":"full",image:rd.result});render()};rd.readAsDataURL(f)})}
$("#files").onchange=async e=>{
 const fs=[...e.target.files];if(!fs.length)return;const mode=$("#inputType").value;
 if(mode!=="csv"){filesToImages(fs,mode);return}
 labels=[];let errors=[];
 for(const f of fs){try{const text=await f.text();const rows=parseCSV(text);if(rows.length<2){errors.push(f.name+": no data rows");continue}
   const h=rows[0],t=$("#template").value,type=t==="short"?"short":t==="barcode"?"barcode":"full";
   const valid=h.some(x=>["barcode","barcord"].includes(norm(x)));
   if(!valid){errors.push(f.name+": barcode column not found");continue}
   rows.slice(1).forEach(r=>{if(r.some(v=>String(v).trim()))labels.push(rowToLabel(h,r,type))});
 }catch(err){errors.push(f.name+": "+err.message)}}
 render();
 if(errors.length)$("#count").textContent=labels.length+" label(s) loaded • "+errors.join(" | ");
};
["labelW","labelH","gapX","gapY","cols","rows","pad","border","radius","qrSize","qrEc","qrMargin","qrPos","qrText","barType","barWidth","barHeight","barFont","barText","barBold","barAlign","barMargin"].forEach(id=>$("#"+id).addEventListener("input",render));
$("#template").onchange=()=>{const t=$("#template").value;labels.forEach(l=>l.type=t==="short"?"short":t==="barcode"?"barcode":"full");render()};
$("#inputType").onchange=()=>{$("#files").value="";labels=[];render()};
$("#previewBtn").onclick=()=>$("#previewGrid").scrollIntoView({behavior:"smooth",block:"center"});
function print(which){const list=which==="selected"?labels.filter((_,i)=>selected.has(i)):labels;if(!list.length){alert("No labels loaded.");return}const grid=$("#previewGrid");grid.innerHTML="";list.forEach((l,i)=>grid.append(makeLabel(l,i)));applyCSS();document.body.classList.add("printing");window.print();setTimeout(()=>{document.body.classList.remove("printing");render()},300)}
$("#printAll").onclick=()=>print("all");$("#printSelected").onclick=()=>print("selected");$("#testPrint").onclick=()=>{if(!labels.length)labels=[{barcode:"565652",parent:"HH8-26",packet:"HH8-26.175",rough:"4.61",shape:"MQ",type:"short"}];render();print("selected")};
$("#reset").onclick=()=>{const vals={labelW:37,labelH:15,gapX:2,gapY:2,cols:2,rows:8,pad:1,radius:1,qrSize:100,qrEc:"M",qrMargin:2,barType:"CODE128",barWidth:2,barHeight:45,barFont:10,barMargin:2};for(const[k,v]of Object.entries(vals))$("#"+k).value=v;$("#border").checked=true;$("#barBold").checked=true;render()};
render();