const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
http.createServer((req,res)=>{
  if(req.url==='/'||req.url==='/battle-preview.html'||req.url==='/responsive-preview.html'){
    res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'});
    res.end(fs.readFileSync(path.join(__dirname,req.url==='/responsive-preview.html'?'responsive-preview.html':'battle-preview.html')));
  }else{res.writeHead(404);res.end('Not found');}
}).listen(4178,'127.0.0.1',()=>console.log('Four Clans preview: http://127.0.0.1:4178'));
