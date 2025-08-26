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

// FIX: Explicitly pass SSL config to the database connection for AdminJS.
// This is necessary for cloud environments like Render.
// FIX: Cast config to 'any' to bypass incorrect @adminjs/sql types.
const db = new Database({
  client: 'pg',
  connection: {
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  },
} as any);


const admin = new AdminJS({
  // Pass the database connection to AdminJS. It will be used to find the resources.
  databases: [db],
  rootPath: '/admin',
  branding: {
    companyName: 'Taxa AI',
  },
  // FIX: Explicitly instantiate Resource objects for each table to resolve discovery issues.
  resources: [
    {
      // FIX: Corrected resource definition to use db.table() instead of new Resource().
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
      // FIX: Corrected resource definition to use db.table() instead of new Resource().
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