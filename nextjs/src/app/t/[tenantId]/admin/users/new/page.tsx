'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';

/* ── Types ──────────────────────────────────────────────── */
interface SystemRole {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  icon: string | null;
  color: string | null;
  level: number;
  isDefault: boolean;
  permissionKeys: string[];
  permissions: SystemPermission[];
}

interface SystemPermission {
  id: string;
  key: string;
  label: string;
  description: string | null;
  category: string;
}

interface Location {
  id: string;
  name: string;
  slug: string;
}

interface CurrentUser {
  id: string;
  email: string;
  role: string;
}

/* ── Helpers ────────────────────────────────────────────── */
function validatePassword(pw: string) {
  const errors: string[] = [];
  if (pw.length < 8) errors.push('At least 8 characters');
  if (!/[A-Z]/.test(pw)) errors.push('One uppercase letter');
  if (!/[a-z]/.test(pw)) errors.push('One lowercase letter');
  if (!/[0-9]/.test(pw)) errors.push('One number');
  return { valid: errors.length === 0, errors };
}
function validateEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function generatePassword(length = 14): string {
  const upper = 'ABCDEFGHJKMNPQRSTUVWXYZ';
  const lower = 'abcdefghjkmnpqrstuvwxyz';
  const digits = '23456789';
  const all = upper + lower + digits;
  let pw = '';
  pw += upper[Math.floor(Math.random() * upper.length)];
  pw += lower[Math.floor(Math.random() * lower.length)];
  pw += digits[Math.floor(Math.random() * digits.length)];
  for (let i = 3; i < length; i++) pw += all[Math.floor(Math.random() * all.length)];
  return pw
    .split('')
    .sort(() => Math.random() - 0.5)
    .join('');
}

/* ── Page ───────────────────────────────────────────────── */
export default function NewUserPage() {
  const params = useParams();
  const router = useRouter();
  const tenantId = params.tenantId as string;

  // Data
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [systemRoles, setSystemRoles] = useState<SystemRole[]>([]);
  const [groupedPermissions, setGroupedPermissions] = useState<Record<string, SystemPermission[]>>({});
  const [locations, setLocations] = useState<Location[]>([]);

  // Form
  const [form, setForm] = useState({
    email: '',
    username: '',
    displayName: '',
    phone: '',
    notes: '',
    password: '',
    role: '',
    permissions: [] as string[],
    locationIds: [] as string[],
    isActive: true,
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // UI
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [permissionsExpanded, setPermissionsExpanded] = useState<Record<string, boolean>>({});

  // Success state
  const [created, setCreated] = useState(false);
  const [credentials, setCredentials] = useState<{ email: string; password: string; displayName: string } | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  /* ── Derived helpers ─────────────────────────── */
  const getRoleLevel = useCallback(
    (slug: string) => systemRoles.find((r) => r.slug === slug)?.level ?? 0,
    [systemRoles],
  );

  const getRoleBySlug = useCallback(
    (slug: string) => systemRoles.find((r) => r.slug === slug),
    [systemRoles],
  );

  const assignableRoles = currentUser
    ? systemRoles.filter((r) => r.level < getRoleLevel(currentUser.role))
    : [];

  /* ── Fetchers ────────────────────────────────── */
  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [meRes, rolesRes, locsRes] = await Promise.all([
        fetch('/api/admin/auth/me'),
        fetch('/api/admin/roles'),
        fetch('/api/admin/locations'),
      ]);

      if (meRes.ok) {
        const d = await meRes.json();
        if (d.admin) setCurrentUser({ id: d.admin.id, email: d.admin.email, role: d.admin.role });
      }
      if (rolesRes.ok) {
        const d = await rolesRes.json();
        const roles: SystemRole[] = d.roles || [];
        setSystemRoles(roles);
        setGroupedPermissions(d.groupedPermissions || {});
      }
      if (locsRes.ok) {
        const d = await locsRes.json();
        setLocations(d.locations || []);
      }
    } catch {
      setError('Failed to load data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  // Set default role once roles + currentUser are ready
  useEffect(() => {
    if (currentUser && systemRoles.length > 0 && !form.role) {
      const available = systemRoles.filter((r) => r.level < getRoleLevel(currentUser.role));
      const defaultRole = available.find((r) => r.isDefault) || available[0];
      if (defaultRole) {
        setForm((prev) => ({
          ...prev,
          role: defaultRole.slug,
          permissions: defaultRole.permissionKeys || [],
        }));
      }
    }
  }, [currentUser, systemRoles, form.role, getRoleLevel]);

  /* ── Handlers ────────────────────────────────── */
  const updateField = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setFormErrors((prev) => ({ ...prev, [key]: '' }));
  };

  const handleRoleChange = (slug: string) => {
    const role = getRoleBySlug(slug);
    setForm((prev) => ({
      ...prev,
      role: slug,
      permissions: role?.permissionKeys || [],
    }));
  };

  const togglePermission = (key: string) => {
    setForm((prev) => ({
      ...prev,
      permissions: prev.permissions.includes(key)
        ? prev.permissions.filter((p) => p !== key)
        : [...prev.permissions, key],
    }));
  };

  const toggleLocation = (id: string) => {
    setForm((prev) => ({
      ...prev,
      locationIds: prev.locationIds.includes(id)
        ? prev.locationIds.filter((l) => l !== id)
        : [...prev.locationIds, id],
    }));
  };

  const handleGeneratePassword = () => {
    const pw = generatePassword();
    updateField('password', pw);
    setShowPassword(true);
  };

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!form.email) errs.email = 'Email is required';
    else if (!validateEmail(form.email)) errs.email = 'Invalid email';
    if (!form.username) errs.username = 'Username is required';
    else if (form.username.length < 3) errs.username = 'Min 3 characters';
    if (!form.password) errs.password = 'Password is required';
    else {
      const pw = validatePassword(form.password);
      if (!pw.valid) errs.password = pw.errors.join(', ');
    }
    if (!form.role) errs.role = 'Select a role';
    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleCreate = async () => {
    if (!validate()) return;
    setSaving(true);
    setError('');

    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });

      if (res.ok) {
        setCredentials({
          email: form.email,
          password: form.password,
          displayName: form.displayName || form.username,
        });
        setCreated(true);
      } else {
        const d = await res.json();
        setError(d.error || 'Failed to create user');
      }
    } catch {
      setError('Failed to create user');
    } finally {
      setSaving(false);
    }
  };

  const copyToClipboard = async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    } catch {
      /* noop */
    }
  };

  /* ── Loading state ──────────────────────────── */
  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="mt-3 text-sm text-gray-500">Loading…</p>
        </div>
      </div>
    );
  }

  /* ── Success / Credentials Screen ──────────── */
  if (created && credentials) {
    return (
      <div className="p-6 lg:p-8 max-w-lg mx-auto">
        {/* Success Card */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-teal-500 to-teal-600 px-6 py-8 text-center text-white">
            <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-xl font-bold">Staff Member Created!</h1>
            <p className="text-teal-100 mt-1 text-sm">
              Share these credentials with <strong>{credentials.displayName}</strong>
            </p>
          </div>

          {/* Credentials */}
          <div className="p-6 space-y-4">
            <div className="bg-gray-50 rounded-lg p-4">
              <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Email</label>
              <div className="flex items-center justify-between gap-2">
                <span className="font-mono text-gray-900 text-sm truncate">{credentials.email}</span>
                <button
                  onClick={() => copyToClipboard(credentials.email, 'email')}
                  className={`flex-shrink-0 px-3 py-1 text-xs font-medium rounded-lg transition-colors ${
                    copiedField === 'email' ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  {copiedField === 'email' ? '✓ Copied' : 'Copy'}
                </button>
              </div>
            </div>

            <div className="bg-gray-50 rounded-lg p-4">
              <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Password</label>
              <div className="flex items-center justify-between gap-2">
                <span className="font-mono text-gray-900 text-sm truncate">{credentials.password}</span>
                <button
                  onClick={() => copyToClipboard(credentials.password, 'password')}
                  className={`flex-shrink-0 px-3 py-1 text-xs font-medium rounded-lg transition-colors ${
                    copiedField === 'password' ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  {copiedField === 'password' ? '✓ Copied' : 'Copy'}
                </button>
              </div>
            </div>

            <button
              onClick={() =>
                copyToClipboard(`Email: ${credentials.email}\nPassword: ${credentials.password}`, 'all')
              }
              className={`w-full py-3 rounded-lg font-medium text-sm transition-colors ${
                copiedField === 'all'
                  ? 'bg-green-600 text-white'
                  : 'bg-teal-600 text-white hover:bg-teal-700'
              }`}
            >
              {copiedField === 'all' ? '✓ Copied to Clipboard' : '📋 Copy Email & Password'}
            </button>

            <p className="text-xs text-gray-400 text-center">
              ⚠️ This is the only time you can see the password. Make sure to save it.
            </p>
          </div>

          {/* Actions */}
          <div className="px-6 pb-6 flex gap-3">
            <Link
              href={`/t/${tenantId}/admin/users`}
              className="flex-1 text-center py-2.5 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors text-sm font-medium"
            >
              Back to Staff List
            </Link>
            <button
              onClick={() => {
                setCreated(false);
                setCredentials(null);
                setForm({
                  email: '',
                  username: '',
                  displayName: '',
                  phone: '',
                  notes: '',
                  password: '',
                  role: assignableRoles[0]?.slug || '',
                  permissions: assignableRoles[0]?.permissionKeys || [],
                  locationIds: [],
                  isActive: true,
                });
                setFormErrors({});
              }}
              className="flex-1 text-center py-2.5 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors text-sm font-medium"
            >
              + Add Another
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* ── Form ───────────────────────────────────── */
  return (
    <div className="p-6 lg:p-8 max-w-5xl mx-auto">
      {/* ── Breadcrumb ── */}
      <div className="flex items-center gap-2 text-sm text-gray-500 mb-6">
        <Link href={`/t/${tenantId}/admin/users`} className="hover:text-teal-600 transition-colors">
          Staff & Users
        </Link>
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8.25 4.5l7.5 7.5-7.5 7.5" />
        </svg>
        <span className="text-gray-900 font-medium">New Staff Member</span>
      </div>

      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Add Staff Member</h1>
          <p className="text-gray-500 mt-1 text-sm">Create a new account for your team member</p>
        </div>
        <button
          onClick={handleCreate}
          disabled={saving}
          className="px-5 py-2.5 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium text-sm shadow-sm flex-shrink-0"
        >
          {saving ? 'Creating…' : 'Create Staff Member'}
        </button>
      </div>

      {/* ── Error ── */}
      {error && (
        <div className="mb-6 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex items-center gap-2">
          <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {error}
          <button onClick={() => setError('')} className="ml-auto text-red-400 hover:text-red-600">✕</button>
        </div>
      )}

      {/* ── Main Grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ─── LEFT: Profile + Security ─── */}
        <div className="lg:col-span-2 space-y-6">
          {/* SECTION: Profile */}
          <section className="bg-white rounded-xl border border-gray-200 shadow-sm">
            <div className="px-6 py-4 border-b border-gray-100">
              <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2">
                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                </svg>
                Profile Information
              </h2>
            </div>
            <div className="p-6 space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                {/* Display Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Display Name</label>
                  <input
                    type="text"
                    value={form.displayName}
                    onChange={(e) => updateField('displayName', e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-colors"
                    placeholder="John Doe"
                  />
                </div>
                {/* Username */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Username <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={form.username}
                    onChange={(e) => updateField('username', e.target.value)}
                    className={`w-full px-3.5 py-2.5 border rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-colors ${formErrors.username ? 'border-red-400' : 'border-gray-300'}`}
                    placeholder="johndoe"
                  />
                  {formErrors.username && <p className="text-red-500 text-xs mt-1">{formErrors.username}</p>}
                </div>
                {/* Email */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Email <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => updateField('email', e.target.value)}
                    className={`w-full px-3.5 py-2.5 border rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-colors ${formErrors.email ? 'border-red-400' : 'border-gray-300'}`}
                    placeholder="user@restaurant.com"
                  />
                  {formErrors.email && <p className="text-red-500 text-xs mt-1">{formErrors.email}</p>}
                </div>
                {/* Phone */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Phone</label>
                  <input
                    type="tel"
                    value={form.phone}
                    onChange={(e) => updateField('phone', e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-colors"
                    placeholder="+1 234 567 8900"
                  />
                </div>
              </div>
              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Notes</label>
                <textarea
                  value={form.notes}
                  onChange={(e) => updateField('notes', e.target.value)}
                  rows={3}
                  className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-colors resize-none"
                  placeholder="Internal notes about this team member…"
                />
              </div>
            </div>
          </section>

          {/* SECTION: Role & Permissions */}
          <section className="bg-white rounded-xl border border-gray-200 shadow-sm">
            <div className="px-6 py-4 border-b border-gray-100">
              <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2">
                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                </svg>
                Role & Permissions
              </h2>
            </div>
            <div className="p-6 space-y-6">
              {/* Role Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Role <span className="text-red-500">*</span>
                </label>
                {formErrors.role && <p className="text-red-500 text-xs mb-2">{formErrors.role}</p>}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {assignableRoles.map((role) => {
                    const selected = form.role === role.slug;
                    return (
                      <button
                        key={role.slug}
                        type="button"
                        onClick={() => handleRoleChange(role.slug)}
                        className={`flex items-center gap-3 p-4 rounded-xl border-2 text-left transition-all ${
                          selected
                            ? 'border-teal-500 bg-teal-50 ring-1 ring-teal-200'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <span className="text-2xl flex-shrink-0">{role.icon}</span>
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-gray-900 text-sm">{role.name}</div>
                          <div className="text-xs text-gray-500 truncate">{role.description}</div>
                        </div>
                        {selected && (
                          <svg className="w-5 h-5 text-teal-600 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                        )}
                      </button>
                    );
                  })}
                </div>
                {currentUser && (
                  <p className="text-xs text-gray-400 mt-2">
                    You can assign roles below your level ({getRoleBySlug(currentUser.role)?.name})
                  </p>
                )}
              </div>

              {/* Permissions */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="text-sm font-medium text-gray-700">
                    Permissions
                    <span className="ml-2 text-xs font-normal text-gray-400">
                      {form.permissions.length} active
                    </span>
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      const allOpen = Object.values(permissionsExpanded).every(Boolean);
                      const next: Record<string, boolean> = {};
                      Object.keys(groupedPermissions).forEach((k) => (next[k] = !allOpen));
                      setPermissionsExpanded(next);
                    }}
                    className="text-xs text-teal-600 hover:text-teal-800"
                  >
                    {Object.values(permissionsExpanded).every(Boolean) ? 'Collapse all' : 'Expand all'}
                  </button>
                </div>
                <div className="border border-gray-200 rounded-xl divide-y divide-gray-100 overflow-hidden">
                  {Object.entries(groupedPermissions).map(([category, perms]) => {
                    const open = permissionsExpanded[category] ?? false;
                    const activeCount = perms.filter((p) => form.permissions.includes(p.key)).length;
                    return (
                      <div key={category}>
                        <button
                          type="button"
                          onClick={() =>
                            setPermissionsExpanded((prev) => ({ ...prev, [category]: !open }))
                          }
                          className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-gray-50 transition-colors"
                        >
                          <span className="text-sm font-medium text-gray-700 capitalize">{category}</span>
                          <div className="flex items-center gap-2">
                            <span
                              className={`text-xs px-2 py-0.5 rounded-full ${
                                activeCount === perms.length
                                  ? 'bg-teal-100 text-teal-700'
                                  : activeCount > 0
                                    ? 'bg-amber-100 text-amber-700'
                                    : 'bg-gray-100 text-gray-500'
                              }`}
                            >
                              {activeCount}/{perms.length}
                            </span>
                            <svg
                              className={`w-4 h-4 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`}
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          </div>
                        </button>
                        {open && (
                          <div className="px-4 pb-3 space-y-1">
                            {perms.map((perm) => (
                              <label
                                key={perm.key}
                                className="flex items-start gap-3 p-2 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors"
                              >
                                <input
                                  type="checkbox"
                                  checked={form.permissions.includes(perm.key)}
                                  onChange={() => togglePermission(perm.key)}
                                  className="h-4 w-4 mt-0.5 text-teal-600 focus:ring-teal-500 border-gray-300 rounded"
                                />
                                <div>
                                  <span className="text-sm text-gray-800">{perm.label}</span>
                                  {perm.description && (
                                    <p className="text-xs text-gray-400">{perm.description}</p>
                                  )}
                                </div>
                              </label>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </section>
        </div>

        {/* ─── RIGHT SIDEBAR ─── */}
        <div className="space-y-6">
          {/* Password / Security */}
          <section className="bg-white rounded-xl border border-gray-200 shadow-sm">
            <div className="px-5 py-4 border-b border-gray-100">
              <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                </svg>
                Password <span className="text-red-500">*</span>
              </h3>
            </div>
            <div className="px-5 py-4 space-y-3">
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={form.password}
                  onChange={(e) => updateField('password', e.target.value)}
                  className={`w-full px-3.5 py-2.5 border rounded-lg text-sm pr-10 focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-colors ${formErrors.password ? 'border-red-400' : 'border-gray-300'}`}
                  placeholder="Enter password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" /></svg>
                  ) : (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                  )}
                </button>
              </div>
              {formErrors.password && <p className="text-red-500 text-xs">{formErrors.password}</p>}

              <button
                type="button"
                onClick={handleGeneratePassword}
                className="w-full py-2 text-sm font-medium border border-teal-300 text-teal-700 rounded-lg hover:bg-teal-50 transition-colors"
              >
                🎲 Generate Secure Password
              </button>

              {/* Strength indicators */}
              {form.password && (
                <div className="flex flex-wrap gap-1">
                  {(['length', 'upper', 'lower', 'number'] as const).map((rule) => {
                    const pass =
                      rule === 'length' ? form.password.length >= 8
                      : rule === 'upper' ? /[A-Z]/.test(form.password)
                      : rule === 'lower' ? /[a-z]/.test(form.password)
                      : /[0-9]/.test(form.password);
                    return (
                      <span
                        key={rule}
                        className={`text-xs px-2 py-0.5 rounded-full ${pass ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}
                      >
                        {rule === 'length' ? '8+ chars' : rule === 'upper' ? 'A-Z' : rule === 'lower' ? 'a-z' : '0-9'}
                      </span>
                    );
                  })}
                </div>
              )}

              <p className="text-xs text-gray-400">
                The password will be shown once after creation. Make sure to save it.
              </p>
            </div>
          </section>

          {/* Location Access */}
          <section className="bg-white rounded-xl border border-gray-200 shadow-sm">
            <div className="px-5 py-4 border-b border-gray-100">
              <h3 className="text-sm font-semibold text-gray-900">Location Access</h3>
              <p className="text-xs text-gray-400 mt-0.5">
                {form.locationIds.length === 0
                  ? 'Access to all locations'
                  : `${form.locationIds.length} location${form.locationIds.length > 1 ? 's' : ''} selected`}
              </p>
            </div>
            <div className="px-5 py-4">
              {locations.length === 0 ? (
                <p className="text-sm text-gray-400 italic">No locations configured</p>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {locations.map((loc) => (
                    <label
                      key={loc.id}
                      className={`flex items-center gap-3 p-2.5 rounded-lg border transition-all cursor-pointer ${
                        form.locationIds.includes(loc.id)
                          ? 'border-teal-300 bg-teal-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={form.locationIds.includes(loc.id)}
                        onChange={() => toggleLocation(loc.id)}
                        className="h-4 w-4 text-teal-600 focus:ring-teal-500 border-gray-300 rounded"
                      />
                      <div>
                        <span className="text-sm font-medium text-gray-800">{loc.name}</span>
                        <span className="block text-xs text-gray-400">{loc.slug}</span>
                      </div>
                    </label>
                  ))}
                </div>
              )}
              <p className="text-xs text-gray-400 mt-3">Uncheck all for access to every location.</p>
            </div>
          </section>

          {/* Account Status */}
          <section className="bg-white rounded-xl border border-gray-200 shadow-sm">
            <div className="px-5 py-4 border-b border-gray-100">
              <h3 className="text-sm font-semibold text-gray-900">Account Status</h3>
            </div>
            <div className="px-5 py-4">
              <label className="flex items-center justify-between cursor-pointer">
                <div>
                  <span className="text-sm font-medium text-gray-700">Active</span>
                  <p className="text-xs text-gray-400">Inactive users cannot log in</p>
                </div>
                <button
                  type="button"
                  onClick={() => updateField('isActive', !form.isActive)}
                  className={`relative w-11 h-6 rounded-full transition-colors ${
                    form.isActive ? 'bg-teal-600' : 'bg-gray-300'
                  }`}
                >
                  <span
                    className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                      form.isActive ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </label>
            </div>
          </section>
        </div>
      </div>

      {/* ── Bottom Create Bar ── */}
      <div className="mt-8 flex items-center justify-between border-t border-gray-200 pt-6">
        <Link
          href={`/t/${tenantId}/admin/users`}
          className="px-4 py-2 text-sm border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
        >
          ← Cancel
        </Link>
        <button
          onClick={handleCreate}
          disabled={saving}
          className="px-6 py-2.5 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium text-sm shadow-sm"
        >
          {saving ? 'Creating…' : 'Create Staff Member'}
        </button>
      </div>
    </div>
  );
}
