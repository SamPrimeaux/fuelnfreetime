// Main App — embedded mode (no sidebar/topbar)
function App() {
  const ROUTES = { overview: '/admin/dashboard/overview.html', finance: '/admin/dashboard/finance.html', health: '/admin/dashboard/analytics.html' };
  const initial = window.__FNF_INITIAL_VIEW || 'overview';
  const [view, setView] = useState(initial);
  const [range, setRange] = useState('30d');

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'finance',  label: 'Finance' },
    { id: 'health',   label: 'Health' },
  ];

  const Page = view === 'overview' ? OverviewPage : view === 'finance' ? FinancePage : HealthPage;

  return (
    <div className="embed">
      <div className="embed-bar">
        <div className="seg">
          {tabs.map(t => (
            <button key={t.id} className={view === t.id ? 'active' : ''} onClick={() => { if (view !== t.id && ROUTES[t.id]) { if (window.parent !== window) { window.parent.postMessage({ type: 'fnf-analytics-nav', view: t.id }, '*'); } else { window.location.href = ROUTES[t.id]; } } else setView(t.id); }}>
              {t.label}
            </button>
          ))}
        </div>
        <div style={{ marginLeft: 'auto' }}>
          <RangePicker value={range} onChange={setRange} />
        </div>
      </div>
      <div className="page">
        <Page range={range} tenant="all" />
      </div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
