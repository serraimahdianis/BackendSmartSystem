# AGENTS.md — backend/

Root: `../AGENTS.md` for monorepo-wide commands and cross-project context.

This file provides guidelines for agentic coding tools working on this NestJS backend project.

## Project Overview

NestJS backend for a university attendance management system using MongoDB (Mongoose ODM), JWT authentication, Swagger API docs, and role-based access control. Key features: student/teacher management, session scheduling, attendance tracking via RFID/QR/face recognition.

## Build/Lint/Test Commands

### Core Commands

- Build: `npm run build` (compiles TS to `dist/` via NestJS CLI)
- Dev mode: `npm run start:dev` (auto-reload on changes)
- Lint: `npm run lint` (ESLint with auto-fix for `src/` and `test/`)
- Format: `npm run format` (Prettier for all `.ts` files in `src/` and `test/`)
- Seed DB: `npm run seed` (runs `src/seed.ts` via ts-node to populate test data)

### Test Commands

- Run all unit tests: `npm run test` (Jest with ts-jest)
- Run single test file: `npx jest path/to/file.spec.ts` (e.g., `npx jest src/student/student.service.spec.ts`)
- Run tests by name pattern: `npx jest --testPathPattern="student"`
- Watch mode: `npm run test:watch`
- Coverage: `npm run test:cov`
- E2E tests: `npm run test:e2e` (uses `test/jest-e2e.json` config)

## Code Style Guidelines

### Configuration

- ESLint: `eslint.config.mjs` (typescript-eslint, Prettier integration)
- TypeScript: `tsconfig.json` (strictNullChecks enabled, noImplicitAny disabled, decorator support)
- Prettier: Integrated via ESLint plugin, endOfLine set to `auto`

### Imports

1. External library imports first (sorted alphabetically):
   ```ts
   import { Injectable } from '@nestjs/common';
   import { InjectModel } from '@nestjs/mongoose';
   import { Model } from 'mongoose';
   import * as bcrypt from 'bcrypt';
   ```
2. Local imports with relative paths (no absolute `@/` aliases):
   ```ts
   import { Student, StudentDocument } from './schemas/student.schema';
   import { CreateStudentDto } from './dto/create-student.dto';
   ```

### Naming Conventions

- Files: Kebab-case per NestJS convention: `create-student.dto.ts`, `student.service.ts`, `student.schema.ts`
- Classes: PascalCase: `CreateStudentDto`, `StudentService`, `StudentController`
- DTOs: `Create<Entity>Dto`, `Update<Entity>Dto` (e.g., `CreateTeacherDto`)
- Mongoose Schemas: `<Entity>Schema` exported from schema files, with `<Entity>Document` type (e.g., `StudentSchema`, `StudentDocument`)
- Variables/functions: camelCase: `studentIds`, `teacherToken`, `findStudentById`
- Constants: UPPER_SNAKE_CASE: `API_URL`, `MAX_RETRY_COUNT`
- ID Fields: Numeric only (no prefixes like `ST`), e.g., `studentId: 1001` not `studentId: "ST1001"`

### Formatting & Types

- Use TypeScript types for all function params/returns; avoid `any` (ESLint rule disabled but discouraged)
- Enable strict null checks; handle `null`/`undefined` explicitly
- Use Mongoose `HydratedDocument` for document types
- Decorator order: Swagger `@ApiProperty` first, then validation `@IsString()`, then Mongoose `@Prop()`

### Error Handling

- Use NestJS built-in exceptions: `NotFoundException`, `BadRequestException`, `UnauthorizedException`
- Seed/data scripts: throw descriptive `Error` objects with context (endpoint, status code)
- Avoid bare `catch` blocks; always handle or rethrow errors

### NestJS Specifics

- Follow modular structure: each feature has its own module, controller, service, DTOs, and schemas
- Use `@InjectModel(<Entity>.name)` for Mongoose model injection
- JWT strategy in `src/auth/jwt.strategy.ts`, role guards in `src/auth/guards/`
- Swagger decorators (`@ApiProperty`, `@ApiOperation`) required for all DTOs and endpoints

## Database Guidelines

- Uses MongoDB via Mongoose ODM with `@nestjs/mongoose`
- Schema files export `<Entity>Schema` and `<Entity>Document` type (HydratedDocument)
- Use `@Prop()` decorators for schema field definitions
- Timestamps enabled by default (`{ timestamps: true }` in schema)
- Sensitive fields (password, otp) use `@Prop({ select: false })` to exclude from queries by default

## Authentication & Authorization

- JWT-based auth with separate login flows for students (studentId + birthday), teachers (email + password + OTP verification), admins (email + password)
- Role guards in `src/auth/guards/` restrict endpoints by role (student, teacher, admin)
- Student passwords default to their birthday (DDMMYYYY format) as hashed values in `src/student/student.service.ts`
- Teacher accounts require OTP verification sent to their email before activation

## Seed Data Guidelines

- Seed script: `src/seed.ts` run via `npm run seed` (requires backend running on `localhost:3000`)
- Pre-seeded test accounts:
  - Admin: `admin@admin.com` / `admin123`
  - Teachers: `t.test@univ-setif.dz` / `password123`, `a.bouzid@univ-setif.dz` / `password123`
  - Students: First student `student1@student.dz` (ID `1001`) / password `15031999` (birthday)
- Seed clears all existing data before populating new records

## Testing Tips

- Unit tests live in `**/*.spec.ts` files next to the service/controller they test
- E2E tests live in `test/` directory with `.e2e-spec.ts` suffix
- Use `@nestjs/testing` for unit/E2E test setup (Test.createTestingModule)
- Mock Mongoose models using `jest.fn()` for unit tests
- Run single E2E test: `npx jest test/session.e2e-spec.ts`

## Example Workflow

To add a new feature (e.g., new field to Student):

1. Update `src/student/schemas/student.schema.ts` with new field + decorators
2. Update `src/student/dto/create-student.dto.ts` and `update-student.dto.ts`
3. Update `src/student/student.service.ts` if business logic is needed
4. Run `npm run lint` to verify style
5. Add unit tests to `src/student/student.service.spec.ts`
6. Run `npm run test` to verify tests pass

## Environment Setup

- Copy `ex.env` to `.env` and fill in required values (MongoDB URI, JWT secret, email credentials)
- MongoDB URI format: `mongodb://localhost:27017/attendance_db`
- JWT secret: use a strong random string for production
- Seed the database after setup: `npm run seed`

## Common Pitfalls

- Always restart the dev server after modifying DTOs or schemas to apply changes
- Mongoose `select: false` fields (password, otp) are excluded from query results by default; use `.select('+field')` to include them
- Jest tests run with `ts-jest`; avoid using `ts-node` directly in test files
- API requests in seed.ts use `localhost:3000`; ensure the backend is running before seeding

## External Rules

No Cursor rules (`.cursorrules`), Copilot instructions (`.github/copilot-instructions.md`) were found in the repository. This file serves as the primary guideline for agentic coding tools.
