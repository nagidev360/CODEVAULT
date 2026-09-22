const express=require("express");
const path=require("path");
const app=express();
const PORT=process.env.PORT||10000;
const NAGI_KEY_VERIFY=process.env.NAGI_KEY_VERIFY||"https://nagi-key-clean.onrender.com/api/key/verify";
app.disable("x-powered-by");
app.use(express.json({limit:"32kb"}));
app.use(express.static(path.join(__dirname,"public"),{extensions:["html"]}));
app.post("/api/license/verify",async(req,res)=>{
  try{
    const key=String(req.body?.key||"").trim();
    if(!key)return res.status(400).json({valid:false,reason:"KEY_REQUIRED"});
    if(key.length>4096)return res.status(400).json({valid:false,reason:"KEY_TOO_LONG"});
    const r=await fetch(NAGI_KEY_VERIFY,{method:"POST",headers:{"content-type":"application/json","accept":"application/json"},body:JSON.stringify({key})});
    const data=await r.json().catch(()=>({valid:false,reason:"BAD_RESPONSE"}));
    res.status(r.status).json(data);
  }catch(e){res.status(502).json({valid:false,reason:"LICENSE_SERVICE_UNAVAILABLE"});}
});
app.get("/api/health",(req,res)=>res.json({ok:true,service:"CODEVAULT",license:"NAGI.KEY"}));
app.get("/api/config",(req,res)=>res.json({sticker:{widthMm:37,heightMm:15},licenseProvider:"NAGI.KEY"}));
app.use((req,res)=>res.sendFile(path.join(__dirname,"public","index.html")));
app.listen(PORT,()=>console.log("CODEVAULT running on "+PORT));