'use client';

import { useEffect, useState } from 'react';

interface Plan {
  id: string;
  name: string;
  description: string | null;
  priceMonthly: number;
  priceYearly: number;
  maxMenuItems: number;
  maxApiCallsMonthly: number;
  features: unknown[];
  isActive: boolean;
}

export default function PlansPage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [newPlan, setNewPlan] = useState({
    name: '',
    description: '',
    priceMonthly: 0,
    priceYearly: 0,
  });

  const fetchPlans = async () => {
    try {
      const res = await fetch('/api/platform/plans');
      if (res.ok) {
        const data = await res.json();
        setPlans(data.plans);
      }
    } catch (error) {
      console.error('Failed to fetch plans:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlans();
  }, []);

  const handleCreatePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/platform/plans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newPlan),
      });

      if (res.ok) {
        setShowModal(false);
        setNewPlan({ name: '', description: '', priceMonthly: 0, priceYearly: 0 });
        fetchPlans();
      }
    } catch (error) {
      console.error('Failed to create plan:', error);
    }
  };

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Subscription Plans</h1>
        <button
          onClick={() => setShowModal(true)}
          className="px-4 py-2 bg-teal-600 text-white rounded-lg font-medium hover:bg-teal-700 transition-colors"
        >
          + Add Plan
        </button>
      </div>

      {/* Plans Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          [...Array(3)].map((_, i) => (
            <div key={i} className="bg-white rounded-xl p-6 shadow-sm animate-pulse">
              <div className="h-6 bg-gray-200 rounded w-24 mb-4"></div>
              <div className="h-10 bg-gray-200 rounded w-32 mb-4"></div>
              <div className="h-4 bg-gray-200 rounded w-full"></div>
            </div>
          ))
        ) : plans.length === 0 ? (
          <div className="col-span-full text-center py-12 text-gray-500">
            No plans created yet
          </div>
        ) : (
          plans.map((plan) => (
            <div
              key={plan.id}
              className="bg-white rounded-xl p-6 shadow-sm border border-gray-100"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-lg text-gray-900">
                  {plan.name}
                </h3>
                <span
                  className={`px-2 py-1 text-xs rounded ${
                    plan.isActive
                      ? 'bg-green-100 text-green-700'
                      : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {plan.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>
              <p className="text-3xl font-bold text-teal-600 mb-2">
                €{Number(plan.priceMonthly).toFixed(0)}
                <span className="text-base font-normal text-gray-500">
                  /month
                </span>
              </p>
              <p className="text-sm text-gray-500">{plan.description || 'No description'}</p>
              <p className="text-xs text-gray-400 mt-2">Up to {plan.maxMenuItems} menu items</p>
            </div>
          ))
        )}
      </div>

      {/* Create Plan Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <h2 className="text-xl font-bold text-gray-900 mb-6">Create New Plan</h2>
            <form onSubmit={handleCreatePlan} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Plan Name
                </label>
                <input
                  type="text"
                  value={newPlan.name}
                  onChange={(e) => setNewPlan({ ...newPlan, name: e.target.value })}
                  required
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                  placeholder="Starter"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <input
                  type="text"
                  value={newPlan.description}
                  onChange={(e) => setNewPlan({ ...newPlan, description: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                  placeholder="Best for small restaurants"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Monthly Price (€)
                </label>
                <input
                  type="number"
                  value={newPlan.priceMonthly}
                  onChange={(e) => setNewPlan({ ...newPlan, priceMonthly: Number(e.target.value) })}
                  required
                  min="0"
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Yearly Price (€)
                </label>
                <input
                  type="number"
                  value={newPlan.priceYearly}
                  onChange={(e) => setNewPlan({ ...newPlan, priceYearly: Number(e.target.value) })}
                  required
                  min="0"
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>
              <div className="flex gap-4 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700"
                >
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
