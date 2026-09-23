const http=require("http"),{execFile}=require("child_process");
const PORT=9100,HOST="127.0.0.1",DEFAULT_PRINTER="ZDesigner ZD230-203dpi ZPL";
const ps=`
param([string]$Printer,[string]$Data)
Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;
using System.Text;
public class RawPrinter {
 [StructLayout(LayoutKind.Sequential,CharSet=CharSet.Unicode)] public class DOCINFO { public string pDocName="CODEVAULT"; public string pOutputFile=null; public string pDataType="RAW"; }
 [DllImport("winspool.drv",CharSet=CharSet.Unicode,SetLastError=true)] static extern bool OpenPrinter(string n,out IntPtr h,IntPtr p);
 [DllImport("winspool.drv",SetLastError=true)] static extern bool ClosePrinter(IntPtr h);
 [DllImport("winspool.drv",CharSet=CharSet.Unicode,SetLastError=true)] static extern int StartDocPrinter(IntPtr h,int l,DOCINFO d);
 [DllImport("winspool.drv",SetLastError=true)] static extern bool EndDocPrinter(IntPtr h);
 [DllImport("winspool.drv",SetLastError=true)] static extern int StartPagePrinter(IntPtr h);
 [DllImport("winspool.drv",SetLastError=true)] static extern bool EndPagePrinter(IntPtr h);
 [DllImport("winspool.drv",SetLastError=true)] static extern bool WritePrinter(IntPtr h,byte[] p,int c,out int w);
 public static void Send(string n,string s){IntPtr h;if(!OpenPrinter(n,out h,IntPtr.Zero))throw new Exception("Cannot open printer: "+n);try{var d=new DOCINFO();StartDocPrinter(h,1,d);StartPagePrinter(h);byte[] b=Encoding.ASCII.GetBytes(s);int w;if(!WritePrinter(h,b,b.Length,out w))throw new Exception("WritePrinter failed");EndPagePrinter(h);EndDocPrinter(h);}finally{ClosePrinter(h);}}
}
"@
[RawPrinter]::Send($Printer,$Data)
`;
http.createServer((req,res)=>{
 if(req.method==="OPTIONS"){res.writeHead(204,{"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"Content-Type","Access-Control-Allow-Methods":"POST,OPTIONS"});return res.end()}
 if(req.method!=="POST"||req.url!=="/print"){res.writeHead(404);return res.end("Not found")}
 let b="";req.on("data",c=>b+=c);req.on("end",()=>{
  try{const x=JSON.parse(b),printer=x.printer||DEFAULT_PRINTER;if(!x.zpl)throw new Error("Missing ZPL");
   execFile("powershell.exe",["-NoProfile","-ExecutionPolicy","Bypass","-Command",ps,"-Printer",printer,"-Data",x.zpl],{windowsHide:true},(e,stdout,stderr)=>{
    res.writeHead(e?500:200,{"Content-Type":"application/json","Access-Control-Allow-Origin":"*"});
    res.end(JSON.stringify(e?{ok:false,error:stderr||e.message}:{ok:true,printer}));
   });
  }catch(e){res.writeHead(400,{"Content-Type":"application/json","Access-Control-Allow-Origin":"*"});res.end(JSON.stringify({ok:false,error:e.message}))}
 });
}).listen(PORT,HOST,()=>console.log("CODEVAULT local ZD230 bridge on http://"+HOST+":"+PORT));
