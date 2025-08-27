import pool from './db.js';
import bcrypt from 'bcryptjs';
import cuid from 'cuid';

const createUserTableQuery = `
  CREATE TABLE "User" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "email" TEXT UNIQUE,
      "password" TEXT,
      "telegramId" BIGINT UNIQUE,
      "username" TEXT,
      "name" TEXT NOT NULL,
      "role" TEXT NOT NULL DEFAULT 'USER',
      "avatarUrl" TEXT,
      "latitude" DECIMAL(9, 6),
      "longitude" DECIMAL(9, 6),
      "city" TEXT,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL
  );
`;

const createAdTableQuery = `
  CREATE TABLE "Ad" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "title" TEXT NOT NULL,
      "description" TEXT NOT NULL,
      "price" TEXT NOT NULL,
      "category" TEXT NOT NULL,
      "location" TEXT NOT NULL,
      "tags" TEXT[] NOT NULL,
      "imageUrls" TEXT[] NOT NULL,
      "status" TEXT NOT NULL DEFAULT 'active',
      "sellerId" TEXT NOT NULL,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL,
      CONSTRAINT "Ad_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
  );
`;

const createReviewTableQuery = `
  CREATE TABLE "Review" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "rating" INTEGER NOT NULL CHECK ("rating" >= 1 AND "rating" <= 5),
      "text" TEXT NOT NULL,
      "authorId" TEXT NOT NULL,
      "sellerId" TEXT NOT NULL,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL,
      CONSTRAINT "Review_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
      CONSTRAINT "Review_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
  );
`;

const createChatMessageTableQuery = `
  CREATE TABLE "ChatMessage" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "text" TEXT,
      "imageUrl" TEXT,
      "isRead" BOOLEAN NOT NULL DEFAULT false,
      "senderId" TEXT NOT NULL,
      "receiverId" TEXT NOT NULL,
      "adId" TEXT NOT NULL,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "ChatMessage_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
      CONSTRAINT "ChatMessage_receiverId_fkey" FOREIGN KEY ("receiverId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
      CONSTRAINT "ChatMessage_adId_fkey" FOREIGN KEY ("adId") REFERENCES "Ad" ("id") ON DELETE CASCADE ON UPDATE CASCADE
  );
`;

const createSavedSearchTableQuery = `
  CREATE TABLE "SavedSearch" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "query" TEXT NOT NULL,
      "category" TEXT,
      "filters" JSONB,
      "userId" TEXT NOT NULL,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "SavedSearch_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
  );
`;

const createQuestionTableQuery = `
  CREATE TABLE "Question" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "text" TEXT NOT NULL,
      "adId" TEXT NOT NULL,
      "authorId" TEXT NOT NULL,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL,
      CONSTRAINT "Question_adId_fkey" FOREIGN KEY ("adId") REFERENCES "Ad" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
      CONSTRAINT "Question_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
  );
`;

const createAnswerTableQuery = `
  CREATE TABLE "Answer" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "text" TEXT NOT NULL,
      "questionId" TEXT NOT NULL UNIQUE,
      "authorId" TEXT NOT NULL,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL,
      CONSTRAINT "Answer_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
      CONSTRAINT "Answer_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
  );
`;

const createFollowTableQuery = `
  CREATE TABLE "Follow" (
      "followerId" TEXT NOT NULL,
      "sellerId" TEXT NOT NULL,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY ("followerId", "sellerId"),
      CONSTRAINT "Follow_followerId_fkey" FOREIGN KEY ("followerId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
      CONSTRAINT "Follow_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
  );
`;

const checkTableExists = async (tableName: string): Promise<boolean> => {
  const res = await pool.query(
    "SELECT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename  = $1)",
    [tableName]
  );
  return res.rows[0].exists;
};

const createTableIfNotExists = async (name: string, query: string) => {
    const tableExists = await checkTableExists(name);
    if (!tableExists) {
        console.log(`"${name}" table not found. Creating...`);
        await pool.query(query);
        console.log(`"${name}" table created successfully.`);
    } else {
        console.log(`"${name}" table already exists.`);
    }
};

const checkColumnExists = async (tableName: string, columnName: string): Promise<boolean> => {
    const res = await pool.query(
        `SELECT EXISTS (
          SELECT 1
          FROM information_schema.columns
          WHERE table_schema = 'public' AND table_name = $1 AND column_name = $2
        )`,
        [tableName, columnName]
    );
    return res.rows[0].exists;
};

const addColumnIfNotExists = async (tableName: string, columnName: string, columnDefinition: string) => {
    const tableExists = await checkTableExists(tableName);
    if (!tableExists) return;

    const columnExists = await checkColumnExists(tableName, columnName);
    if (!columnExists) {
        console.log(`Column "${columnName}" not found in "${tableName}". Adding...`);
        await pool.query(`ALTER TABLE "${tableName}" ADD COLUMN "${columnName}" ${columnDefinition}`);
        console.log(`Column "${columnName}" added successfully to "${tableName}".`);
    }
};

const checkColumnIsNullable = async (tableName: string, columnName: string): Promise<boolean> => {
    const res = await pool.query(
        `SELECT is_nullable
         FROM information_schema.columns
         WHERE table_schema = 'public' AND table_name = $1 AND column_name = $2`,
        [tableName, columnName]
    );
    if (res.rows.length === 0) {
        return false; 
    }
    return res.rows[0].is_nullable === 'YES';
};

const makeColumnNullable = async (tableName: string, columnName: string) => {
    const tableExists = await checkTableExists(tableName);
    if (!tableExists) return;

    const columnExists = await checkColumnExists(tableName, columnName);
    if (!columnExists) return;

    const isNullable = await checkColumnIsNullable(tableName, columnName);
    if (!isNullable) {
        console.log(`Column "${columnName}" in "${tableName}" is NOT NULL. Altering to allow NULLs...`);
        try {
            await pool.query(`ALTER TABLE "${tableName}" ALTER COLUMN "${columnName}" DROP NOT NULL`);
            console.log(`Column "${columnName}" in "${tableName}" now allows NULLs.`);
        } catch (error) {
            console.error(`Failed to make column "${columnName}" nullable:`, error);
        }
    }
};

const createAdminUserIfNotExists = async () => {
    const adminEmail = process.env.ADMIN_EMAIL;
    const adminPassword = process.env.ADMIN_PASSWORD;

    if (!adminEmail || !adminPassword) {
        console.warn('ADMIN_EMAIL or ADMIN_PASSWORD not set. Skipping admin user creation.');
        return;
    }

    const res = await pool.query('SELECT * FROM "User" WHERE email = $1', [adminEmail]);
    if (res.rows.length === 0) {
        console.log(`Admin user with email ${adminEmail} not found. Creating...`);
        const hashedPassword = await bcrypt.hash(adminPassword, 12);
        const adminId = cuid(); // Generate ID in the application code
        await pool.query(
            `INSERT INTO "User" (id, email, password, name, role, "updatedAt") 
             VALUES ($1, $2, $3, $4, 'ADMIN', $5)`,
            [adminId, adminEmail, hashedPassword, 'Admin', new Date()] // Pass the generated ID as a parameter
        );
        console.log('Admin user created successfully.');
    } else {
        console.log('Admin user already exists.');
    }
};

export const initializeDatabase = async () => {
  console.log('Checking database schema...');

  // Core tables
  await createTableIfNotExists('User', createUserTableQuery);
  await createTableIfNotExists('Ad', createAdTableQuery);

  // Simple migrations to ensure columns exist on existing User tables
  await addColumnIfNotExists('User', 'telegramId', 'BIGINT UNIQUE');
  await addColumnIfNotExists('User', 'username', 'TEXT');
  await addColumnIfNotExists('User', 'latitude', 'DECIMAL(9, 6)');
  await addColumnIfNotExists('User', 'longitude', 'DECIMAL(9, 6)');
  await addColumnIfNotExists('User', 'city', 'TEXT');

  // FIX: Migration to fix email NOT NULL constraint for Telegram users
  await makeColumnNullable('User', 'email');
  // FIX: Migration to fix password NOT NULL constraint for Telegram users
  await makeColumnNullable('User', 'password');

  // Feature tables (with dependencies in mind)
  await createTableIfNotExists('Review', createReviewTableQuery);
  await createTableIfNotExists('ChatMessage', createChatMessageTableQuery);
  await createTableIfNotExists('SavedSearch', createSavedSearchTableQuery);
  await createTableIfNotExists('Follow', createFollowTableQuery);
  
  // Question/Answer pair (Question must exist before Answer)
  await createTableIfNotExists('Question', createQuestionTableQuery);
  await createTableIfNotExists('Answer', createAnswerTableQuery);

  // Ensure admin user exists
  await createAdminUserIfNotExists();

  console.log('Database schema check complete.');
};