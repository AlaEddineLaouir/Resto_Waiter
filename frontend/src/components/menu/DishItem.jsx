import styles from './DishItem.module.css';

function DishItem({ dish }) {
  const { name, description, price, vegetarian, glutenFree } = dish;

  return (
    <div className={styles.dish}>
      <div className={styles.dishInfo}>
        <div className={styles.dishName}>{name}</div>
        <div className={styles.dishDescription}>{description}</div>
        <div className={styles.dishTags}>
          {vegetarian && (
            <span className={`${styles.tag} ${styles.tagVegetarian}`}>
              🌱 Vegetarian
            </span>
          )}
          {glutenFree && (
            <span className={`${styles.tag} ${styles.tagGlutenFree}`}>
              🌾 Gluten-Free
            </span>
          )}
        </div>
      </div>
      <div className={styles.dishPrice}>{price}</div>
    </div>
  );
}

export default DishItem;
