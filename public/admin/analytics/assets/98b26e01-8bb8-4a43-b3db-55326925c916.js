// Overview Dashboard
const { useState: useStateO, useMemo: useMemoO, useEffect: useEffectO } = React;

function OverviewPage({ range, tenant }) {
  const seed = (range.length + tenant.length) * 7;
  const days = range === '24h' ? 24 : range === '7d' ? 7 : range === '30d' ? 30 : range === '90d' ? 90 : range === 'YTD' ? 124 : 365;

  const xLabels = useMemoO(() => {
    if (range === '24h') return Array.from({ length: 24 }, (_, i) => `${i.toString().padStart(2,'0')}:00`);
    const arr = [];
    const now = new Date('2026-05-04');
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(now); d.setDate(d.getDate() - i);
      arr.push(`${d.getMonth()+1}/${d.getDate()}`);
    }
    return arr;
  }, [range, days]);

  const requests = genSeries(days, { seed: seed+1, base: 1.2e6, trend: 0.6, noise: 0.18, season: 0.15 });
  const requestsPrev = genSeries(days, { seed: seed+12, base: 0.9e6, trend: 0.4, noise: 0.18 });
  const activeUsers = genSeries(days, { seed: seed+2, base: 18000, trend: 0.5, noise: 0.1, season: 0.1 });
  const errors = genSeries(days, { seed: seed+3, base: 80, trend: -0.2, noise: 0.4 });
  const latency = genSeries(days, { seed: seed+4, base: 142, trend: -0.15, noise: 0.2 });

  const tenants = [
    { name: 'Acme Studios', plan: 'Enterprise', mrr: 24800, users: 1820, dau: 1402, growth: 12.4, status: 'good', region: 'us-east' },
    { name: 'Lumen Health', plan: 'Scale',      mrr: 8400,  users: 612,  dau: 412,  growth: 28.2, status: 'good', region: 'eu-west' },
    { name: 'Mosaic Finance', plan: 'Enterprise', mrr: 31200, users: 2204, dau: 1788, growth: 6.1, status: 'good', region: 'us-west' },
    { name: 'Nimbus Labs', plan: 'Growth',    mrr: 2400,  users: 218,  dau: 188,  growth: -3.2, status: 'warn', region: 'ap-southeast' },
    { name: 'Orbit Retail', plan: 'Scale',    mrr: 9600,  users: 884,  dau: 624,  growth: 4.8,  status: 'good', region: 'us-east' },
    { name: 'Pinecrest Co.', plan: 'Growth',  mrr: 1800,  users: 142,  dau: 98,   growth: 18.0, status: 'good', region: 'eu-central' },
    { name: 'Quantic AI',     plan: 'Enterprise', mrr: 42000, users: 3120, dau: 2680, growth: 22.4, status: 'good', region: 'us-east' },
    { name: 'Rivermark Edu', plan: 'Free',     mrr: 0,     users: 320,  dau: 142,  growth: 1.4,  status: 'warn', region: 'eu-west' },
  ];

  const events = [
    { t: '2 min ago', kind: 'deploy', tenant: 'Acme Studios', text: 'Deployed v3.18.2 to production', icon: 'sparkles', tone: 'accent' },
    { t: '14 min ago', kind: 'alert',  tenant: 'Nimbus Labs',  text: 'D1 query p99 exceeded 250ms threshold', icon: 'flag', tone: 'warn' },
    { t: '38 min ago', kind: 'billing', tenant: 'Quantic AI', text: 'Plan upgraded → Enterprise ($42K MRR)', icon: 'receipt', tone: 'good' },
    { t: '1 hr ago',   kind: 'auth',    tenant: 'Mosaic Finance', text: 'New SSO connection (Okta) configured', icon: 'shield', tone: 'info' },
    { t: '3 hr ago',   kind: 'data',    tenant: 'Lumen Health', text: 'KV write throughput +212% spike resolved', icon: 'bolt', tone: 'good' },
    { t: '5 hr ago',   kind: 'user',    tenant: 'Orbit Retail',  text: '14 invites accepted in workspace', icon: 'users', tone: 'info' },
  ];

  const funnel = [
    { label: 'Visited landing',   value: 124800, color: 'var(--accent)' },
    { label: 'Started trial',      value: 18200,  color: 'oklch(0.66 0.18 295)' },
    { label: 'Completed onboarding', value: 12400, color: 'oklch(0.64 0.16 305)' },
    { label: 'Connected data',     value: 7920,   color: 'oklch(0.62 0.14 315)' },
    { label: 'Converted to paid',  value: 1842,   color: 'oklch(0.78 0.17 155)' },
  ];

  const geoData = [
    { c: 'US', v: 412800, x: 22, y: 38 },
    { c: 'CA', v: 84200,  x: 24, y: 26 },
    { c: 'BR', v: 62400,  x: 36, y: 64 },
    { c: 'GB', v: 138400, x: 48, y: 32 },
    { c: 'DE', v: 102200, x: 52, y: 32 },
    { c: 'FR', v: 78400,  x: 49, y: 34 },
    { c: 'IN', v: 184800, x: 68, y: 50 },
    { c: 'JP', v: 96400,  x: 84, y: 42 },
    { c: 'AU', v: 48400,  x: 84, y: 76 },
    { c: 'SG', v: 32400,  x: 76, y: 58 },
    { c: 'ZA', v: 14200,  x: 56, y: 72 },
    { c: 'AR', v: 9800,   x: 32, y: 78 },
  ];

  // Heatmap (7d × 24h)
  const hmRand = seedRand(seed + 99);
  const hmCells = Array.from({ length: 7 }, () => Array.from({ length: 24 }, () => hmRand()));
  // Boost peaks
  for (let d = 0; d < 7; d++) {
    for (let h = 8; h < 20; h++) hmCells[d][h] = Math.min(1, hmCells[d][h] + 0.3);
    if (d === 1 || d === 5) for (let h = 14; h < 18; h++) hmCells[d][h] = Math.min(1, hmCells[d][h] + 0.3);
  }
  const days7 = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];

  return (
    <>
      <div className="page-head">
        <div>
          <h1 className="page-title">Overview</h1>
          <p className="page-sub">Cross-tenant performance across all services • Last refreshed 12s ago</p>
        </div>
        <div className="page-actions">
          <button className="btn ghost"><Icon name="filter" size={12} /> Filters</button>
          <button className="btn"><Icon name="download" size={12} /> Export</button>
          <button className="btn primary"><Icon name="plus" size={12} /> New report</button>
        </div>
      </div>

      <div className="grid cols-4" style={{ marginBottom: 14 }}>
        <KPI label="Active users (28d)" value={fmtNum(248124, { compact: true })} delta={12.6}
          spark={genSeries(28, { seed: 11, base: 200000, trend: 0.4, noise: 0.08 })} icon="users" />
        <KPI label="Requests / min" value={fmtNum(28412, { compact: true })} delta={4.2}
          spark={requests.slice(-30)} icon="activity" />
        <KPI label="MRR" value="$418.2" unit="K" delta={8.4} sparkColor="var(--good)"
          spark={genSeries(28, { seed: 31, base: 360000, trend: 0.5, noise: 0.04 })} icon="finance" />
        <KPI label="Error rate" value="0.142" unit="%" delta={-22.4} sparkColor="var(--bad)"
          spark={errors.slice(-30)} icon="bolt" deltaLabel="vs prev (lower is better)" />
      </div>

      <div className="grid cols-12" style={{ marginBottom: 14 }}>
        <div className="card span-8">
          <div className="card-head">
            <div>
              <div className="card-title">Traffic</div>
              <div className="card-sub">Requests across all tenants and services</div>
            </div>
            <div className="row gap-2">
              <span className="pill"><span className="live-dot" /> Live</span>
              <div className="seg">
                <button className="active">Requests</button>
                <button>Bandwidth</button>
                <button>Sessions</button>
              </div>
            </div>
          </div>
          <div className="card-body">
            <AreaChart
              height={240}
              series={[
                { name: 'This period', data: requests, color: 'oklch(0.68 0.22 285)' },
                { name: 'Previous',  data: requestsPrev, color: 'oklch(0.46 0.05 270)' },
              ]}
              xLabels={xLabels}
            />
          </div>
        </div>

        <div className="card span-4">
          <div className="card-head">
            <div>
              <div className="card-title">Conversion funnel</div>
              <div className="card-sub">Trial → Paid, last 30 days</div>
            </div>
            <button className="icon-btn"><Icon name="more" size={14} /></button>
          </div>
          <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {funnel.map((f, i) => {
              const pct = (f.value / funnel[0].value) * 100;
              const stepDrop = i > 0 ? ((funnel[i-1].value - f.value) / funnel[i-1].value) * 100 : 0;
              return (
                <div key={i}>
                  <div className="row-between" style={{ marginBottom: 4 }}>
                    <span className="text-sm">{f.label}</span>
                    <span className="text-xs mono muted">{fmtNum(f.value, { compact: true })} • {pct.toFixed(1)}%</span>
                  </div>
                  <div style={{ position: 'relative' }}>
                    <div style={{
                      width: pct + '%', height: 28, borderRadius: 6,
                      background: `linear-gradient(90deg, ${f.color}, ${f.color}66)`,
                      border: `1px solid ${f.color}66`,
                    }} />
                    {i > 0 && <span style={{
                      position: 'absolute', right: -2, top: 8, fontSize: 10,
                      color: 'var(--bad)', fontFamily: 'var(--mono)',
                    }}>−{stepDrop.toFixed(0)}%</span>}
                  </div>
                </div>
              );
            })}
            <div className="row-between" style={{ marginTop: 8, paddingTop: 10, borderTop: '1px solid var(--line-soft)' }}>
              <span className="text-xs muted">Trial → Paid conversion</span>
              <span className="mono fw-600" style={{ color: 'var(--good)' }}>10.1%</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid cols-12" style={{ marginBottom: 14 }}>
        <div className="card span-7">
          <div className="card-head">
            <div>
              <div className="card-title">Geographic distribution</div>
              <div className="card-sub">Active users by country (24h)</div>
            </div>
            <span className="pill info"><span className="dot" /> 124 countries</span>
          </div>
          <div className="card-body">
            <div style={{ position: 'relative', height: 260, background: 'var(--bg-2)', borderRadius: 8, overflow: 'hidden' }}>
              <svg viewBox="0 0 100 100" preserveAspectRatio="none" style={{ width: '100%', height: '100%' }}>
                <defs>
                  <pattern id="grid-pattern" width="5" height="5" patternUnits="userSpaceOnUse">
                    <path d="M5 0H0V5" stroke="oklch(0.24 0.012 270)" strokeWidth="0.1" fill="none" />
                  </pattern>
                </defs>
                <rect width="100" height="100" fill="url(#grid-pattern)" />
                {/* Stylized continent blobs */}
                <g fill="oklch(0.26 0.012 270)">
                  <ellipse cx="22" cy="42" rx="14" ry="14" />
                  <ellipse cx="32" cy="70" rx="6" ry="14" />
                  <ellipse cx="50" cy="38" rx="10" ry="10" />
                  <ellipse cx="58" cy="68" rx="9" ry="11" />
                  <ellipse cx="74" cy="50" rx="14" ry="14" />
                  <ellipse cx="84" cy="74" rx="6" ry="6" />
                </g>
                {geoData.map((g, i) => {
                  const r = 0.6 + Math.sqrt(g.v / 1000) * 0.07;
                  return (
                    <g key={i}>
                      <circle cx={g.x} cy={g.y} r={r * 1.6} fill="oklch(0.68 0.22 285 / 0.25)" />
                      <circle cx={g.x} cy={g.y} r={r} fill="oklch(0.78 0.20 285)" />
                    </g>
                  );
                })}
              </svg>
            </div>
            <div className="row gap-3" style={{ marginTop: 10, flexWrap: 'wrap' }}>
              {geoData.slice(0, 6).map((g, i) => (
                <div key={i} className="row gap-2" style={{ fontSize: 11 }}>
                  <span style={{ width: 22, fontWeight: 600 }}>{g.c}</span>
                  <span className="mono muted">{fmtNum(g.v, { compact: true })}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="card span-5">
          <div className="card-head">
            <div>
              <div className="card-title">Activity heatmap</div>
              <div className="card-sub">Request volume by hour of week</div>
            </div>
            <span className="text-xs muted mono">UTC</span>
          </div>
          <div className="card-body">
            <div style={{ display: 'grid', gridTemplateColumns: '32px 1fr', gap: 4, alignItems: 'center' }}>
              <div></div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(24, 1fr)', gap: 2, fontSize: 9, color: 'var(--fg-3)', fontFamily: 'var(--mono)' }}>
                {[0,4,8,12,16,20].map((h, i) => (
                  <span key={h} style={{ gridColumn: `${h+1} / span 4`, textAlign: 'left' }}>{h.toString().padStart(2,'0')}</span>
                ))}
              </div>
              {hmCells.map((row, di) => (
                <Fragment key={di}>
                  <span style={{ fontSize: 10, color: 'var(--fg-3)', fontFamily: 'var(--mono)' }}>{days7[di]}</span>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(24, 1fr)', gap: 2 }}>
                    {row.map((v, hi) => (
                      <div key={hi} title={`${days7[di]} ${hi}:00 — ${(v*100).toFixed(0)}%`}
                        style={{
                          aspectRatio: '1', borderRadius: 2,
                          background: `oklch(${0.22 + v * 0.50} ${v * 0.20} 285 / ${0.3 + v * 0.7})`,
                        }} />
                    ))}
                  </div>
                </Fragment>
              ))}
            </div>
            <div className="row gap-2" style={{ marginTop: 12, justifyContent: 'flex-end', fontSize: 10, color: 'var(--fg-3)' }}>
              <span>Less</span>
              {[0.1, 0.3, 0.5, 0.7, 0.9].map(v => (
                <span key={v} style={{ width: 12, height: 12, borderRadius: 2, background: `oklch(${0.22 + v * 0.50} ${v * 0.20} 285 / ${0.3 + v * 0.7})` }} />
              ))}
              <span>More</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid cols-12">
        <div className="card span-7">
          <div className="card-head">
            <div>
              <div className="card-title">Top tenants</div>
              <div className="card-sub">Sorted by MRR contribution</div>
            </div>
            <div className="row gap-2">
              <button className="btn ghost text-xs">Sort: MRR <Icon name="chevronDown" size={11} /></button>
              <button className="btn ghost text-xs">View all →</button>
            </div>
          </div>
          <div style={{ overflow: 'auto' }}>
            <table className="tbl">
              <thead>
                <tr>
                  <th>Tenant</th>
                  <th>Plan</th>
                  <th>Region</th>
                  <th className="num">Users</th>
                  <th className="num">DAU</th>
                  <th className="num">MRR</th>
                  <th className="num">Δ 30d</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {tenants.map((t, i) => (
                  <tr key={i} className="row-link">
                    <td>
                      <div className="row gap-2">
                        <div style={{ width: 22, height: 22, borderRadius: 5, background: `oklch(0.5 0.15 ${(i*40)%360})`, display: 'grid', placeItems: 'center', fontSize: 10, fontWeight: 600 }}>
                          {t.name[0]}
                        </div>
                        <span style={{ fontWeight: 500 }}>{t.name}</span>
                      </div>
                    </td>
                    <td><span className={`pill ${t.plan === 'Enterprise' ? 'accent' : t.plan === 'Free' ? '' : 'info'}`}>{t.plan}</span></td>
                    <td className="mono muted text-xs">{t.region}</td>
                    <td className="num">{fmtNum(t.users)}</td>
                    <td className="num">{fmtNum(t.dau)}</td>
                    <td className="num">${fmtNum(t.mrr)}</td>
                    <td className="num" style={{ color: t.growth >= 0 ? 'var(--good)' : 'var(--bad)' }}>
                      {t.growth >= 0 ? '+' : ''}{t.growth.toFixed(1)}%
                    </td>
                    <td><span className={`pill ${t.status}`}><span className="dot" /> {t.status === 'good' ? 'Healthy' : 'Watch'}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card span-5">
          <div className="card-head">
            <div>
              <div className="card-title">Activity stream</div>
              <div className="card-sub">Cross-tenant events</div>
            </div>
            <span className="pill"><span className="live-dot" /> Live</span>
          </div>
          <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {events.map((e, i) => (
              <div key={i} className="row gap-3" style={{ padding: '10px 0', borderBottom: i < events.length - 1 ? '1px solid var(--line-soft)' : 'none' }}>
                <div style={{
                  width: 28, height: 28, borderRadius: 7, flexShrink: 0,
                  display: 'grid', placeItems: 'center',
                  background: e.tone === 'good' ? 'oklch(0.42 0.13 155 / 0.18)' :
                              e.tone === 'warn' ? 'oklch(0.50 0.13 85 / 0.18)' :
                              e.tone === 'info' ? 'oklch(0.46 0.13 220 / 0.18)' :
                              'oklch(0.42 0.16 285 / 0.20)',
                  color: e.tone === 'good' ? 'var(--good)' : e.tone === 'warn' ? 'var(--warn)' : e.tone === 'info' ? 'var(--info)' : 'var(--accent)',
                }}>
                  <Icon name={e.icon} size={13} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="text-sm" style={{ color: 'var(--fg)' }}>{e.text}</div>
                  <div className="row gap-2 text-xs muted" style={{ marginTop: 2 }}>
                    <span>{e.tenant}</span>
                    <span>•</span>
                    <span>{e.t}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="card-foot">
            <span>Showing 6 of 1,284 events</span>
            <button className="btn ghost text-xs">View all →</button>
          </div>
        </div>
      </div>
    </>
  );
}

window.OverviewPage = OverviewPage;
