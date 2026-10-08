import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {
 redactDiagnosticText,normalizeDiagnosticLog,formatDiagnosticLog,diagnosticContext,
} from "../packages/commerce-analytics/src/diagnostic-log.js";
import {
 fetchCloudflareLiveLogs,normalizeWorkerTraceRows,
} from "../apps/ecommerce-cms-agentsam/backend/admin/analytics-live-logs.js";

const time=Date.UTC(2026,9,8,1,47);
const trace={
 EventTimestampMs:time,ScriptName:"fuelnfreetime",Outcome:"ok",CPUTimeMs:2,WallTimeMs:30,EventType:"fetch",
 Event:{request:{url:"https://fuelnfreetime.com/api/admin/orders?access_token=secret",headers:{"cf-ray":"abc012"}}},
 Logs:[
 {Level:"warn",Message:"asset.job retry attempt=1; Authorization: Bearer supersecret-token",Timestamp:time},
 {Level:"error",Message:'{"access_token":"topsecret", "api_key": "secret-key", "route":"/api/orders"}',Timestamp:time},
 ],
};
test("normalizes real Worker traces, retains diagnostic IDs and drops credentials before HTTP",()=>{
 const records=normalizeWorkerTraceRows([trace]);
 assert.equal(records.length,2);
 assert.equal(records[0].source,"cloudflare-workers");
 assert.equal(records[0].service,"fuelnfreetime");
 assert.equal(records[0].rayId,"abc012");
 assert.equal(records[0].route,"/api/admin/orders");
 assert.equal(records[0].durationMs,30);
 const output=JSON.stringify(records);
 assert.doesNotMatch(output,/supersecret|topsecret|secret-key|access_token=secret/);
 assert.match(output,/abc012/);
});
test("redaction excludes credentials while preserving useful request/job IDs",()=>{
 const log=normalizeDiagnosticLog({
  timestamp:new Date(time).toISOString(),service:"asset.job",source:"cloudflare-workers",
  severity:"warn",message:'Cookie: session=hi; Set-Cookie: abc=xyz Authorization=Bearer zzz',
  requestId:"req-abc",metadata:{attempt:2,job_id:"job-77",secret:"should-not-appear",access_token:"key"},
 });
 assert.doesNotMatch(JSON.stringify(log),/should-not-appear|key"|session=hi|Bearer zzz/);
 const payload=diagnosticContext([log],{range:"24h",level:"warn",search:"asset"});
 assert.equal(payload.selected_logs[0].requestId,"req-abc");
 assert.equal(payload.selected_logs[0].metadata.job_id,"job-77");
 assert.match(payload.source_note,/Untrusted/);
 assert.match(formatDiagnosticLog(log),/request_id: req-abc/);
 assert.equal(redactDiagnosticText("Bearer this_should_be_redacted"),"[AUTH REDACTED]");
});
test("missing Cloudflare credentials never query or fabricate Worker logs",async()=>{
 let requests=0;
 const result=await fetchCloudflareLiveLogs({CLOUDFLARE_ACCOUNT_ID:"abcdef0123456789abcdef0123456789"},
  {fetchImpl:async()=>{requests++;return {}}});
 assert.equal(result.ok,false);
 assert.equal(result.error,"cloudflare_logs_credential_required");
 assert.deepEqual(result.logs,[]);
 assert.equal(requests,0);
});
test("authorized on-demand query sends fixed SQL, never token to client, and bounds result rows",async()=>{
 let requested,sql;
 const result=await fetchCloudflareLiveLogs({
  CLOUDFLARE_ACCOUNT_ID:"abcdef0123456789abcdef0123456789",CLOUDFLARE_API_TOKEN:"topsecret",
 },{now:time+30_000,windowSeconds:120,fetchImpl:async (url,opts)=>{
  requested={url,opts};sql=opts.body;
  return {ok:true,json:async()=>({success:true,result:[trace]})};
 }});
 assert.equal(result.ok,true);
 assert.equal(result.logs.length,2);
 assert.ok(requested.url.endsWith("/accounts/abcdef0123456789abcdef0123456789/logs/explorer/query/sql"));
 assert.equal(requested.opts.method,"POST");
 assert.match(sql,/workers_trace_events/);
 assert.match(sql,/ScriptName = 'fuelnfreetime'/);
 assert.match(sql,/LIMIT 80/);
 assert.ok(requested.opts.headers.Authorization.includes("topsecret"));
 assert.doesNotMatch(JSON.stringify(result),/topsecret|Bearer/);
});
test("Logs Explorer permission failure returns unavailable, not a simulated stream",async()=>{
 const result=await fetchCloudflareLiveLogs({
  CLOUDFLARE_ACCOUNT_ID:"abcdef0123456789abcdef0123456789",CLOUDFLARE_API_TOKEN:"secret",
 },{fetchImpl:async()=>({ok:false,status:403})});
 assert.equal(result.ok,false);
 assert.equal(result.status,424);
 assert.deepEqual(result.logs,[]);
});
test("Health log viewer is opt-in and Ask AgentSam pre-fills without sending",()=>{
 const ui=readFileSync("packages/commerce-analytics/src/live-diagnostic-logs.tsx","utf8");
 const host=readFileSync("apps/ecommerce-cms-agentsam/frontend/src/pages/analytics/HealthPage.tsx","utf8");
 const route=readFileSync("apps/ecommerce-cms-agentsam/backend/admin/api.js","utf8");
 assert.match(ui,/useState\(false\)/);
 assert.match(ui,/if\(!active\|\|!poll\)return/);
 assert.match(ui,/controller\?\.abort\(\)/);
 assert.match(ui,/visibilitychange/);
 assert.match(ui,/shiftKey/);
 assert.match(ui,/Copy/);
 assert.match(ui,/Ask AgentSam/);
 assert.match(ui,/View details/);
 assert.match(host,/window\.setAgentsamPageContext\?\.\(context\)/);
 assert.match(host,/window\.openAgentsamDrawer\?\.\(\)/);
 assert.match(host,/input\.value="Help me diagnose/);
 assert.doesNotMatch(host,/window\.sendAgentsamMessage\(/);
 assert.match(route,/logs_admin_permission_required/);
 assert.match(route,/cache-control":"no-store/);
});
