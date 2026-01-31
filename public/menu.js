const API_BASE = '';

const menuContent = document.getElementById('menuContent');
const searchInput = document.getElementById('searchInput');

let menuData = null;

// Load tenant branding
async function loadTenantBranding() {
  try {
    const response = await fetch(`${API_BASE}/api/config`);
    if (response.ok) {
      const config = await response.json();
      
      // Update page title and header
      if (config.restaurantName) {
        document.title = `${config.restaurantName} - Menu`;
        const header = document.querySelector('h1');
        if (header) {
          header.textContent = `${config.restaurantName} Menu`;
        }
      }
      
      // Apply branding colors
      if (config.branding) {
        const root = document.documentElement;
        if (config.branding.primaryColor) {
          root.style.setProperty('--primary-color', config.branding.primaryColor);
        }
        if (config.branding.secondaryColor) {
          root.style.setProperty('--secondary-color', config.branding.secondaryColor);
        }
      }
    }
  } catch (error) {
    console.log('Using default branding');
  }
}

// Load menu from API
async function loadMenu() {
  try {
    const response = await fetch(`${API_BASE}/api/menu`);
    menuData = await response.json();
    renderMenu(menuData);
  } catch (error) {
    menuContent.innerHTML = `<div class="error">Failed to load menu: ${error.message}</div>`;
  }
}

// Render menu
function renderMenu(data) {
  if (!data || !data.categories) {
    menuContent.innerHTML = '<div class="loading">No menu data available</div>';
    return;
  }

  menuContent.innerHTML = data.categories
    .map(
      (category) => `
      <div class="menu-category">
        <h2>${category.name}</h2>
        <div class="dish-list">
          ${category.dishes
            .map(
              (dish) => `
              <div class="dish-item">
                <div class="dish-info">
                  <div class="dish-name">${dish.name}</div>
                  <div class="dish-description">${dish.description}</div>
                  <div class="dish-tags">
                    ${dish.vegetarian ? '<span class="dish-tag vegetarian">🌱 Vegetarian</span>' : ''}
                  </div>
                </div>
                <div class="dish-price">${dish.price}</div>
              </div>
            `
            )
            .join('')}
        </div>
      </div>
    `
    )
    .join('');
}

// Search dishes
async function searchDishes(query) {
  if (!query) {
    renderMenu(menuData);
    return;
  }

  try {
    const response = await fetch(`${API_BASE}/api/search?q=${encodeURIComponent(query)}`);
    const results = await response.json();

    if (results.dishes && results.dishes.length > 0) {
      // Group by category
      const grouped = {};
      results.dishes.forEach((dish) => {
        if (!grouped[dish.category]) {
          grouped[dish.category] = [];
        }
        grouped[dish.category].push(dish);
      });

      const searchResults = {
        categories: Object.entries(grouped).map(([name, dishes]) => ({
          name,
          dishes,
        })),
      };

      renderMenu(searchResults);
    } else {
      menuContent.innerHTML = `<div class="loading">No dishes found matching "${query}"</div>`;
    }
  } catch (error) {
    menuContent.innerHTML = `<div class="error">Search failed: ${error.message}</div>`;
  }
}

// Debounce search
let searchTimeout;
searchInput.addEventListener('input', (e) => {
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(() => {
    searchDishes(e.target.value.trim());
  }, 300);
});

// Initialize
loadTenantBranding();
loadMenu();
