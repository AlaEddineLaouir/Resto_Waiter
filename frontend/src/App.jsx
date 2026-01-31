import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { TenantProvider, AuthProvider } from './contexts';
import { Layout, ErrorBoundary } from './components/common';
import { MenuPage } from './components/menu';
import { SettingsPage } from './components/settings';
import {
  LoginPage,
  AdminLayout,
  DashboardPage,
  MenuManagementPage,
  IngredientsPage,
  AdminSettingsPage,
} from './components/admin';
import { ChatPage } from './pages';

function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <TenantProvider>
          <AuthProvider>
            <Routes>
              {/* Public Routes with shared layout */}
              <Route path="/" element={<Layout />}>
                <Route index element={<ChatPage />} />
                <Route path="menu" element={<MenuPage />} />
                <Route path="settings" element={<SettingsPage />} />
              </Route>

              {/* Admin Routes */}
              <Route path="/admin/login" element={<LoginPage />} />
              <Route path="/admin" element={<AdminLayout />}>
                <Route index element={<DashboardPage />} />
                <Route path="menu" element={<MenuManagementPage />} />
                <Route path="ingredients" element={<IngredientsPage />} />
                <Route path="settings" element={<AdminSettingsPage />} />
              </Route>

              {/* Multi-tenant routes - same structure with tenant prefix */}
              <Route path="/t/:tenantId" element={<Layout />}>
                <Route index element={<ChatPage />} />
                <Route path="menu" element={<MenuPage />} />
                <Route path="settings" element={<SettingsPage />} />
              </Route>
            </Routes>
          </AuthProvider>
        </TenantProvider>
      </BrowserRouter>
    </ErrorBoundary>
  );
}

export default App;
