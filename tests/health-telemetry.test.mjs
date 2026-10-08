import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { getHealthAnalytics,normalizeHealthRange } from '../apps/ecommerce-cms-agentsam/backend/admin/analytics-health.js';

const fakeDb={
 prepare(sql){
  return {bind(...args){
   return {
    async first(){
      if(sql.includes('COUNT(*) AS events'))return {events:14,failures:3,successes:11,cost_usd:0.02,avg_duration_ms:112};
      if(sql.includes('SELECT 1 AS alive'))return {alive:1};
      return null;
    },
    async all(){
      if(sql.includes('GROUP BY date_key'))return {results:[{bucket:'2026-10-06',events:6,failures:1},{bucket:'2026-10-07',events:8,failures:2}]};
      if(sql.includes('ORDER BY samples DESC'))return {results:[{domain:'cms',operation:'section.generate',samples:14,failures:3,duration_ms:112}]};
      if(sql.includes("event_type='github'")||sql.includes("event_type = 'github'"))
        return {results:[{operation:'package.check',error_code:'schema_contract_mismatch',status:'failed',occurred_at:1}]};
      if(sql.includes("status='failed'")||sql.includes("status = 'failed'"))
        return {results:[{domain:'cms',operation:'section.generate',error_code:'schema_contract_mismatch',status:'failed',occurred_at:1}]};
      return {results:[]};
    },
    async run(){return {success:true};},
   };
  }};
 }
};

test('backend enforces bounded ranges',()=>{
 const a=normalizeHealthRange('100 years',Date.UTC(2026,9,8));
 assert.equal(a.range,'30d');
 assert.equal(normalizeHealthRange('24h',Date.UTC(2026,9,8)).range,'24h');
});
test('unconfigured sources have explicit unavailability, never plausible metrics',async()=>{
 const data=await getHealthAnalytics({},'30d');
 assert.equal(data.edge.available,false);
 assert.equal(data.edge.requests,null);
 assert.equal(data.edge.errorRate,null);
 assert.equal(data.app.available,false);
 assert.equal(data.basin.enabled,false);
 assert.equal(data.app.failures.length,0);
});
test('only observed Cloudflare HTTP and D1 records become dashboard statistics',async()=>{
 const queries=[];
 const env={DB:fakeDb,ANALYTICS_SQL:{async query(options){
   queries.push(options);
   return {data:[{status:200,requests:90},{status:503,requests:10}]};
 }}};
 const data=await getHealthAnalytics(env,'24h');
 assert.equal(data.app.totals.events,14);
 assert.equal(data.app.totals.failures,3);
 assert.equal(data.edge.requests,100);
 assert.equal(data.edge.errors,10);
 assert.equal(data.edge.errorRate,10);
 assert.equal(data.edge.rpm,100/(24*60));
 assert.equal(data.basin.enabled,false);
 assert.equal(data.app.repository.length,1);
 assert.equal(queries.length,1);
 assert.equal(queries[0].params.host,'fuelnfreetime.com');
 assert.equal(queries[0].params.www,'www.fuelnfreetime.com');
 assert.doesNotMatch(queries[0].query,/accountTag/);
});
test('Basin presence is gated by real configuration or authorized discovery',async()=>{
 const configured=await getHealthAnalytics({BASIN_WAREHOUSE:'warehouse-1'},'24h');
 assert.equal(configured.basin.enabled,true);
 assert.equal(configured.basin.status,'permission_required');
 assert.equal(configured.basin.warehouses.length,0);
 const env={BASIN_OVERVIEW_ADAPTER:{async inspect(){
  return {authorized:true,warehouses:[{id:'wh',label:'Warehouse'}],pipelines:[],catalogTables:[]};
 }}};
 const resolved=await getHealthAnalytics(env,'24h');
 assert.equal(resolved.basin.status,'connected');
 assert.equal(resolved.basin.warehouses[0].id,'wh');
});
test('cron and frontend have no one-minute probe or fabricated dashboard metrics',()=>{
 const wrangler=readFileSync('wrangler.toml','utf8');
 const worker=readFileSync('apps/ecommerce-cms-agentsam/backend/index.js','utf8');
 const frontend=readFileSync('apps/ecommerce-cms-agentsam/frontend/src/pages/analytics/HealthPage.tsx','utf8');
 assert.match(wrangler,/\*\/30 \* \* \* \*/);
 assert.doesNotMatch(wrangler,/\*\/1 \* \* \* \*/);
 assert.match(worker,/event\.cron === "\*\/30 \* \* \* \*"/);
 assert.match(worker,/event\.cron !== "0 4 \* \* \*"/);
 assert.doesNotMatch(frontend,/genSeries\(|Supabase Auth|Subscription reconnect storm|99\.992/);
 assert.match(frontend,/BasinOverviewPanel/);
 assert.match(frontend,/NoSource/);
});
