'use client';

import { usePermissions, RequirePermission } from '@/lib/permissions';
import AdminDashboard from '@/components/dashboards/AdminDashboard';
import ManagerDashboard from '@/components/dashboards/ManagerDashboard';
import ChefDashboard from '@/components/dashboards/ChefDashboard';
import WaiterDashboard from '@/components/dashboards/WaiterDashboard';

/**
 * Role-based dashboard router.
 * Renders the appropriate dashboard component based on the user's role.
 */
export default function RestaurantAdminDashboard() {
  const { user, loading } = usePermissions();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const role = user?.role;

  return (
    <RequirePermission entity="dashboard" action="read">
      {role === 'admin' && <AdminDashboard />}
      {role === 'manager' && <ManagerDashboard />}
      {role === 'chef' && <ChefDashboard />}
      {role === 'waiter' && <WaiterDashboard />}
      {/* Fallback for unknown roles — show admin dashboard */}
      {role && !['admin', 'manager', 'chef', 'waiter'].includes(role) && <AdminDashboard />}
    </RequirePermission>
  );
}
