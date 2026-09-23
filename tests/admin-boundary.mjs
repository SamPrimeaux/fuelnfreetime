import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {registerHooks} from 'node:module';
// Exercise the real router and auth lookup with isolated bindings. This is not a
// workerd/browser acceptance test; DurableObject is not used by these routes.
const hooks=registerHooks({resolve(spec,context,next){return spec==='cloudflare:workers'?{url:'data:text/javascript,export class DurableObject {}',shortCircuit:true}:next(spec,context);}});
const {default:worker}=await import('../apps/ecommerce-cms-agentsam/backend/index.js');
const expectedHash=createHash('sha256').update('boundary-test').digest('hex');
const env={DB:{prepare(sql){assert.match(sql,/FROM auth_sessions/);return {bind(hash){return {async first(){return hash===expectedHash?{id:'test',status:'active'}:null;}};}};}},ASSETS:{async fetch(){return new Response('asset');}}};
const dispatch=(route,options)=>worker.fetch(new Request('http://localhost'+route,options),env,{});
try{
 for(const route of ['/admin/home','/admin/theme-editor','/admin/agentsam','/admin/analytics/overview','/admin/analytics/finance','/admin/analytics/health','/admin/account','/admin/products/create','/admin/_spa/assets/test.js','/admin/js/agentsam.js','/admin/workbench/index.js','/admin/partials/mail-app.html']){
   const denied=await dispatch(route,{redirect:'manual'});
   assert.equal(denied.status,302,route);assert.equal(denied.headers.get('cache-control'),'private, no-store');
   const allowed=await dispatch(route,{headers:{cookie:'fnf_admin_session=boundary-test'},redirect:'manual'});
   assert.equal(allowed.status,200,route);assert.equal(allowed.headers.get('cache-control'),'private, no-store');
 }
 const login=await dispatch('/admin/login');assert.equal(login.status,200);
 const health=await dispatch('/api/health');assert.equal(health.status,200);
 console.log('Login, authenticated/unauthenticated dashboard pages, modules, partials and cache boundaries passed');
}finally{hooks.deregister();}
