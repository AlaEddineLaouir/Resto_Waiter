// Load environment variables first
import 'dotenv/config';

import cluster from 'cluster';
import { cpus } from 'os';
import process from 'process';
import config from './config/index.js';

const numCPUs = cpus().length;

if (config.enableClustering && cluster.isPrimary) {
  console.log(`🚀 Primary ${process.pid} is running`);
  console.log(`📊 Starting ${numCPUs} workers...`);

  // Fork workers
  for (let i = 0; i < numCPUs; i++) {
    cluster.fork();
  }

  // Handle worker exit
  cluster.on('exit', (worker, code, signal) => {
    console.log(`⚠️ Worker ${worker.process.pid} died (${signal || code}). Restarting...`);
    cluster.fork();
  });

  // Graceful shutdown
  process.on('SIGTERM', () => {
    console.log('🛑 SIGTERM received. Shutting down gracefully...');
    for (const id in cluster.workers) {
      cluster.workers[id].kill('SIGTERM');
    }
    setTimeout(() => process.exit(0), 5000);
  });

} else {
  // Worker process - run the app
  const { default: app } = await import('./api/app-multitenant.js');

  const PORT = config.port;

  const server = app.listen(PORT, () => {
    const workerId = cluster.worker?.id || 'single';
    console.log(`🍽️  Worker ${workerId} running at http://localhost:${PORT}`);
    if (!config.enableClustering) {
      console.log(`📋 Menu API: http://localhost:${PORT}/api/menu`);
      console.log(`💬 Chat API: http://localhost:${PORT}/api/chat`);
      console.log(`⚙️  Settings: http://localhost:${PORT}/setup.html`);
      console.log(`🏠 Chat UI: http://localhost:${PORT}`);
      console.log(`❤️  Health: http://localhost:${PORT}/health`);
      console.log(`\n🔐 Multi-tenant mode enabled`);
      console.log(`   Use /t/{tenantId}/... for tenant-specific routes`);
    }
  });

  // Graceful shutdown for workers
  process.on('SIGTERM', () => {
    console.log('🛑 Shutting down worker...');
    server.close(() => {
      console.log('✅ Worker closed');
      process.exit(0);
    });
    // Force close after 10 seconds
    setTimeout(() => process.exit(1), 10000);
  });

  process.on('uncaughtException', (err) => {
    console.error('❌ Uncaught Exception:', err);
    process.exit(1);
  });

  process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  });
}
