import pool from './db.js';

const createUserTableQuery = `
  CREATE TABLE "User" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "email" TEXT NOT NULL UNIQUE,
      "password" TEXT NOT NULL,
      "name" TEXT NOT NULL,
      "role" TEXT NOT NULL DEFAULT 'USER',
      "avatarUrl" TEXT,
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

const checkTableExists = async (tableName: string): Promise<boolean> => {
  const res = await pool.query(
    "SELECT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename  = $1)",
    [tableName]
  );
  return res.rows[0].exists;
};

export const initializeDatabase = async () => {
  console.log('Checking database schema...');

  const userTableExists = await checkTableExists('User');
  if (!userTableExists) {
    console.log('"User" table not found. Creating...');
    await pool.query(createUserTableQuery);
    console.log('"User" table created successfully.');
  } else {
    console.log('"User" table already exists.');
  }

  const adTableExists = await checkTableExists('Ad');
  if (!adTableExists) {
    console.log('"Ad" table not found. Creating...');
    await pool.query(createAdTableQuery);
    console.log('"Ad" table created successfully.');
  } else {
    console.log('"Ad" table already exists.');
  }

  console.log('Database schema check complete.');
};