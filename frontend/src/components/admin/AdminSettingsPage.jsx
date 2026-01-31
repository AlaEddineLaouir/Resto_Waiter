import { useState } from 'react';
import { useAdminSettings } from '../../hooks';
import { LoadingSpinner } from '../common';
import styles from './Admin.module.css';

function AdminSettingsPage() {
  const { settings, loading, saving, updateSettings } = useAdminSettings();
  const [form, setForm] = useState(null);
  const [message, setMessage] = useState(null);

  // Initialize form when settings load
  if (settings && !form) {
    setForm({
      restaurant_name: settings.restaurant_name || '',
      description: settings.description || '',
      primary_color: settings.primary_color || '#c41e3a',
      secondary_color: settings.secondary_color || '#2c3e50',
    });
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage(null);
    try {
      await updateSettings(form);
      setMessage({ type: 'success', text: 'Settings saved successfully!' });
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    }
  };

  if (loading && !settings) {
    return <LoadingSpinner />;
  }

  if (!form) {
    return <LoadingSpinner />;
  }

  return (
    <>
      <div className={styles.pageHeader}>
        <h1>Settings</h1>
        <p className={styles.pageDescription}>Configure your restaurant settings</p>
      </div>

      <div className={styles.tableContainer}>
        <div className={styles.tableHeader}>
          <h2>Restaurant Settings</h2>
        </div>
        
        <form onSubmit={handleSubmit} style={{ padding: '1.5rem' }}>
          <div className={styles.formGroup}>
            <label>Restaurant Name</label>
            <input
              type="text"
              value={form.restaurant_name}
              onChange={(e) => setForm({ ...form, restaurant_name: e.target.value })}
              required
            />
          </div>

          <div className={styles.formGroup}>
            <label>Description</label>
            <input
              type="text"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </div>

          <div className={styles.formGroup}>
            <label>Primary Color</label>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <input
                type="color"
                value={form.primary_color}
                onChange={(e) => setForm({ ...form, primary_color: e.target.value })}
                style={{ width: '60px', height: '40px', padding: '0', border: 'none', cursor: 'pointer' }}
              />
              <input
                type="text"
                value={form.primary_color}
                onChange={(e) => setForm({ ...form, primary_color: e.target.value })}
                pattern="^#[0-9A-Fa-f]{6}$"
                style={{ flex: 1 }}
              />
            </div>
          </div>

          <div className={styles.formGroup}>
            <label>Secondary Color</label>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <input
                type="color"
                value={form.secondary_color}
                onChange={(e) => setForm({ ...form, secondary_color: e.target.value })}
                style={{ width: '60px', height: '40px', padding: '0', border: 'none', cursor: 'pointer' }}
              />
              <input
                type="text"
                value={form.secondary_color}
                onChange={(e) => setForm({ ...form, secondary_color: e.target.value })}
                pattern="^#[0-9A-Fa-f]{6}$"
                style={{ flex: 1 }}
              />
            </div>
          </div>

          {message && (
            <div 
              style={{
                padding: '0.75rem',
                borderRadius: '4px',
                marginBottom: '1rem',
                backgroundColor: message.type === 'success' ? '#d4edda' : '#f8d7da',
                color: message.type === 'success' ? 'var(--success-color)' : 'var(--error-color)',
              }}
            >
              {message.text}
            </div>
          )}

          <button 
            type="submit" 
            className={styles.saveBtn}
            disabled={saving}
            style={{ marginTop: '1rem' }}
          >
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
        </form>
      </div>
    </>
  );
}

export default AdminSettingsPage;
