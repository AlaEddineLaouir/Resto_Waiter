import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import bcrypt from 'bcrypt';

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres:admin@localhost:5432/restaurant_menu';

const pool = new pg.Pool({
  connectionString: DATABASE_URL,
});

const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('Seeding database...');

  // Create default subscription plans
  const freePlan = await prisma.subscriptionPlan.create({
    data: {
      name: 'Free',
      description: 'Get started with basic features',
      priceMonthly: 0,
      priceYearly: 0,
      maxMenuItems: 20,
      maxApiCallsMonthly: 100,
      features: ['Up to 20 menu items', 'Basic chat support', '100 API calls/month'],
      isActive: true,
    },
  });

  const basicPlan = await prisma.subscriptionPlan.create({
    data: {
      name: 'Basic',
      description: 'Perfect for small restaurants',
      priceMonthly: 29,
      priceYearly: 290,
      maxMenuItems: 100,
      maxApiCallsMonthly: 1000,
      features: ['Up to 100 menu items', 'Priority support', '1,000 API calls/month', 'Custom branding'],
      isActive: true,
    },
  });

  const proPlan = await prisma.subscriptionPlan.create({
    data: {
      name: 'Pro',
      description: 'For growing restaurant chains',
      priceMonthly: 79,
      priceYearly: 790,
      maxMenuItems: 500,
      maxApiCallsMonthly: 10000,
      features: ['Up to 500 menu items', '24/7 support', '10,000 API calls/month', 'Advanced analytics', 'Multiple languages'],
      isActive: true,
    },
  });

  const enterprisePlan = await prisma.subscriptionPlan.create({
    data: {
      name: 'Enterprise',
      description: 'Custom solutions for large organizations',
      priceMonthly: 199,
      priceYearly: 1990,
      maxMenuItems: 10000,
      maxApiCallsMonthly: 100000,
      features: ['Everything in Pro', 'Dedicated support', 'Unlimited API calls', 'SLA guarantee', 'Custom integrations'],
      isActive: true,
    },
  });

  console.log('Created subscription plans:', { 
    freePlan: freePlan.name, 
    basicPlan: basicPlan.name, 
    proPlan: proPlan.name, 
    enterprisePlan: enterprisePlan.name 
  });

  // Create a platform super admin
  const hashedPassword = await bcrypt.hash('admin123', 10);
  
  const platformAdmin = await prisma.platformAdmin.create({
    data: {
      email: 'admin@menuai.com',
      passwordHash: hashedPassword,
      username: 'superadmin',
      role: 'super_admin',
      isActive: true,
    },
  });

  console.log('Created platform admin:', platformAdmin.email);

  // Create a demo tenant (restaurant)
  const demoTenant = await prisma.tenant.create({
    data: {
      name: 'Demo Restaurant',
      slug: 'demo-restaurant',
      email: 'demo@restaurant.com',
      phone: '+1 (555) 123-4567',
      address: '123 Main St, Foodville, FC 12345',
      config: {
        currency: 'USD',
        timezone: 'America/New_York',
        language: 'en',
      },
      branding: {
        primaryColor: '#4a90a4',
        secondaryColor: '#2c3e50',
        logoUrl: null,
      },
      isActive: true,
    },
  });

  console.log('Created demo tenant:', demoTenant.name);

  // Create a subscription for the demo tenant
  const subscription = await prisma.restaurantSubscription.create({
    data: {
      restaurantId: demoTenant.id,
      planId: basicPlan.id,
      status: 'active',
      billingCycle: 'monthly',
      startDate: new Date(),
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      autoRenew: true,
    },
  });

  console.log('Created subscription for demo tenant:', subscription.status);

  // Create some demo categories for a full Italian restaurant
  const antipasti = await prisma.category.create({
    data: {
      tenantId: demoTenant.id,
      name: 'Antipasti',
      description: 'Traditional Italian starters to begin your meal',
      displayOrder: 1,
    },
  });

  const insalate = await prisma.category.create({
    data: {
      tenantId: demoTenant.id,
      name: 'Insalate',
      description: 'Fresh salads with Italian ingredients',
      displayOrder: 2,
    },
  });

  const zuppe = await prisma.category.create({
    data: {
      tenantId: demoTenant.id,
      name: 'Zuppe',
      description: 'Homemade Italian soups',
      displayOrder: 3,
    },
  });

  const pasta = await prisma.category.create({
    data: {
      tenantId: demoTenant.id,
      name: 'Pasta',
      description: 'Handmade pasta dishes with authentic Italian sauces',
      displayOrder: 4,
    },
  });

  const risotto = await prisma.category.create({
    data: {
      tenantId: demoTenant.id,
      name: 'Risotto',
      description: 'Creamy Italian rice dishes',
      displayOrder: 5,
    },
  });

  const pizza = await prisma.category.create({
    data: {
      tenantId: demoTenant.id,
      name: 'Pizza',
      description: 'Wood-fired Neapolitan style pizzas',
      displayOrder: 6,
    },
  });

  const pesce = await prisma.category.create({
    data: {
      tenantId: demoTenant.id,
      name: 'Pesce',
      description: 'Fresh seafood and fish dishes',
      displayOrder: 7,
    },
  });

  const carne = await prisma.category.create({
    data: {
      tenantId: demoTenant.id,
      name: 'Carne',
      description: 'Premium meat and poultry dishes',
      displayOrder: 8,
    },
  });

  const contorni = await prisma.category.create({
    data: {
      tenantId: demoTenant.id,
      name: 'Contorni',
      description: 'Side dishes to complement your meal',
      displayOrder: 9,
    },
  });

  const dolci = await prisma.category.create({
    data: {
      tenantId: demoTenant.id,
      name: 'Dolci',
      description: 'Traditional Italian desserts',
      displayOrder: 10,
    },
  });

  const softDrinks = await prisma.category.create({
    data: {
      tenantId: demoTenant.id,
      name: 'Soft Drinks',
      description: 'Refreshing non-alcoholic beverages',
      displayOrder: 11,
    },
  });

  const mocktails = await prisma.category.create({
    data: {
      tenantId: demoTenant.id,
      name: 'Mocktails',
      description: 'Creative alcohol-free cocktails',
      displayOrder: 12,
    },
  });

  const caffe = await prisma.category.create({
    data: {
      tenantId: demoTenant.id,
      name: 'Caffè e Digestivi',
      description: 'Italian coffee and after-dinner drinks',
      displayOrder: 13,
    },
  });

  console.log('Created demo categories');

  // Create full Italian menu dishes
  await prisma.dish.createMany({
    data: [
      // ANTIPASTI
      {
        tenantId: demoTenant.id,
        categoryId: antipasti.id,
        name: 'Bruschetta Classica',
        description: 'Toasted ciabatta topped with diced tomatoes, fresh basil, garlic, and extra virgin olive oil',
        price: 9.99,
        isAvailable: true,
        isVegetarian: true,
      },
      {
        tenantId: demoTenant.id,
        categoryId: antipasti.id,
        name: 'Caprese',
        description: 'Fresh buffalo mozzarella, vine-ripened tomatoes, fresh basil, and aged balsamic reduction',
        price: 14.99,
        isAvailable: true,
        isVegetarian: true,
      },
      {
        tenantId: demoTenant.id,
        categoryId: antipasti.id,
        name: 'Carpaccio di Manzo',
        description: 'Thinly sliced raw beef with arugula, capers, parmesan shavings, and truffle oil',
        price: 16.99,
        isAvailable: true,
        isVegetarian: false,
      },
      {
        tenantId: demoTenant.id,
        categoryId: antipasti.id,
        name: 'Calamari Fritti',
        description: 'Crispy fried calamari served with marinara sauce and lemon aioli',
        price: 14.99,
        isAvailable: true,
        isVegetarian: false,
      },
      {
        tenantId: demoTenant.id,
        categoryId: antipasti.id,
        name: 'Antipasto Misto',
        description: 'Selection of Italian cured meats, cheeses, olives, roasted peppers, and artichoke hearts',
        price: 22.99,
        isAvailable: true,
        isVegetarian: false,
      },
      {
        tenantId: demoTenant.id,
        categoryId: antipasti.id,
        name: 'Burrata',
        description: 'Creamy burrata cheese with prosciutto di Parma, grilled peaches, and honey drizzle',
        price: 18.99,
        isAvailable: true,
        isVegetarian: false,
      },
      {
        tenantId: demoTenant.id,
        categoryId: antipasti.id,
        name: 'Arancini',
        description: 'Crispy risotto balls stuffed with mozzarella and peas, served with tomato sauce',
        price: 11.99,
        isAvailable: true,
        isVegetarian: true,
      },
      {
        tenantId: demoTenant.id,
        categoryId: antipasti.id,
        name: 'Polpo alla Griglia',
        description: 'Grilled octopus with cannellini beans, cherry tomatoes, and lemon dressing',
        price: 19.99,
        isAvailable: true,
        isVegetarian: false,
      },

      // INSALATE
      {
        tenantId: demoTenant.id,
        categoryId: insalate.id,
        name: 'Insalata Cesare',
        description: 'Romaine lettuce, parmesan, croutons, and classic Caesar dressing',
        price: 12.99,
        isAvailable: true,
        isVegetarian: true,
      },
      {
        tenantId: demoTenant.id,
        categoryId: insalate.id,
        name: 'Insalata di Rucola',
        description: 'Wild arugula with shaved parmesan, cherry tomatoes, and balsamic vinaigrette',
        price: 11.99,
        isAvailable: true,
        isVegetarian: true,
      },
      {
        tenantId: demoTenant.id,
        categoryId: insalate.id,
        name: 'Insalata Tricolore',
        description: 'Radicchio, arugula, and endive with gorgonzola and walnuts',
        price: 13.99,
        isAvailable: true,
        isVegetarian: true,
      },
      {
        tenantId: demoTenant.id,
        categoryId: insalate.id,
        name: 'Panzanella',
        description: 'Tuscan bread salad with tomatoes, cucumber, red onion, and basil',
        price: 12.99,
        isAvailable: true,
        isVegetarian: true,
      },

      // ZUPPE
      {
        tenantId: demoTenant.id,
        categoryId: zuppe.id,
        name: 'Minestrone',
        description: 'Traditional Italian vegetable soup with pasta and fresh herbs',
        price: 9.99,
        isAvailable: true,
        isVegetarian: true,
      },
      {
        tenantId: demoTenant.id,
        categoryId: zuppe.id,
        name: 'Zuppa di Pomodoro',
        description: 'Creamy tomato soup with fresh basil and grilled ciabatta',
        price: 8.99,
        isAvailable: true,
        isVegetarian: true,
      },
      {
        tenantId: demoTenant.id,
        categoryId: zuppe.id,
        name: 'Ribollita',
        description: 'Hearty Tuscan bread soup with white beans, kale, and vegetables',
        price: 10.99,
        isAvailable: true,
        isVegetarian: true,
      },

      // PASTA
      {
        tenantId: demoTenant.id,
        categoryId: pasta.id,
        name: 'Spaghetti alla Carbonara',
        description: 'Spaghetti with guanciale, egg yolk, pecorino romano, and black pepper',
        price: 18.99,
        isAvailable: true,
        isVegetarian: false,
      },
      {
        tenantId: demoTenant.id,
        categoryId: pasta.id,
        name: 'Penne all\'Arrabbiata',
        description: 'Penne pasta in spicy tomato sauce with garlic and red chili flakes',
        price: 15.99,
        isAvailable: true,
        isVegetarian: true,
      },
      {
        tenantId: demoTenant.id,
        categoryId: pasta.id,
        name: 'Fettuccine Alfredo',
        description: 'Fresh fettuccine in creamy parmesan sauce with butter',
        price: 17.99,
        isAvailable: true,
        isVegetarian: true,
      },
      {
        tenantId: demoTenant.id,
        categoryId: pasta.id,
        name: 'Tagliatelle al Ragù',
        description: 'Fresh tagliatelle with traditional Bolognese meat sauce',
        price: 19.99,
        isAvailable: true,
        isVegetarian: false,
      },
      {
        tenantId: demoTenant.id,
        categoryId: pasta.id,
        name: 'Linguine alle Vongole',
        description: 'Linguine with fresh clams, white wine, garlic, and parsley',
        price: 24.99,
        isAvailable: true,
        isVegetarian: false,
      },
      {
        tenantId: demoTenant.id,
        categoryId: pasta.id,
        name: 'Pappardelle al Cinghiale',
        description: 'Wide ribbon pasta with slow-cooked wild boar ragù',
        price: 22.99,
        isAvailable: true,
        isVegetarian: false,
      },
      {
        tenantId: demoTenant.id,
        categoryId: pasta.id,
        name: 'Cacio e Pepe',
        description: 'Spaghetti with pecorino romano and freshly cracked black pepper',
        price: 16.99,
        isAvailable: true,
        isVegetarian: true,
      },
      {
        tenantId: demoTenant.id,
        categoryId: pasta.id,
        name: 'Gnocchi alla Sorrentina',
        description: 'Potato gnocchi baked with tomato sauce, mozzarella, and fresh basil',
        price: 17.99,
        isAvailable: true,
        isVegetarian: true,
      },
      {
        tenantId: demoTenant.id,
        categoryId: pasta.id,
        name: 'Ravioli di Ricotta e Spinaci',
        description: 'Handmade ravioli filled with ricotta and spinach in sage butter sauce',
        price: 19.99,
        isAvailable: true,
        isVegetarian: true,
      },
      {
        tenantId: demoTenant.id,
        categoryId: pasta.id,
        name: 'Orecchiette con Cime di Rapa',
        description: 'Ear-shaped pasta with broccoli rabe, garlic, and chili',
        price: 16.99,
        isAvailable: true,
        isVegetarian: true,
      },
      {
        tenantId: demoTenant.id,
        categoryId: pasta.id,
        name: 'Bucatini all\'Amatriciana',
        description: 'Thick spaghetti with guanciale, tomato, pecorino, and black pepper',
        price: 18.99,
        isAvailable: true,
        isVegetarian: false,
      },
      {
        tenantId: demoTenant.id,
        categoryId: pasta.id,
        name: 'Lasagna alla Bolognese',
        description: 'Layers of fresh pasta, Bolognese ragù, béchamel, and parmesan',
        price: 21.99,
        isAvailable: true,
        isVegetarian: false,
      },

      // RISOTTO
      {
        tenantId: demoTenant.id,
        categoryId: risotto.id,
        name: 'Risotto ai Funghi Porcini',
        description: 'Creamy Arborio rice with porcini mushrooms and truffle oil',
        price: 22.99,
        isAvailable: true,
        isVegetarian: true,
      },
      {
        tenantId: demoTenant.id,
        categoryId: risotto.id,
        name: 'Risotto al Nero di Seppia',
        description: 'Black squid ink risotto with calamari and seafood',
        price: 26.99,
        isAvailable: true,
        isVegetarian: false,
      },
      {
        tenantId: demoTenant.id,
        categoryId: risotto.id,
        name: 'Risotto alla Milanese',
        description: 'Traditional saffron risotto with bone marrow and parmesan',
        price: 21.99,
        isAvailable: true,
        isVegetarian: true,
      },
      {
        tenantId: demoTenant.id,
        categoryId: risotto.id,
        name: 'Risotto ai Frutti di Mare',
        description: 'Seafood risotto with shrimp, mussels, clams, and calamari',
        price: 28.99,
        isAvailable: true,
        isVegetarian: false,
      },

      // PIZZA
      {
        tenantId: demoTenant.id,
        categoryId: pizza.id,
        name: 'Margherita',
        description: 'San Marzano tomatoes, fresh mozzarella, basil, and extra virgin olive oil',
        price: 14.99,
        isAvailable: true,
        isVegetarian: true,
      },
      {
        tenantId: demoTenant.id,
        categoryId: pizza.id,
        name: 'Quattro Formaggi',
        description: 'Mozzarella, gorgonzola, fontina, and parmesan',
        price: 17.99,
        isAvailable: true,
        isVegetarian: true,
      },
      {
        tenantId: demoTenant.id,
        categoryId: pizza.id,
        name: 'Diavola',
        description: 'Spicy salami, tomato sauce, mozzarella, and chili flakes',
        price: 16.99,
        isAvailable: true,
        isVegetarian: false,
      },
      {
        tenantId: demoTenant.id,
        categoryId: pizza.id,
        name: 'Prosciutto e Rucola',
        description: 'Prosciutto di Parma, fresh arugula, parmesan shavings, and mozzarella',
        price: 18.99,
        isAvailable: true,
        isVegetarian: false,
      },
      {
        tenantId: demoTenant.id,
        categoryId: pizza.id,
        name: 'Funghi e Tartufo',
        description: 'Mixed mushrooms, truffle cream, mozzarella, and fresh thyme',
        price: 19.99,
        isAvailable: true,
        isVegetarian: true,
      },
      {
        tenantId: demoTenant.id,
        categoryId: pizza.id,
        name: 'Napoletana',
        description: 'Tomato, mozzarella, anchovies, capers, and olives',
        price: 16.99,
        isAvailable: true,
        isVegetarian: false,
      },
      {
        tenantId: demoTenant.id,
        categoryId: pizza.id,
        name: 'Capricciosa',
        description: 'Ham, mushrooms, artichokes, olives, and mozzarella',
        price: 17.99,
        isAvailable: true,
        isVegetarian: false,
      },
      {
        tenantId: demoTenant.id,
        categoryId: pizza.id,
        name: 'Calzone',
        description: 'Folded pizza with ricotta, mozzarella, ham, and mushrooms',
        price: 16.99,
        isAvailable: true,
        isVegetarian: false,
      },
      {
        tenantId: demoTenant.id,
        categoryId: pizza.id,
        name: 'Pizza Ortolana',
        description: 'Grilled vegetables, mozzarella, and pesto drizzle',
        price: 15.99,
        isAvailable: true,
        isVegetarian: true,
      },
      {
        tenantId: demoTenant.id,
        categoryId: pizza.id,
        name: 'Frutti di Mare',
        description: 'Mixed seafood, garlic, cherry tomatoes, and fresh parsley (no cheese)',
        price: 21.99,
        isAvailable: true,
        isVegetarian: false,
      },

      // PESCE
      {
        tenantId: demoTenant.id,
        categoryId: pesce.id,
        name: 'Branzino al Forno',
        description: 'Whole roasted Mediterranean sea bass with herbs, lemon, and olive oil',
        price: 34.99,
        isAvailable: true,
        isVegetarian: false,
      },
      {
        tenantId: demoTenant.id,
        categoryId: pesce.id,
        name: 'Salmone alla Griglia',
        description: 'Grilled Atlantic salmon with lemon butter sauce and capers',
        price: 28.99,
        isAvailable: true,
        isVegetarian: false,
      },
      {
        tenantId: demoTenant.id,
        categoryId: pesce.id,
        name: 'Gamberoni all\'Aglio',
        description: 'Jumbo prawns sautéed in garlic, white wine, and chili',
        price: 29.99,
        isAvailable: true,
        isVegetarian: false,
      },
      {
        tenantId: demoTenant.id,
        categoryId: pesce.id,
        name: 'Fritto Misto di Mare',
        description: 'Mixed fried seafood with calamari, shrimp, and whitebait',
        price: 26.99,
        isAvailable: true,
        isVegetarian: false,
      },
      {
        tenantId: demoTenant.id,
        categoryId: pesce.id,
        name: 'Tonno alla Siciliana',
        description: 'Seared tuna steak with caponata and pine nuts',
        price: 31.99,
        isAvailable: true,
        isVegetarian: false,
      },

      // CARNE
      {
        tenantId: demoTenant.id,
        categoryId: carne.id,
        name: 'Bistecca alla Fiorentina',
        description: 'T-bone steak grilled Florentine style, served with rosemary potatoes',
        price: 49.99,
        isAvailable: true,
        isVegetarian: false,
      },
      {
        tenantId: demoTenant.id,
        categoryId: carne.id,
        name: 'Ossobuco alla Milanese',
        description: 'Braised veal shank with gremolata, served with saffron risotto',
        price: 36.99,
        isAvailable: true,
        isVegetarian: false,
      },
      {
        tenantId: demoTenant.id,
        categoryId: carne.id,
        name: 'Vitello alla Parmigiana',
        description: 'Breaded veal cutlet topped with tomato sauce and melted mozzarella',
        price: 29.99,
        isAvailable: true,
        isVegetarian: false,
      },
      {
        tenantId: demoTenant.id,
        categoryId: carne.id,
        name: 'Pollo alla Cacciatora',
        description: 'Braised chicken hunter-style with tomatoes, olives, and herbs',
        price: 24.99,
        isAvailable: true,
        isVegetarian: false,
      },
      {
        tenantId: demoTenant.id,
        categoryId: carne.id,
        name: 'Saltimbocca alla Romana',
        description: 'Veal escalopes with prosciutto and sage in white wine sauce',
        price: 28.99,
        isAvailable: true,
        isVegetarian: false,
      },
      {
        tenantId: demoTenant.id,
        categoryId: carne.id,
        name: 'Agnello alla Scottadito',
        description: 'Grilled lamb chops with rosemary and garlic',
        price: 34.99,
        isAvailable: true,
        isVegetarian: false,
      },
      {
        tenantId: demoTenant.id,
        categoryId: carne.id,
        name: 'Filetto al Pepe Verde',
        description: 'Beef tenderloin with green peppercorn cream sauce',
        price: 38.99,
        isAvailable: true,
        isVegetarian: false,
      },

      // CONTORNI
      {
        tenantId: demoTenant.id,
        categoryId: contorni.id,
        name: 'Spinaci Saltati',
        description: 'Sautéed spinach with garlic and olive oil',
        price: 7.99,
        isAvailable: true,
        isVegetarian: true,
      },
      {
        tenantId: demoTenant.id,
        categoryId: contorni.id,
        name: 'Patate Arrosto',
        description: 'Roasted potatoes with rosemary and garlic',
        price: 6.99,
        isAvailable: true,
        isVegetarian: true,
      },
      {
        tenantId: demoTenant.id,
        categoryId: contorni.id,
        name: 'Verdure Grigliate',
        description: 'Grilled seasonal vegetables with balsamic glaze',
        price: 8.99,
        isAvailable: true,
        isVegetarian: true,
      },
      {
        tenantId: demoTenant.id,
        categoryId: contorni.id,
        name: 'Broccoli al Limone',
        description: 'Steamed broccoli with lemon and extra virgin olive oil',
        price: 6.99,
        isAvailable: true,
        isVegetarian: true,
      },
      {
        tenantId: demoTenant.id,
        categoryId: contorni.id,
        name: 'Funghi Trifolati',
        description: 'Sautéed mushrooms with garlic, parsley, and white wine',
        price: 8.99,
        isAvailable: true,
        isVegetarian: true,
      },

      // DOLCI
      {
        tenantId: demoTenant.id,
        categoryId: dolci.id,
        name: 'Tiramisù',
        description: 'Classic Italian dessert with espresso-soaked ladyfingers and mascarpone cream',
        price: 10.99,
        isAvailable: true,
        isVegetarian: true,
      },
      {
        tenantId: demoTenant.id,
        categoryId: dolci.id,
        name: 'Panna Cotta',
        description: 'Silky vanilla cream with mixed berry compote',
        price: 9.99,
        isAvailable: true,
        isVegetarian: true,
      },
      {
        tenantId: demoTenant.id,
        categoryId: dolci.id,
        name: 'Cannoli Siciliani',
        description: 'Crispy pastry tubes filled with sweet ricotta and chocolate chips',
        price: 8.99,
        isAvailable: true,
        isVegetarian: true,
      },
      {
        tenantId: demoTenant.id,
        categoryId: dolci.id,
        name: 'Affogato',
        description: 'Vanilla gelato drowned in hot espresso',
        price: 7.99,
        isAvailable: true,
        isVegetarian: true,
      },
      {
        tenantId: demoTenant.id,
        categoryId: dolci.id,
        name: 'Torta al Cioccolato',
        description: 'Warm chocolate lava cake with vanilla gelato',
        price: 11.99,
        isAvailable: true,
        isVegetarian: true,
      },
      {
        tenantId: demoTenant.id,
        categoryId: dolci.id,
        name: 'Gelato Misto',
        description: 'Selection of three artisanal gelato flavors',
        price: 8.99,
        isAvailable: true,
        isVegetarian: true,
      },
      {
        tenantId: demoTenant.id,
        categoryId: dolci.id,
        name: 'Zabaglione',
        description: 'Warm Italian custard with Marsala wine, served with biscotti',
        price: 9.99,
        isAvailable: true,
        isVegetarian: true,
      },
      {
        tenantId: demoTenant.id,
        categoryId: dolci.id,
        name: 'Torta della Nonna',
        description: 'Traditional Italian custard tart with pine nuts',
        price: 8.99,
        isAvailable: true,
        isVegetarian: true,
      },

      // SOFT DRINKS
      {
        tenantId: demoTenant.id,
        categoryId: softDrinks.id,
        name: 'San Pellegrino Sparkling Water',
        description: 'Premium Italian sparkling mineral water (750ml)',
        price: 5.99,
        isAvailable: true,
        isVegetarian: true,
      },
      {
        tenantId: demoTenant.id,
        categoryId: softDrinks.id,
        name: 'Acqua Panna Still Water',
        description: 'Tuscan natural spring water (750ml)',
        price: 4.99,
        isAvailable: true,
        isVegetarian: true,
      },
      {
        tenantId: demoTenant.id,
        categoryId: softDrinks.id,
        name: 'Limonata San Pellegrino',
        description: 'Italian lemon soda with real lemon juice',
        price: 4.49,
        isAvailable: true,
        isVegetarian: true,
      },
      {
        tenantId: demoTenant.id,
        categoryId: softDrinks.id,
        name: 'Aranciata San Pellegrino',
        description: 'Italian blood orange soda',
        price: 4.49,
        isAvailable: true,
        isVegetarian: true,
      },
      {
        tenantId: demoTenant.id,
        categoryId: softDrinks.id,
        name: 'Chinotto',
        description: 'Classic Italian bitter citrus soda',
        price: 4.49,
        isAvailable: true,
        isVegetarian: true,
      },
      {
        tenantId: demoTenant.id,
        categoryId: softDrinks.id,
        name: 'Fresh Lemonade',
        description: 'House-made lemonade with fresh lemons and mint',
        price: 4.99,
        isAvailable: true,
        isVegetarian: true,
      },
      {
        tenantId: demoTenant.id,
        categoryId: softDrinks.id,
        name: 'Italian Orange Juice',
        description: 'Freshly squeezed Sicilian blood orange juice',
        price: 5.99,
        isAvailable: true,
        isVegetarian: true,
      },
      {
        tenantId: demoTenant.id,
        categoryId: softDrinks.id,
        name: 'Coca-Cola / Coca-Cola Zero',
        description: 'Classic or zero sugar cola',
        price: 3.49,
        isAvailable: true,
        isVegetarian: true,
      },
      {
        tenantId: demoTenant.id,
        categoryId: softDrinks.id,
        name: 'Sprite',
        description: 'Lemon-lime soda',
        price: 3.49,
        isAvailable: true,
        isVegetarian: true,
      },
      {
        tenantId: demoTenant.id,
        categoryId: softDrinks.id,
        name: 'Ginger Beer',
        description: 'Spicy Italian ginger beer',
        price: 4.49,
        isAvailable: true,
        isVegetarian: true,
      },
      {
        tenantId: demoTenant.id,
        categoryId: softDrinks.id,
        name: 'Iced Tea alla Pesca',
        description: 'Italian peach iced tea',
        price: 3.99,
        isAvailable: true,
        isVegetarian: true,
      },

      // MOCKTAILS
      {
        tenantId: demoTenant.id,
        categoryId: mocktails.id,
        name: 'Virgin Aperol Spritz',
        description: 'Alcohol-free Aperol alternative with sparkling water and fresh orange',
        price: 8.99,
        isAvailable: true,
        isVegetarian: true,
      },
      {
        tenantId: demoTenant.id,
        categoryId: mocktails.id,
        name: 'Limoncello Fizz (Virgin)',
        description: 'Lemon juice, sugar syrup, and sparkling water with lemon zest',
        price: 7.99,
        isAvailable: true,
        isVegetarian: true,
      },
      {
        tenantId: demoTenant.id,
        categoryId: mocktails.id,
        name: 'Bellini Analcolico',
        description: 'White peach purée with sparkling grape juice',
        price: 8.99,
        isAvailable: true,
        isVegetarian: true,
      },
      {
        tenantId: demoTenant.id,
        categoryId: mocktails.id,
        name: 'Negroni Sbagliato Virgin',
        description: 'Bitter orange, sweet vermouth alternative, and sparkling water',
        price: 8.99,
        isAvailable: true,
        isVegetarian: true,
      },
      {
        tenantId: demoTenant.id,
        categoryId: mocktails.id,
        name: 'Basilico Smash',
        description: 'Fresh basil, lime juice, cucumber, and ginger ale',
        price: 7.99,
        isAvailable: true,
        isVegetarian: true,
      },
      {
        tenantId: demoTenant.id,
        categoryId: mocktails.id,
        name: 'Fragola Rossini',
        description: 'Fresh strawberry purée with Italian sparkling grape juice',
        price: 8.99,
        isAvailable: true,
        isVegetarian: true,
      },
      {
        tenantId: demoTenant.id,
        categoryId: mocktails.id,
        name: 'Arancia Rossa Mule',
        description: 'Blood orange juice, lime, ginger beer, and fresh mint',
        price: 8.49,
        isAvailable: true,
        isVegetarian: true,
      },
      {
        tenantId: demoTenant.id,
        categoryId: mocktails.id,
        name: 'Mediterranean Sunset',
        description: 'Pomegranate juice, orange juice, passion fruit, and sparkling water',
        price: 8.99,
        isAvailable: true,
        isVegetarian: true,
      },
      {
        tenantId: demoTenant.id,
        categoryId: mocktails.id,
        name: 'Cucumber Italiano',
        description: 'Muddled cucumber, elderflower syrup, lime, and tonic water',
        price: 7.99,
        isAvailable: true,
        isVegetarian: true,
      },
      {
        tenantId: demoTenant.id,
        categoryId: mocktails.id,
        name: 'Tropical Amalfi',
        description: 'Mango, passion fruit, coconut cream, and pineapple juice',
        price: 9.49,
        isAvailable: true,
        isVegetarian: true,
      },

      // CAFFÈ E DIGESTIVI
      {
        tenantId: demoTenant.id,
        categoryId: caffe.id,
        name: 'Espresso',
        description: 'Classic Italian espresso shot',
        price: 3.49,
        isAvailable: true,
        isVegetarian: true,
      },
      {
        tenantId: demoTenant.id,
        categoryId: caffe.id,
        name: 'Doppio Espresso',
        description: 'Double espresso shot',
        price: 4.49,
        isAvailable: true,
        isVegetarian: true,
      },
      {
        tenantId: demoTenant.id,
        categoryId: caffe.id,
        name: 'Cappuccino',
        description: 'Espresso with steamed milk and foam',
        price: 4.99,
        isAvailable: true,
        isVegetarian: true,
      },
      {
        tenantId: demoTenant.id,
        categoryId: caffe.id,
        name: 'Caffè Latte',
        description: 'Espresso with steamed milk',
        price: 4.99,
        isAvailable: true,
        isVegetarian: true,
      },
      {
        tenantId: demoTenant.id,
        categoryId: caffe.id,
        name: 'Caffè Macchiato',
        description: 'Espresso marked with a dollop of milk foam',
        price: 3.99,
        isAvailable: true,
        isVegetarian: true,
      },
      {
        tenantId: demoTenant.id,
        categoryId: caffe.id,
        name: 'Caffè Corretto',
        description: 'Espresso with a shot of grappa or sambuca',
        price: 6.99,
        isAvailable: true,
        isVegetarian: true,
      },
      {
        tenantId: demoTenant.id,
        categoryId: caffe.id,
        name: 'Decaf Espresso',
        description: 'Decaffeinated Italian espresso',
        price: 3.49,
        isAvailable: true,
        isVegetarian: true,
      },
      {
        tenantId: demoTenant.id,
        categoryId: caffe.id,
        name: 'Italian Hot Chocolate',
        description: 'Rich and thick Italian-style hot chocolate',
        price: 5.99,
        isAvailable: true,
        isVegetarian: true,
      },
    ],
  });

  console.log('Created demo dishes');

  // Create a restaurant admin user
  const adminPasswordHash = await bcrypt.hash('demo123', 10);
  
  await prisma.adminUser.create({
    data: {
      tenantId: demoTenant.id,
      email: 'admin@demo-restaurant.com',
      username: 'restaurantadmin',
      passwordHash: adminPasswordHash,
      role: 'admin',
      isActive: true,
    },
  });

  console.log('Created restaurant admin user');

  console.log('\n✅ Database seeded successfully!');
  console.log('\n📋 Login credentials:');
  console.log('   Platform Admin: admin@menuai.com / admin123');
  console.log('   Restaurant Admin: admin@demo-restaurant.com / demo123');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
