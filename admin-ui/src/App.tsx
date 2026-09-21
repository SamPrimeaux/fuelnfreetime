import { useEffect, type ComponentType } from "react";
import { Navigate, Route, Routes, useOutletContext } from "react-router-dom";
import AdminLayout from "./layout/AdminLayout";
import AnalyticsShell from "./pages/analytics/AnalyticsShell";
import OverviewPage from "./pages/analytics/OverviewPage";
import FinancePage from "./pages/analytics/FinancePage";
import HealthPage from "./pages/analytics/HealthPage";
import AccountPage from "./pages/account/AccountPage";
import ProductStudioPage from "./pages/products/ProductStudioPage";
import type { RangeKey } from "./lib/types";

export type AnalyticsOutletContext = { range: RangeKey; setRange: (r: RangeKey) => void };

export default function App() {
  return (
    <Routes>
      <Route element={<AdminLayout />}>
        <Route index element={<Navigate to="analytics/overview" replace />} />
        <Route path="analytics" element={<AnalyticsShell />}>
          <Route index element={<Navigate to="overview" replace />} />
          <Route path="overview" element={<AnalyticsRoute page={OverviewPage} title="Overview" />} />
          <Route path="finance" element={<AnalyticsRoute page={FinancePage} title="Finance" />} />
          <Route path="health" element={<AnalyticsRoute page={HealthPage} title="Health" />} />
        </Route>
        <Route path="account" element={<AccountRoute />} />
        <Route path="products/create" element={<ProductStudioRoute />} />
      </Route>
      <Route path="*" element={<Navigate to="/analytics/overview" replace />} />
    </Routes>
  );
}

function AccountRoute() {
  useEffect(() => {
    document.title = "Account — Fuel & Free Time Admin";
  }, []);
  return <AccountPage />;
}

function ProductStudioRoute() {
  useEffect(() => {
    document.title = "New product — Fuel & Free Time Admin";
  }, []);
  return <ProductStudioPage />;
}

function AnalyticsRoute({
  page: Page,
  title,
}: {
  page: ComponentType<{ range: RangeKey; tenant?: string }>;
  title: string;
}) {
  const { range } = useOutletContext<AnalyticsOutletContext>();
  useEffect(() => {
    document.title = `${title} — Fuel & Free Time Admin`;
  }, [title]);
  return <Page range={range} tenant="all" />;
}
