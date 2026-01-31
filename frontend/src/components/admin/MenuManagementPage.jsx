import { useState } from 'react';
import { useAdminCategories, useAdminDishes } from '../../hooks';
import { LoadingSpinner } from '../common';
import styles from './Admin.module.css';

function MenuManagementPage() {
  const { categories, loading: catLoading, createCategory, updateCategory, deleteCategory } = useAdminCategories();
  const { dishes, loading: dishLoading, createDish, updateDish, deleteDish } = useAdminDishes();

  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showDishModal, setShowDishModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [editingDish, setEditingDish] = useState(null);
  const [saving, setSaving] = useState(false);

  // Category form state
  const [categoryForm, setCategoryForm] = useState({ name: '', description: '', display_order: 0 });

  // Dish form state
  const [dishForm, setDishForm] = useState({
    name: '',
    description: '',
    price: '',
    category_id: '',
    vegetarian: false,
    gluten_free: false,
    available: true,
  });

  const loading = catLoading || dishLoading;

  const openCategoryModal = (category = null) => {
    if (category) {
      setEditingCategory(category);
      setCategoryForm({
        name: category.name,
        description: category.description || '',
        display_order: category.display_order || 0,
      });
    } else {
      setEditingCategory(null);
      setCategoryForm({ name: '', description: '', display_order: 0 });
    }
    setShowCategoryModal(true);
  };

  const openDishModal = (dish = null) => {
    if (dish) {
      setEditingDish(dish);
      setDishForm({
        name: dish.name,
        description: dish.description || '',
        price: dish.price || '',
        category_id: dish.category_id || '',
        vegetarian: dish.vegetarian || false,
        gluten_free: dish.gluten_free || false,
        available: dish.available !== false,
      });
    } else {
      setEditingDish(null);
      setDishForm({
        name: '',
        description: '',
        price: '',
        category_id: categories?.[0]?.id || '',
        vegetarian: false,
        gluten_free: false,
        available: true,
      });
    }
    setShowDishModal(true);
  };

  const handleSaveCategory = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editingCategory) {
        await updateCategory(editingCategory.id, categoryForm);
      } else {
        await createCategory(categoryForm);
      }
      setShowCategoryModal(false);
    } catch (err) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteCategory = async (id) => {
    if (!window.confirm('Are you sure you want to delete this category?')) return;
    try {
      await deleteCategory(id);
    } catch (err) {
      alert(err.message);
    }
  };

  const handleSaveDish = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const formData = new FormData();
      Object.entries(dishForm).forEach(([key, value]) => {
        formData.append(key, value);
      });

      if (editingDish) {
        await updateDish(editingDish.id, formData);
      } else {
        await createDish(formData);
      }
      setShowDishModal(false);
    } catch (err) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteDish = async (id) => {
    if (!window.confirm('Are you sure you want to delete this dish?')) return;
    try {
      await deleteDish(id);
    } catch (err) {
      alert(err.message);
    }
  };

  if (loading && !categories && !dishes) {
    return <LoadingSpinner />;
  }

  return (
    <>
      <div className={styles.pageHeader}>
        <h1>Menu Management</h1>
        <p className={styles.pageDescription}>Manage your restaurant categories and dishes</p>
      </div>

      {/* Categories Section */}
      <div className={styles.tableContainer} style={{ marginBottom: '2rem' }}>
        <div className={styles.tableHeader}>
          <h2>Categories</h2>
          <button className={styles.addBtn} onClick={() => openCategoryModal()}>
            + Add Category
          </button>
        </div>

        {categories?.length > 0 ? (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Name</th>
                <th>Description</th>
                <th>Order</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {categories.map((cat) => (
                <tr key={cat.id}>
                  <td>{cat.name}</td>
                  <td>{cat.description || '-'}</td>
                  <td>{cat.display_order}</td>
                  <td>
                    <div className={styles.actionBtns}>
                      <button className={styles.editBtn} onClick={() => openCategoryModal(cat)}>
                        Edit
                      </button>
                      <button className={styles.deleteBtn} onClick={() => handleDeleteCategory(cat.id)}>
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className={styles.emptyState}>No categories yet</div>
        )}
      </div>

      {/* Dishes Section */}
      <div className={styles.tableContainer}>
        <div className={styles.tableHeader}>
          <h2>Dishes</h2>
          <button className={styles.addBtn} onClick={() => openDishModal()}>
            + Add Dish
          </button>
        </div>

        {dishes?.length > 0 ? (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Name</th>
                <th>Category</th>
                <th>Price</th>
                <th>Tags</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {dishes.map((dish) => (
                <tr key={dish.id}>
                  <td>{dish.name}</td>
                  <td>{dish.category_name || '-'}</td>
                  <td>${dish.price}</td>
                  <td>
                    {dish.vegetarian && (
                      <span className={`${styles.badge} ${styles.badgeSuccess}`}>🌱 Veg</span>
                    )}
                    {dish.gluten_free && (
                      <span className={`${styles.badge} ${styles.badgeWarning}`}>GF</span>
                    )}
                  </td>
                  <td>
                    <div className={styles.actionBtns}>
                      <button className={styles.editBtn} onClick={() => openDishModal(dish)}>
                        Edit
                      </button>
                      <button className={styles.deleteBtn} onClick={() => handleDeleteDish(dish.id)}>
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className={styles.emptyState}>No dishes yet</div>
        )}
      </div>

      {/* Category Modal */}
      <div className={`${styles.modalOverlay} ${showCategoryModal ? styles.modalOverlayShow : ''}`}>
        <div className={styles.modal}>
          <div className={styles.modalHeader}>
            <h2>{editingCategory ? 'Edit Category' : 'Add Category'}</h2>
            <button className={styles.closeBtn} onClick={() => setShowCategoryModal(false)}>×</button>
          </div>
          <form onSubmit={handleSaveCategory}>
            <div className={styles.modalBody}>
              <div className={styles.formGroup}>
                <label>Name</label>
                <input
                  type="text"
                  value={categoryForm.name}
                  onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
                  required
                />
              </div>
              <div className={styles.formGroup}>
                <label>Description</label>
                <input
                  type="text"
                  value={categoryForm.description}
                  onChange={(e) => setCategoryForm({ ...categoryForm, description: e.target.value })}
                />
              </div>
              <div className={styles.formGroup}>
                <label>Display Order</label>
                <input
                  type="number"
                  value={categoryForm.display_order}
                  onChange={(e) => setCategoryForm({ ...categoryForm, display_order: parseInt(e.target.value) || 0 })}
                />
              </div>
            </div>
            <div className={styles.modalFooter}>
              <button type="button" className={styles.cancelBtn} onClick={() => setShowCategoryModal(false)}>
                Cancel
              </button>
              <button type="submit" className={styles.saveBtn} disabled={saving}>
                {saving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Dish Modal */}
      <div className={`${styles.modalOverlay} ${showDishModal ? styles.modalOverlayShow : ''}`}>
        <div className={styles.modal}>
          <div className={styles.modalHeader}>
            <h2>{editingDish ? 'Edit Dish' : 'Add Dish'}</h2>
            <button className={styles.closeBtn} onClick={() => setShowDishModal(false)}>×</button>
          </div>
          <form onSubmit={handleSaveDish}>
            <div className={styles.modalBody}>
              <div className={styles.formGroup}>
                <label>Name</label>
                <input
                  type="text"
                  value={dishForm.name}
                  onChange={(e) => setDishForm({ ...dishForm, name: e.target.value })}
                  required
                />
              </div>
              <div className={styles.formGroup}>
                <label>Description</label>
                <input
                  type="text"
                  value={dishForm.description}
                  onChange={(e) => setDishForm({ ...dishForm, description: e.target.value })}
                />
              </div>
              <div className={styles.formGroup}>
                <label>Price</label>
                <input
                  type="number"
                  step="0.01"
                  value={dishForm.price}
                  onChange={(e) => setDishForm({ ...dishForm, price: e.target.value })}
                  required
                />
              </div>
              <div className={styles.formGroup}>
                <label>Category</label>
                <select
                  value={dishForm.category_id}
                  onChange={(e) => setDishForm({ ...dishForm, category_id: e.target.value })}
                  required
                >
                  <option value="">Select category</option>
                  {categories?.map((cat) => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
              </div>
              <div className={styles.formGroup}>
                <label>
                  <input
                    type="checkbox"
                    checked={dishForm.vegetarian}
                    onChange={(e) => setDishForm({ ...dishForm, vegetarian: e.target.checked })}
                  />
                  {' '}Vegetarian
                </label>
              </div>
              <div className={styles.formGroup}>
                <label>
                  <input
                    type="checkbox"
                    checked={dishForm.gluten_free}
                    onChange={(e) => setDishForm({ ...dishForm, gluten_free: e.target.checked })}
                  />
                  {' '}Gluten-Free
                </label>
              </div>
              <div className={styles.formGroup}>
                <label>
                  <input
                    type="checkbox"
                    checked={dishForm.available}
                    onChange={(e) => setDishForm({ ...dishForm, available: e.target.checked })}
                  />
                  {' '}Available
                </label>
              </div>
            </div>
            <div className={styles.modalFooter}>
              <button type="button" className={styles.cancelBtn} onClick={() => setShowDishModal(false)}>
                Cancel
              </button>
              <button type="submit" className={styles.saveBtn} disabled={saving}>
                {saving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}

export default MenuManagementPage;
