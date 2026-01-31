import app from './api/app.js';

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`🍽️  Restaurant Menu Chatbot Server running at http://localhost:${PORT}`);
  console.log(`📋 Menu API: http://localhost:${PORT}/api/menu`);
  console.log(`💬 Chat API: http://localhost:${PORT}/api/chat`);
  console.log(`⚙️  Settings: http://localhost:${PORT}/setup.html`);
  console.log(`🏠 Chat UI: http://localhost:${PORT}`);
});
