import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { resolve } from 'node:path';
import { readFileSync, readdirSync } from 'node:fs';
import WebSocket from 'ws';

const workspaceIndex = process.argv.indexOf('--workspace');
const workspace = workspaceIndex >= 0 ? process.argv[workspaceIndex + 1] : undefined;
const root = resolve(import.meta.dirname, '..');
const installedIndex = process.argv.indexOf('--installed-dir');
const installed = installedIndex >= 0 ? resolve(process.argv[installedIndex + 1]) : undefined;
const bundle = installed ? resolve(installed, 'desktop') : resolve(root, 'dist-desktop');
const runtime = installed ? resolve(installed, 'node.exe') : resolve(root, 'src-tauri/binaries/node-x86_64-pc-windows-msvc.exe');
const child = spawn(runtime,
  [resolve(bundle, 'talos-desktop-service.mjs'), '--static-dir', resolve(bundle, 'static'), '--port', '0'],
  { cwd: bundle, windowsHide: true, stdio: ['pipe','pipe','pipe'] });
let output='';
const ready=new Promise((resolveReady,reject)=>{
 const timer=setTimeout(()=>reject(new Error('desktop ready timeout')),10000);
 child.stdout.on('data', data=>{
  output+=data.toString();const match=output.match(/TALOS_DESKTOP_READY (\S+)/);
  if(match){clearTimeout(timer);resolveReady(match[1]);}
 });
 child.once('exit', code=>{clearTimeout(timer);reject(new Error('service exited '+code));});
});
try {
 const endpoint=new URL(await ready);
 assert.equal((await fetch(endpoint.origin + '/%')).status,400,'malformed path');
 const health=await fetch(new URL('/health',endpoint));assert.equal(health.status,200);
 for(const asset of ['/','/demo/talos.css','/demo/text-scale.js','/demo/fonts/HarmonyOS_Sans_SC_Regular.woff2']){
  assert.equal((await fetch(new URL(asset,endpoint))).status,200,asset);
 }
 assert.ok(!readdirSync(resolve(bundle,'static/demo')).includes('talos.html'),'mock preview must not be packaged');
 const wsUrl=new URL('/ws',endpoint);wsUrl.protocol='ws:';
 const denied=new WebSocket(wsUrl);denied.on('error',()=>{});const denial=await new Promise(res=>denied.on('unexpected-response',(_req,r)=>{r.resume();res(r.statusCode);}));assert.equal(denial,401);denied.terminate();
 wsUrl.search=endpoint.search;
 const socket=new WebSocket(wsUrl);const message=once(socket,'message');await once(socket,'open');
 const [raw]=await message;
 const initial = JSON.parse(raw.toString());
 assert.equal(initial.type,'snapshot');
 assert.equal(initial.snapshot.connection.status,'disconnected');
 assert.equal(initial.snapshot.session.cwd,undefined);
 assert.equal(initial.snapshot.session.sessionId,undefined);
 assert.deepEqual(initial.snapshot.errors,[]);
 if (workspace) {
  const exchange = (action, predicate) => new Promise((resolveMessage,reject)=>{
   const cleanup=()=>{clearTimeout(timer);socket.off('message',onMessage);};
   const timer=setTimeout(()=>{cleanup();reject(new Error('workspace action timed out'));},30000);
   const onMessage=data=>{const value=JSON.parse(data.toString());if(predicate(value)){cleanup();resolveMessage(value);}};
   socket.on('message',onMessage);socket.send(JSON.stringify(action));
  });
  await exchange({type:'switch_workspace',operationId:'workspace-invalid',cwd:'relative-invalid'},m=>m.type==='action_error'&&m.operationId==='workspace-invalid');
  const restored=await exchange({type:'switch_workspace',operationId:'workspace-real',cwd:workspace},m=>m.type==='snapshot'&&m.snapshot.connection.status==='connected'&&m.snapshot.session.status==='ready'&&Boolean(m.snapshot.session.sessionId)&&!m.snapshot.session.historyLoading);
  assert.deepEqual(restored.snapshot.errors,[]);
  console.log('PASS first launch: no workspace -> rejected invalid directory -> real Studio connected/session ready; no prompt/model request.');
 }
 socket.close();await once(socket,'close');
 const exit=once(child,'exit');child.stdin.write('shutdown\n');const [code]=await exit;assert.equal(code,0);
 const stopped=await fetch(new URL('/health',endpoint)).then(()=>false,()=>true);assert.ok(stopped);
 const manifest=JSON.parse(readFileSync(resolve(bundle,'node-runtime.json'),'utf8'));assert.equal(manifest.version,'v24.15.0');
 console.log('PASS staged Node/service: resources, isolated random endpoint, authenticated WS, graceful host shutdown, closed port; no checkout/runtime dependencies or model request.');
} finally {if(child.exitCode===null)child.kill();}
