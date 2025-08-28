// This declaration file is added to solve a TypeScript build error.
// The 'express-formidable' package does not ship with its own type definitions,
// and without this file, the TypeScript compiler throws an error about an
// implicit 'any' type. This declaration tells TypeScript to treat the module
// as 'any', allowing the build to proceed.
declare module 'express-formidable';