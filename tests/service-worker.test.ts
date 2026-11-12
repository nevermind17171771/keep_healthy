import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const source=readFileSync('public/sw.js','utf8');
function worker(response:Response){
 const events:Record<string,Function>={},writes:string[]=[],shell=new Response('<meta name="keep-healthy-shell" content="public-v1">');
 vm.runInNewContext(source,{URL,fetch:async()=>response,self:{location:{origin:'https://example.test'},addEventListener:(n:string,f:Function)=>events[n]=f},caches:{open:async()=>({match:async()=>shell,put:async(path:string)=>writes.push(path)})}});
 return {writes,shell,fetch:(path='/')=>{let result:Promise<Response>|undefined;events.fetch({request:{method:'GET',url:'https://example.test'+path,mode:'navigate'},respondWith:(r:Promise<Response>)=>result=r});return result;}};
}
test('auth failure on root restores public shell without caching the login page',async()=>{
 const w=worker(new Response('sign in',{status:401}));assert.equal(await w.fetch(),w.shell);assert.equal(w.writes.length,0);
 const redirected=new Response('login');Object.defineProperty(redirected,'redirected',{value:true});const r=worker(redirected);assert.equal(await r.fetch(),r.shell);assert.equal(r.writes.length,0);
});
test('worker never intercepts authentication or user-record API routes',()=>{
 for(const p of ['/signin-with-chatgpt','/signout-with-chatgpt','/callback','/api/sync'])assert.equal(worker(new Response('x')).fetch(p),undefined);
});
test('only explicitly marked public app HTML enters navigation cache',async()=>{
 const auth=worker(new Response('KEEP HEALTHY login',{headers:{'content-type':'text/html'}}));await auth.fetch();assert.deepEqual(auth.writes,[]);
 const app=worker(new Response('<meta name="keep-healthy-shell" content="public-v1">',{headers:{'content-type':'text/html'}}));await app.fetch();assert.deepEqual(app.writes,['/']);
});
