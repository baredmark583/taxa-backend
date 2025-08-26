

import AdminJS from 'adminjs';
import AdminJSExpress from '@adminjs/express';
import { Database, Resource } from '@adminjs/sql';

// Register the SQL adapter
AdminJS.registerAdapter({ Database, Resource });

if (!process.env.ADMIN_EMAIL || !process.env.ADMIN_PASSWORD) {
  throw new Error('ADMIN_EMAIL and ADMIN_PASSWORD must be set in environment variables');
}
if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL must be set in environment variables');
}

// @ts-ignore - The @adminjs/sql types for the Database constructor are incorrect.
const db = new Database(process.env.DATABASE_URL);


const admin = new AdminJS({
  // The databases array is not needed when resources are defined this way.
  databases: [],
  rootPath: '/admin',
  branding: {
    companyName: 'Taxa AI',
  },
  // FIX: Define resources using the Database instance. This ensures that AdminJS
  // uses the correct adapter and can find the tables.
  resources: [
    {
      // @ts-ignore - The @adminjs/sql types are incorrect and don't show the .table() method
      resource: db.table('User'),
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
      // @ts-ignore - The @adminjs/sql types are incorrect and don't show the .table() method
      resource: db.table('Ad'),
      options: {},
    },
  ],
});

const adminRouter = AdminJSExpress.buildAuthenticatedRouter(admin, {
    authenticate: async (email, password) => {
        if (email === process.env.ADMIN_EMAIL && password === process.env.ADMIN_PASSWORD) {
            // A simple user object is sufficient for AdminJS session
            return { email: email, role: 'admin' };
        }
        return null;
    },
    // It's good practice to use a dedicated secret for the cookie.
    cookiePassword: process.env.COOKIE_SECRET || 'a-very-secret-string-for-cookie-encryption',
});


export { admin, adminRouter };