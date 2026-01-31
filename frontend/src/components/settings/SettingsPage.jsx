import { useState } from 'react';
import { useTenant } from '../../contexts/TenantContext';
import { useSettings, useMCPTools } from '../../hooks';
import { LoadingSpinner } from '../common';
import styles from './SettingsPage.module.css';

function SettingsPage() {
  const { config, tenantId } = useTenant();
  const { saving, error, saveSettings, testConnection, clearError } = useSettings();
  const { tools, loading: toolsLoading, error: toolsError } = useMCPTools();

  const [apiKey, setApiKey] = useState('');
  const [model, setModel] = useState(config?.model || 'llama-3.1-sonar-small-128k-online');
  const [statusMessage, setStatusMessage] = useState(null);
  const [testing, setTesting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    clearError();
    setStatusMessage(null);

    const settings = { model };
    if (apiKey.trim()) {
      settings.perplexityApiKey = apiKey.trim();
    }

    const result = await saveSettings(settings);
    if (result.success) {
      setStatusMessage({ type: 'success', text: 'Settings saved successfully!' });
      setApiKey('');
    } else {
      setStatusMessage({ type: 'error', text: result.error });
    }
  };

  const handleTest = async () => {
    setTesting(true);
    setStatusMessage(null);

    const result = await testConnection();
    if (result.success) {
      setStatusMessage({ type: 'success', text: 'Connection successful! AI responded correctly.' });
    } else {
      setStatusMessage({ type: 'error', text: `Test failed: ${result.error}` });
    }

    setTesting(false);
  };

  return (
    <div className={styles.container}>
      {/* Tenant Info */}
      <div className={styles.card}>
        <h2>🏢 Tenant Information</h2>
        <p className={styles.description}>
          Current Tenant ID: <strong>{tenantId}</strong>
        </p>
        <small>Use <code>/t/{'{tenantId}'}/</code> path for multi-tenant access</small>
      </div>

      {/* API Configuration */}
      <div className={styles.card}>
        <h2>🔑 Perplexity AI Configuration</h2>
        <p className={styles.description}>
          To use the AI chat feature, you need to provide your Perplexity AI API key.
          You can get one from{' '}
          <a href="https://www.perplexity.ai/settings/api" target="_blank" rel="noreferrer">
            Perplexity AI Settings
          </a>.
        </p>

        <form className={styles.form} onSubmit={handleSubmit}>
          <div className={styles.formGroup}>
            <label htmlFor="apiKey">Perplexity API Key</label>
            <div className={styles.inputWithStatus}>
              <input
                type="password"
                id="apiKey"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder={config?.apiKeyPreview || 'pplx-xxxxxxxxxxxxxxxx'}
                autoComplete="off"
              />
              <span 
                className={`${styles.statusIndicator} ${
                  config?.hasApiKey ? styles.statusIndicatorSuccess : styles.statusIndicatorError
                }`}
              >
                {config?.hasApiKey ? '✓' : '✗'}
              </span>
            </div>
            <small>Your API key is stored locally and never shared.</small>
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="model">AI Model</label>
            <select
              id="model"
              value={model}
              onChange={(e) => setModel(e.target.value)}
            >
              <option value="llama-3.1-sonar-small-128k-online">Llama 3.1 Sonar Small (Fast)</option>
              <option value="llama-3.1-sonar-large-128k-online">Llama 3.1 Sonar Large (Better)</option>
              <option value="llama-3.1-sonar-huge-128k-online">Llama 3.1 Sonar Huge (Best)</option>
            </select>
          </div>

          <div className={styles.formActions}>
            <button type="submit" className={styles.btnPrimary} disabled={saving}>
              {saving ? 'Saving...' : 'Save Settings'}
            </button>
            <button 
              type="button" 
              className={styles.btnSecondary} 
              onClick={handleTest}
              disabled={testing || !config?.hasApiKey}
            >
              {testing ? 'Testing...' : 'Test Connection'}
            </button>
          </div>
        </form>

        {(statusMessage || error) && (
          <div 
            className={`${styles.statusMessage} ${
              statusMessage?.type === 'success' 
                ? styles.statusMessageSuccess 
                : styles.statusMessageError
            }`}
          >
            {statusMessage?.text || error}
          </div>
        )}
      </div>

      {/* MCP Tools */}
      <div className={styles.card}>
        <h2>🛠️ Available MCP Tools</h2>
        <p className={styles.description}>
          These are the tools available to the AI assistant:
        </p>

        {toolsLoading ? (
          <LoadingSpinner size="small" />
        ) : toolsError ? (
          <div className={styles.statusMessageError}>{toolsError}</div>
        ) : (
          <div className={styles.toolsList}>
            {tools.map((tool) => (
              <div key={tool.name} className={styles.toolItem}>
                <div className={styles.toolName}>{tool.name}</div>
                <div className={styles.toolDescription}>{tool.description}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* About */}
      <div className={styles.card}>
        <h2>ℹ️ About</h2>
        <p>
          This chatbot uses the <strong>Model Context Protocol (MCP)</strong> to provide
          structured access to restaurant menu data. The AI can use various tools to
          query the menu, search for dishes, and provide ingredient information.
        </p>
        <p>
          <strong>Technologies used:</strong>
        </p>
        <ul className={styles.aboutList}>
          <li>React with Vite</li>
          <li>Node.js with Express.js</li>
          <li>@modelcontextprotocol/sdk</li>
          <li>Perplexity AI for natural language processing</li>
        </ul>
      </div>
    </div>
  );
}

export default SettingsPage;
