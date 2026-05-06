# 🎓 Smart Attendance System — Backend Instructions

Foundational mandates and workflows for the Smart Attendance System backend.

## Project Overview

- **Core:** NestJS 11 + MongoDB (Mongoose) + JWT Authentication.
- **Goal:** University attendance management system utilizing RFID scanning, QR codes, and face recognition.
- **Key Modules:**
  - `auth`: JWT, OTP verification (Nodemailer), and RBAC (Admin, Teacher, Student).
  - `teacher`: Teacher management.
  - `student`: Student management with auto-generated passwords (birthday).
  - `module`: Academic subjects/modules.
  - `schedule`: Weekly timetable management.
  - `session`: Live class session tracking.
  - `attendance`: RFID/QR scan records and attendance logic.

## Technical Stack & Architecture

- **Runtime:** Node.js (v20+) with NestJS.
- **Database:** MongoDB via Mongoose ODM.
- **Validation:** `class-validator` and `class-transformer` for DTOs.
- **Documentation:** Swagger UI available at `/api`.
- **Testing:** Jest for unit tests and E2E testing.

## Building and Running

- **Install:** `npm install`
- **Development:** `npm run start:dev`
- **Build:** `npm run build`
- **Lint:** `npm run lint` (ESLint + Prettier)
- **Seed Data:** `npm run seed` (populates the DB via `src/seed.ts`)
- **Unit Tests:** `npm run test`
- **E2E Tests:** `npm run test:e2e` (Ensure the server is running first)

## Development Conventions

### Naming & Structure
- **Files:** kebab-case (e.g., `student.service.ts`, `create-student.dto.ts`).
- **Classes:** PascalCase (e.g., `StudentService`, `StudentDocument`).
- **Variables/Functions:** camelCase.
- **DTOs:** Always use `Create<Entity>Dto` and `Update<Entity>Dto`.
- **Schemas:** Export `<Entity>Schema` and `<Entity>Document` type.

### Implementation Patterns
- **Swagger:** Use `@ApiProperty` on DTOs and `@ApiOperation`, `@ApiResponse` on controllers.
- **Validation:** Use `class-validator` decorators on all DTO fields.
- **Mongoose:**
  - Use `@Prop()` for schema fields.
  - Enable timestamps: `@Schema({ timestamps: true })`.
  - Sensitive fields (password, otp) must use `select: false`.
- **Error Handling:** Always use NestJS built-in exceptions (e.g., `NotFoundException`, `ForbiddenException`).
- **Dependency Injection:** Use constructor-based injection for services and `@InjectModel()` for Mongoose models.

### Authentication & Authorization
- **Roles:** `admin`, `teacher`, `student`.
- **Guards:** Use `@UseGuards(JwtAuthGuard, RolesGuard)` with `@Roles('role_name')` decorator.
- **Login Flows:**
  - Admin: Email/Password from `.env`.
  - Teacher: Email/Password + OTP verification.
  - Student: StudentID + Birthday Password.
    - **Password Logic:** `sciences` + `birthday` (DDMMYYYY). Example: `sciences26062003`.

## Real-World Data Standards (Gold Standard)

For testing and seeding, prioritize these data patterns:

### Student Reference (Serrai Mahdi Anis)
- **Full Name:** `SERRAI MAHDI ANIS`
- **Student ID:** `212135055186`
- **Birthday:** `26062003` (Password: `sciences26062003`)
- **Department:** `Informatique`
- **Speciality:** `IDTW`
- **Year:** `M2`
- **RFID:** `0007637223`
- **Group:** `01`

### Teacher Reference (Prof. Dr. Amine Khelifi)
- **Full Name:** `Prof. Dr. Amine Khelifi`
- **Email:** `a.khelifi@univ-setif.dz`
- **Department:** `Computer Science`

## Testing Standards
- Unit tests (`.spec.ts`) should be co-located with the source file.
- E2E tests (`.e2e-spec.ts`) reside in the `test/` directory.
- Mocks should be used for database models in unit tests.

## Environment Configuration
- Use `.env` file (see `ex.env` for template).
- Required variables: `mongo_uri`, `JWT_SECRET`, `PORT`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`, and SMTP credentials for OTP emails.
