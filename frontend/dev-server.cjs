const http=require('node:http');
const fs=require('node:fs');
const path=require('node:path');
const page=path.join(__dirname,'dist/index.html');
const server=http.createServer((req,res)=>{
  if(req.url==='/'||req.url==='/index.html'){
    if(!fs.existsSync(page)){res.writeHead(503);res.end('Run npm run build:frontend first');return;}
    res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});
    fs.createReadStream(page).pipe(res);return;
  }
  res.writeHead(404);res.end('Not found');
});
const port=Number(process.env.FRONTEND_PORT||4178);
server.listen(port,'0.0.0.0',()=>console.log('Four Clans frontend: http://localhost:'+port));
