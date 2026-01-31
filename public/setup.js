const API_BASE = '';

const settingsForm = document.getElementById('settingsForm');
const apiKeyInput = document.getElementById('apiKey');
const modelSelect = document.getElementById('model');
const keyStatus = document.getElementById('keyStatus');
const testButton = document.getElementById('testButton');
const statusMessage = document.getElementById('statusMessage');
const toolsList = document.getElementById('toolsList');

// Load tenant info
async function loadTenantInfo() {
  try {
    const response = await fetch(`${API_BASE}/api/tenant`);
    const tenant = await response.json();
    
    // Update header
    const headerTitle = document.querySelector('.header h1');
    if (headerTitle && tenant.branding?.restaurantName) {
      headerTitle.textContent = `🍽️ ${tenant.branding.restaurantName}`;
    }
    
    // Show tenant ID
    const tenantIdEl = document.getElementById('tenantId');
    if (tenantIdEl) {
      tenantIdEl.textContent = tenant.id || 'default';
    }
  } catch (error) {
    console.log('Using default tenant');
  }
}

// Load current configuration
async function loadConfig() {
  try {
    const response = await fetch(`${API_BASE}/api/config`);
    const config = await response.json();

    if (config.hasApiKey) {
      apiKeyInput.placeholder = config.apiKeyPreview;
      keyStatus.textContent = '✓';
      keyStatus.style.color = '#28a745';
    } else {
      keyStatus.textContent = '✗';
      keyStatus.style.color = '#dc3545';
    }

    if (config.model) {
      modelSelect.value = config.model;
    }
    
    // Show tenant ID
    const tenantIdEl = document.getElementById('tenantId');
    if (tenantIdEl && config.tenantId) {
      tenantIdEl.textContent = config.tenantId;
    }
  } catch (error) {
    showStatus('Failed to load configuration', 'error');
  }
}

// Load available tools
async function loadTools() {
  try {
    const response = await fetch(`${API_BASE}/api/tools`);
    const tools = await response.json();

    toolsList.innerHTML = tools
      .map(
        (tool) => `
        <div class="tool-item">
          <div class="tool-name">${tool.name}</div>
          <div class="tool-description">${tool.description}</div>
        </div>
      `
      )
      .join('');
  } catch (error) {
    toolsList.innerHTML = '<div class="error">Failed to load tools</div>';
  }
}

// Show status message
function showStatus(message, type) {
  statusMessage.textContent = message;
  statusMessage.className = `status-message ${type}`;
}

// Save settings
settingsForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  const apiKey = apiKeyInput.value.trim();
  const model = modelSelect.value;

  try {
    const body = { model };
    if (apiKey) {
      body.perplexityApiKey = apiKey;
    }

    const response = await fetch(`${API_BASE}/api/config`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      throw new Error('Failed to save settings');
    }

    showStatus('Settings saved successfully!', 'success');
    apiKeyInput.value = '';
    loadConfig();
  } catch (error) {
    showStatus(`Error: ${error.message}`, 'error');
  }
});

// Test connection
testButton.addEventListener('click', async () => {
  testButton.disabled = true;
  testButton.textContent = 'Testing...';

  try {
    const response = await fetch(`${API_BASE}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ message: 'Hello, what is on the menu?' }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Test failed');
    }

    showStatus('Connection successful! AI responded correctly.', 'success');
  } catch (error) {
    showStatus(`Test failed: ${error.message}`, 'error');
  } finally {
    testButton.disabled = false;
    testButton.textContent = 'Test Connection';
  }
});

// Initialize
loadTenantInfo();
loadConfig();
loadTools();
