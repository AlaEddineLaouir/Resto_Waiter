const API_BASE = '';

const chatMessages = document.getElementById('chatMessages');
const chatForm = document.getElementById('chatForm');
const messageInput = document.getElementById('messageInput');
const sendButton = document.getElementById('sendButton');
const apiStatus = document.getElementById('apiStatus');

// Load tenant branding
async function loadTenantBranding() {
  try {
    const response = await fetch(`${API_BASE}/api/tenant`);
    const tenant = await response.json();
    
    // Update page title and header
    document.title = `${tenant.branding?.restaurantName || 'Restaurant'} Chat`;
    
    const headerTitle = document.querySelector('.header h1');
    if (headerTitle && tenant.branding?.restaurantName) {
      headerTitle.textContent = `🍽️ ${tenant.branding.restaurantName}`;
    }
    
    const headerDesc = document.querySelector('.header p');
    if (headerDesc && tenant.branding?.description) {
      headerDesc.textContent = tenant.branding.description;
    }
    
    // Update primary color
    if (tenant.branding?.primaryColor) {
      document.documentElement.style.setProperty('--primary-color', tenant.branding.primaryColor);
    }
  } catch (error) {
    console.log('Using default branding');
  }
}

// Check API configuration on load
async function checkApiStatus() {
  try {
    const response = await fetch(`${API_BASE}/api/config`);
    const config = await response.json();

    if (!config.hasApiKey) {
      apiStatus.className = 'api-status error';
      apiStatus.innerHTML = '⚠️ API key not configured. <a href="setup.html">Go to Settings</a>';
    } else {
      apiStatus.className = 'api-status success';
      apiStatus.textContent = `✓ Connected (${config.tenantId || 'default'})`;
    }
  } catch (error) {
    apiStatus.className = 'api-status error';
    apiStatus.textContent = '❌ Cannot connect to server';
  }
}

// Add a message to the chat
function addMessage(content, isUser = false) {
  const messageDiv = document.createElement('div');
  messageDiv.className = `message ${isUser ? 'user-message' : 'bot-message'}`;

  const contentDiv = document.createElement('div');
  contentDiv.className = 'message-content';

  if (isUser) {
    contentDiv.textContent = content;
  } else {
    // Parse markdown-like formatting
    contentDiv.innerHTML = formatMessage(content);
  }

  messageDiv.appendChild(contentDiv);
  chatMessages.appendChild(messageDiv);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Add typing indicator
function addTypingIndicator() {
  const typingDiv = document.createElement('div');
  typingDiv.className = 'message bot-message';
  typingDiv.id = 'typingIndicator';

  typingDiv.innerHTML = `
    <div class="typing-indicator">
      <span></span>
      <span></span>
      <span></span>
    </div>
  `;

  chatMessages.appendChild(typingDiv);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Remove typing indicator
function removeTypingIndicator() {
  const typingIndicator = document.getElementById('typingIndicator');
  if (typingIndicator) {
    typingIndicator.remove();
  }
}

// Format message with basic markdown
function formatMessage(text) {
  // Escape HTML
  let formatted = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  // Bold
  formatted = formatted.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

  // Italic
  formatted = formatted.replace(/\*(.*?)\*/g, '<em>$1</em>');

  // Line breaks
  formatted = formatted.replace(/\n/g, '<br>');

  // Lists
  formatted = formatted.replace(/^- (.*?)(<br>|$)/gm, '<li>$1</li>');
  formatted = formatted.replace(/(<li>.*<\/li>)+/g, '<ul>$&</ul>');

  return formatted;
}

// Send message to API
async function sendMessage(message) {
  try {
    sendButton.disabled = true;
    addMessage(message, true);
    addTypingIndicator();

    const response = await fetch(`${API_BASE}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ message }),
    });

    removeTypingIndicator();

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Failed to get response');
    }

    addMessage(data.message);
  } catch (error) {
    removeTypingIndicator();
    addMessage(`Sorry, there was an error: ${error.message}`);
  } finally {
    sendButton.disabled = false;
    messageInput.focus();
  }
}

// Handle form submission
chatForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const message = messageInput.value.trim();

  if (!message) return;

  messageInput.value = '';
  await sendMessage(message);
});

// Initialize
loadTenantBranding();
checkApiStatus();
