/**
 * Admin Dashboard JavaScript
 * Common functionality for all admin pages
 */

const API_BASE = '';
let authToken = localStorage.getItem('adminToken');
let currentUser = null;
let currentTenant = null;

// ============================================
// Authentication
// ============================================

function checkAuth() {
    const token = localStorage.getItem('adminToken');
    const user = localStorage.getItem('adminUser');
    const tenant = localStorage.getItem('adminTenant');
    
    if (token && user) {
        authToken = token;
        currentUser = JSON.parse(user);
        currentTenant = tenant ? JSON.parse(tenant) : null;
        showAuthenticatedUI();
        
        // Call page-specific callback
        if (typeof onAuthenticated === 'function') {
            onAuthenticated();
        }
    } else {
        showLoginUI();
    }
}

async function handleLogin(event) {
    event.preventDefault();
    
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const tenantSlug = document.getElementById('tenantSlug')?.value || 'default';
    const errorEl = document.getElementById('loginError');
    
    try {
        const response = await fetch(`${API_BASE}/api/admin/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password, tenant_slug: tenantSlug })
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error || 'Login failed');
        }
        
        // Store auth data
        localStorage.setItem('adminToken', data.token);
        localStorage.setItem('adminUser', JSON.stringify(data.user));
        localStorage.setItem('adminTenant', JSON.stringify(data.tenant));
        
        authToken = data.token;
        currentUser = data.user;
        currentTenant = data.tenant;
        
        showAuthenticatedUI();
        
        if (typeof onAuthenticated === 'function') {
            onAuthenticated();
        }
    } catch (error) {
        errorEl.textContent = error.message;
        errorEl.style.display = 'block';
    }
}

function logout() {
    // Call logout API
    fetch(`${API_BASE}/api/admin/logout`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${authToken}`
        }
    }).catch(() => {});
    
    // Clear local storage
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminUser');
    localStorage.removeItem('adminTenant');
    
    authToken = null;
    currentUser = null;
    currentTenant = null;
    
    showLoginUI();
}

function showLoginUI() {
    const loginContainer = document.getElementById('loginContainer');
    const dashboardContent = document.getElementById('dashboardContent');
    const menuContent = document.getElementById('menuContent');
    const ingredientsContent = document.getElementById('ingredientsContent');
    const settingsContent = document.getElementById('settingsContent');
    
    if (loginContainer) loginContainer.style.display = 'flex';
    if (dashboardContent) dashboardContent.style.display = 'none';
    if (menuContent) menuContent.style.display = 'none';
    if (ingredientsContent) ingredientsContent.style.display = 'none';
    if (settingsContent) settingsContent.style.display = 'none';
}

function showAuthenticatedUI() {
    const loginContainer = document.getElementById('loginContainer');
    const dashboardContent = document.getElementById('dashboardContent');
    const menuContent = document.getElementById('menuContent');
    const ingredientsContent = document.getElementById('ingredientsContent');
    const settingsContent = document.getElementById('settingsContent');
    
    if (loginContainer) loginContainer.style.display = 'none';
    if (dashboardContent) dashboardContent.style.display = 'block';
    if (menuContent) menuContent.style.display = 'block';
    if (ingredientsContent) ingredientsContent.style.display = 'block';
    if (settingsContent) settingsContent.style.display = 'block';
    
    // Update UI with user info
    const userEmail = document.getElementById('userEmail');
    const tenantName = document.getElementById('tenantName');
    
    if (userEmail && currentUser) {
        userEmail.textContent = currentUser.email;
    }
    if (tenantName && currentTenant) {
        tenantName.textContent = currentTenant.name;
    }
}

// ============================================
// API Helpers
// ============================================

async function apiRequest(url, options = {}) {
    const headers = {
        'Content-Type': 'application/json',
        ...options.headers
    };
    
    if (authToken) {
        headers['Authorization'] = `Bearer ${authToken}`;
    }
    
    const response = await fetch(`${API_BASE}${url}`, {
        ...options,
        headers
    });
    
    if (response.status === 401) {
        logout();
        throw new Error('Session expired');
    }
    
    const data = await response.json();
    
    if (!response.ok) {
        throw new Error(data.error || 'Request failed');
    }
    
    return data;
}

async function apiRequestFormData(url, formData, method = 'POST') {
    const headers = {};
    
    if (authToken) {
        headers['Authorization'] = `Bearer ${authToken}`;
    }
    
    const response = await fetch(`${API_BASE}${url}`, {
        method,
        headers,
        body: formData
    });
    
    if (response.status === 401) {
        logout();
        throw new Error('Session expired');
    }
    
    const data = await response.json();
    
    if (!response.ok) {
        throw new Error(data.error || 'Request failed');
    }
    
    return data;
}

// ============================================
// UI Helpers
// ============================================

function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    sidebar.classList.toggle('collapsed');
}

function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `
        <span>${message}</span>
        <button onclick="this.parentElement.remove()">×</button>
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.classList.add('show');
    }, 10);
    
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

function showModal(id) {
    const modal = document.getElementById(id);
    if (modal) {
        modal.classList.add('show');
    }
}

function hideModal(id) {
    const modal = document.getElementById(id);
    if (modal) {
        modal.classList.remove('show');
    }
}

function confirmDelete(message, callback) {
    if (confirm(message)) {
        callback();
    }
}

// ============================================
// Form Helpers
// ============================================

function resetForm(formId) {
    const form = document.getElementById(formId);
    if (form) {
        form.reset();
        // Clear hidden ID field
        const idField = form.querySelector('[name="id"]');
        if (idField) idField.value = '';
    }
}

function populateForm(formId, data) {
    const form = document.getElementById(formId);
    if (!form) return;
    
    for (const [key, value] of Object.entries(data)) {
        const input = form.querySelector(`[name="${key}"]`);
        if (input) {
            if (input.type === 'checkbox') {
                input.checked = value;
            } else {
                input.value = value;
            }
        }
    }
}

function getFormData(formId) {
    const form = document.getElementById(formId);
    if (!form) return {};
    
    const formData = new FormData(form);
    const data = {};
    
    for (const [key, value] of formData.entries()) {
        data[key] = value;
    }
    
    // Handle checkboxes
    form.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
        data[checkbox.name] = checkbox.checked;
    });
    
    return data;
}

// ============================================
// Drag and Drop
// ============================================

function initDragAndDrop(containerId, onReorder) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    let draggedItem = null;
    
    container.addEventListener('dragstart', (e) => {
        draggedItem = e.target.closest('[draggable="true"]');
        e.dataTransfer.effectAllowed = 'move';
        draggedItem.classList.add('dragging');
    });
    
    container.addEventListener('dragend', () => {
        if (draggedItem) {
            draggedItem.classList.remove('dragging');
            draggedItem = null;
        }
    });
    
    container.addEventListener('dragover', (e) => {
        e.preventDefault();
        const afterElement = getDragAfterElement(container, e.clientY);
        if (draggedItem && afterElement) {
            container.insertBefore(draggedItem, afterElement);
        }
    });
    
    container.addEventListener('drop', (e) => {
        e.preventDefault();
        if (onReorder) {
            const items = container.querySelectorAll('[data-id]');
            const order = Array.from(items).map(item => item.dataset.id);
            onReorder(order);
        }
    });
}

function getDragAfterElement(container, y) {
    const draggableElements = [...container.querySelectorAll('[draggable="true"]:not(.dragging)')];
    
    return draggableElements.reduce((closest, child) => {
        const box = child.getBoundingClientRect();
        const offset = y - box.top - box.height / 2;
        
        if (offset < 0 && offset > closest.offset) {
            return { offset, element: child };
        }
        return closest;
    }, { offset: Number.NEGATIVE_INFINITY }).element;
}

// ============================================
// Exports
// ============================================

window.checkAuth = checkAuth;
window.handleLogin = handleLogin;
window.logout = logout;
window.apiRequest = apiRequest;
window.apiRequestFormData = apiRequestFormData;
window.toggleSidebar = toggleSidebar;
window.showNotification = showNotification;
window.showModal = showModal;
window.hideModal = hideModal;
window.confirmDelete = confirmDelete;
window.resetForm = resetForm;
window.populateForm = populateForm;
window.getFormData = getFormData;
window.initDragAndDrop = initDragAndDrop;
