const {spawn}=require('node:child_process');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const isWindows=process.platform==='win32';
const npm=isWindows?'npm.cmd':'npm';
const frontendPort=process.env.FRONTEND_PORT||'4178';
const backendPort=process.env.PORT||'4179';
const allowedOrigins=[`http://localhost:${frontendPort}`,`http://127.0.0.1:${frontendPort}`].join(',');
const env={...process.env,PORT:backendPort,FRONTEND_PORT:frontendPort,ALLOWED_ORIGINS:process.env.ALLOWED_ORIGINS||allowedOrigins,PUBLIC_WS_URL:process.env.PUBLIC_WS_URL||`ws://localhost:${backendPort}/ws`};
const build=spawn(npm,['run','build:frontend'],{cwd:root,env,stdio:'inherit',shell:isWindows});
let children=[];let stopping=false;
function stop(code=0){if(stopping)return;stopping=true;for(const child of children)child.kill('SIGTERM');process.exitCode=code;}
build.on('error',error=>{console.error(error);stop(1);});
build.on('exit',code=>{if(code!==0){stop(code||1);return;}
  children=[spawn(process.execPath,['backend/server.cjs'],{cwd:root,env,stdio:'inherit'}),spawn(process.execPath,['frontend/dev-server.cjs'],{cwd:root,env,stdio:'inherit'})];
  for(const child of children){child.on('error',error=>{console.error(error);stop(1);});child.on('exit',code=>{if(!stopping)stop(code||0);});}
});
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>stop(0));
