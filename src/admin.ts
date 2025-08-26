// import AdminJS from 'adminjs';
// import AdminJSExpress from '@adminjs/express';
// import { PrismaClient } from '@prisma/client';
// import { Database, Resource } from '@adminjs/prisma';
// import { AuthenticationOptions } from 'adminjs';
// import bcrypt from 'bcryptjs';
// import { DMMFClass } from '@prisma/client/runtime/library';

// // Register Prisma Adapter
// AdminJS.registerAdapter({ Database, Resource });

// const prisma = new PrismaClient();

// export const setupAdmin = async () => {

//   const adminOptions = {
//     // We can translate AdminJS locales to Ukrainian
//     locale: {
//         language: 'uk',
//         translations: {
//             labels: {
//                 User: 'Користувачі',
//                 Ad: 'Оголошення',
//             }
//         }
//     },
//     rootPath: '/admin',
//     resources: [
//         {
//             resource: { model: (prisma as any)._dmmf.modelMap.User, client: prisma },
//             options: {
//                 properties: {
//                     password: {
//                         isVisible: false, // Don't show the hashed password
//                     },
//                     role: {
//                         availableValues: [
//                             { value: 'USER', label: 'Користувач' },
//                             { value: 'ADMIN', label: 'Адміністратор' },
//                         ]
//                     }
//                 },
//                  actions: {
//                     new: {
//                         // We shouldn't create regular users from admin panel this way
//                         // since password would not be hashed properly without a custom action
//                         isAccessible: false, 
//                     },
//                     edit: { isAccessible: true },
//                  }
//             },
//         },
//         {
//             resource: { model: (prisma as any)._dmmf.modelMap.Ad, client: prisma },
//             options: {
//                 properties: {
//                     description: {
//                         type: 'richtext'
//                     }
//                 }
//             }
//         },
//     ],
//     branding: {
//       companyName: 'Taxa AI',
//       softwareBrothers: false,
//       logo: false,
//     },
//   };

//   const authenticationOptions: AuthenticationOptions = {
//     authenticate: async (email, password) => {
//       const user = await prisma.user.findUnique({ where: { email } });
      
//       if (user && user.role === 'ADMIN') {
//         const matched = await bcrypt.compare(password, user.password);
//         if (matched) {
//           return user;
//         }
//       }
//       return false;
//     },
//     cookiePassword: process.env.COOKIE_PASSWORD || 'a-very-secret-cookie-password-change-it',
//   };
  
//   const admin = new AdminJS(adminOptions);
  
//   // Need to use any because of how AdminJS and express-session types interact
//   const adminRouter = AdminJSExpress.buildAuthenticatedRouter(admin, authenticationOptions, null, {
//     resave: false,
//     saveUninitialized: true,
//     secret: process.env.SESSION_SECRET || 'a-very-secret-key-that-you-should-change',
//   } as any);

//   return { admin, adminRouter };
// };
