import { useState } from 'react';
import { useAdminIngredients } from '../../hooks';
import { LoadingSpinner } from '../common';
import styles from './Admin.module.css';

function IngredientsPage() {
  const { ingredients, loading, createIngredient, updateIngredient, deleteIngredient } = useAdminIngredients();
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: '',
    category: '',
    is_allergen: false,
  });

  const openModal = (ingredient = null) => {
    if (ingredient) {
      setEditing(ingredient);
      setForm({
        name: ingredient.name,
        category: ingredient.category || '',
        is_allergen: ingredient.is_allergen || false,
      });
    } else {
      setEditing(null);
      setForm({ name: '', category: '', is_allergen: false });
    }
    setShowModal(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editing) {
        await updateIngredient(editing.id, form);
      } else {
        await createIngredient(form);
      }
      setShowModal(false);
    } catch (err) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this ingredient?')) return;
    try {
      await deleteIngredient(id);
    } catch (err) {
      alert(err.message);
    }
  };

  if (loading && !ingredients) {
    return <LoadingSpinner />;
  }

  return (
    <>
      <div className={styles.pageHeader}>
        <h1>Ingredients</h1>
        <p className={styles.pageDescription}>Manage ingredients and allergens</p>
      </div>

      <div className={styles.tableContainer}>
        <div className={styles.tableHeader}>
          <h2>All Ingredients</h2>
          <button className={styles.addBtn} onClick={() => openModal()}>
            + Add Ingredient
          </button>
        </div>

        {ingredients?.length > 0 ? (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Name</th>
                <th>Category</th>
                <th>Allergen</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {ingredients.map((ing) => (
                <tr key={ing.id}>
                  <td>{ing.name}</td>
                  <td>{ing.category || '-'}</td>
                  <td>
                    {ing.is_allergen && (
                      <span className={`${styles.badge} ${styles.badgeWarning}`}>⚠️ Allergen</span>
                    )}
                  </td>
                  <td>
                    <div className={styles.actionBtns}>
                      <button className={styles.editBtn} onClick={() => openModal(ing)}>
                        Edit
                      </button>
                      <button className={styles.deleteBtn} onClick={() => handleDelete(ing.id)}>
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className={styles.emptyState}>No ingredients yet</div>
        )}
      </div>

      {/* Modal */}
      <div className={`${styles.modalOverlay} ${showModal ? styles.modalOverlayShow : ''}`}>
        <div className={styles.modal}>
          <div className={styles.modalHeader}>
            <h2>{editing ? 'Edit Ingredient' : 'Add Ingredient'}</h2>
            <button className={styles.closeBtn} onClick={() => setShowModal(false)}>×</button>
          </div>
          <form onSubmit={handleSave}>
            <div className={styles.modalBody}>
              <div className={styles.formGroup}>
                <label>Name</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                />
              </div>
              <div className={styles.formGroup}>
                <label>Category</label>
                <input
                  type="text"
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                  placeholder="e.g., Dairy, Vegetables, Spices"
                />
              </div>
              <div className={styles.formGroup}>
                <label>
                  <input
                    type="checkbox"
                    checked={form.is_allergen}
                    onChange={(e) => setForm({ ...form, is_allergen: e.target.checked })}
                  />
                  {' '}Is Allergen
                </label>
              </div>
            </div>
            <div className={styles.modalFooter}>
              <button type="button" className={styles.cancelBtn} onClick={() => setShowModal(false)}>
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

export default IngredientsPage;
