
import AdminJS from 'adminjs';
import AdminJSExpress from '@adminjs/express';
import { Database, Resource } from '@adminjs/sql';
import pool from './db'; // Your configured pg Pool
import bcrypt from 'bcryptjs';

// Register the SQL adapter
AdminJS.registerAdapter({ Database, Resource });

if (!process.env.ADMIN_EMAIL || !process.env.ADMIN_PASSWORD) {
  throw new Error('ADMIN_EMAIL and ADMIN_PASSWORD must be set in environment variables');
}

const admin = new AdminJS({
  // Use the pool for the database connection
  databases: [{
    database: pool.options.database!,
    user: pool.options.user!,
    password: pool.options.password!,
    host: pool.options.host!,
    port: pool.options.port!,
    dialect: 'postgres',
    // ssl: process.env.NODE_ENV === 'production', // Enable SSL in production if needed
  }],
  rootPath: '/admin',
  branding: {
    companyName: 'Taxa AI',
  },
  resources: [
    {
      resource: { table: 'User', database: 0 },
      options: {
        properties: {
          // Hide password from the UI
          password: {
            isVisible: { list: false, filter: false, show: false, edit: false },
          },
        },
      },
    },
    {
      resource: { table: 'Ad', database: 0 },
      options: {},
    },
  ],
});

const adminRouter = AdminJSExpress.buildAuthenticatedRouter(admin, {
    authenticate: async (email, password) => {
        if (email === process.env.ADMIN_EMAIL && password === process.env.ADMIN_PASSWORD) {
            return { email: email, role: 'admin' };
        }
        return null;
    },
    cookiePassword: process.env.COOKIE_SECRET || 'a-very-secret-string-for-cookie-encryption',
});


export { admin, adminRouter };