import DishItem from './DishItem';
import styles from './MenuCategory.module.css';

function MenuCategory({ category }) {
  const { name, dishes } = category;

  return (
    <div className={styles.category}>
      <h2 className={styles.categoryTitle}>{name}</h2>
      <div className={styles.dishList}>
        {dishes.map((dish) => (
          <DishItem key={dish.name} dish={dish} />
        ))}
      </div>
    </div>
  );
}

export default MenuCategory;
