/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║  SMART ATTENDANCE SYSTEM — Full E2E Workflow Test           ║
 * ║                                                              ║
 * ║  Prerequisites:                                              ║
 * ║  1. Server running on localhost:3000 (npm run start:dev)     ║
 * ║  2. MongoDB Atlas connected via .env                         ║
 * ║  3. SMTP configured for OTP emails                           ║
 * ║                                                              ║
 * ║  Run:  npm run test:e2e                                      ║
 * ╚══════════════════════════════════════════════════════════════╝
 */

import mongoose from 'mongoose';
import * as fs from 'fs';
import * as path from 'path';

// Load .env manually (no dotenv dependency needed)
const envPath = path.resolve(__dirname, '..', '.env');
const envContent = fs.readFileSync(envPath, 'utf8');
for (const line of envContent.split('\n')) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) continue;
  const eqIndex = trimmed.indexOf('=');
  if (eqIndex === -1) continue;
  const key = trimmed.slice(0, eqIndex).trim();
  const value = trimmed.slice(eqIndex + 1).trim();
  if (!process.env[key]) process.env[key] = value;
}

const API = 'http://localhost:3000';

// ─── Test data storage (shared between phases) ─────────────
const ctx: {
  adminToken: string;
  teacherToken: string;
  studentToken: string;
  teacherId: string;
  studentId: string;
  studentMongoId: string;
  moduleId: string;
  scheduleId: string;
  sessionId: string;
  attendanceId: string;
} = {
  adminToken: '',
  teacherToken: '',
  studentToken: '',
  teacherId: '',
  studentId: '',
  studentMongoId: '',
  moduleId: '',
  scheduleId: '',
  sessionId: '',
  attendanceId: '',
};

// ─── Unique test identifiers (to avoid collisions) ────────
const TEST_ID = Date.now().toString().slice(-6);
const TEACHER_EMAIL = `test.e2e.${TEST_ID}@univ-setif.dz`;
const TEACHER_PASSWORD = 'TestPass123';
const STUDENT_ID = `ST-E2E-${TEST_ID}`;
const STUDENT_BIRTHDAY = '15031999';
const RFID_CODE = `RFID-E2E-${TEST_ID}`;
const QR_CODE = `QR-E2E-${TEST_ID}`;

// ─── Helper: HTTP requests ────────────────────────────────
async function api(
  method: string,
  path: string,
  body?: Record<string, unknown>,
  token?: string,
): Promise<{ status: number; data: Record<string, unknown> }> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  let data: Record<string, unknown>;
  try {
    data = (await res.json()) as Record<string, unknown>;
  } catch {
    data = {};
  }

  return { status: res.status, data };
}

// ─── MongoDB direct connection (for OTP retrieval) ────────
let mongoConnection: typeof mongoose | null = null;

async function connectDB(): Promise<void> {
  const uri = process.env.mongo_uri;
  if (!uri) throw new Error('mongo_uri not found in .env');
  mongoConnection = await mongoose.connect(uri);
}

async function getOtpFromDB(email: string): Promise<string> {
  if (!mongoConnection) throw new Error('DB not connected');
  const db = mongoConnection.connection.db;
  if (!db) throw new Error('DB instance not available');
  const teacher = await db.collection('teachers').findOne({ email });
  if (!teacher || !teacher.otp) throw new Error(`OTP not found for ${email}`);
  return teacher.otp as string;
}

async function disconnectDB(): Promise<void> {
  if (mongoConnection) {
    await mongoConnection.disconnect();
    mongoConnection = null;
  }
}

// ═══════════════════════════════════════════════════════════════
// TEST SUITE
// ═══════════════════════════════════════════════════════════════

describe('Smart Attendance System — Full E2E Workflow', () => {
  // Increase timeout for real API calls + email sending
  jest.setTimeout(30000);

  beforeAll(async () => {
    await connectDB();
    console.log('✅ Connected to MongoDB for OTP retrieval');
  });

  afterAll(async () => {
    // ─── CLEANUP: Remove all test data ─────────────────────
    console.log('\n🧹 Cleaning up test data...');
    const db = mongoConnection?.connection.db;
    if (db) {
      await db.collection('attendances').deleteMany({
        sessionId: new mongoose.Types.ObjectId(
          ctx.sessionId || '000000000000000000000000',
        ),
      });
      if (ctx.sessionId)
        await db
          .collection('sessions')
          .deleteOne({ _id: new mongoose.Types.ObjectId(ctx.sessionId) });
      if (ctx.scheduleId)
        await db
          .collection('schedules')
          .deleteOne({ _id: new mongoose.Types.ObjectId(ctx.scheduleId) });
      if (ctx.moduleId)
        await db
          .collection('modules')
          .deleteOne({ _id: new mongoose.Types.ObjectId(ctx.moduleId) });
      await db.collection('students').deleteOne({ studentId: STUDENT_ID });
      await db.collection('teachers').deleteOne({ email: TEACHER_EMAIL });
      console.log('✅ Test data cleaned from database');
    }
    await disconnectDB();
    console.log('✅ MongoDB disconnected');
  });

  // ════════════════════════════════════════════════════════════
  // PHASE 1: ADMIN AUTHENTICATION
  // ════════════════════════════════════════════════════════════

  describe('PHASE 1: Admin Authentication', () => {
    it('should login admin with valid credentials', async () => {
      const { status, data } = await api('POST', '/auth/admin/login', {
        email: 'admin@admin.com',
        password: 'admin123',
      });

      console.log('  📋 Admin login response:', status, data);

      expect(status).toBe(201);
      expect(data).toHaveProperty('access_token');
      expect(data.role).toBe('admin');
      ctx.adminToken = data.access_token as string;
    });

    it('should reject invalid admin credentials', async () => {
      const { status } = await api('POST', '/auth/admin/login', {
        email: 'wrong@admin.com',
        password: 'wrongpass',
      });

      expect(status).toBe(401);
    });
  });

  // ════════════════════════════════════════════════════════════
  // PHASE 2: TEACHER REGISTRATION + OTP VERIFICATION FLOW
  // ════════════════════════════════════════════════════════════

  describe('PHASE 2: Teacher Registration & OTP Flow', () => {
    it('should register a new teacher (sends OTP email)', async () => {
      const { status, data } = await api('POST', '/auth/teacher/register', {
        fullName: 'Dr. E2E Test Teacher',
        email: TEACHER_EMAIL,
        password: TEACHER_PASSWORD,
        department: 'Computer Science',
      });

      console.log('  📋 Teacher register response:', status, data);

      expect(status).toBe(201);
      expect(data.message).toContain('OTP');
    });

    it('should reject duplicate teacher registration', async () => {
      const { status } = await api('POST', '/auth/teacher/register', {
        fullName: 'Dr. Duplicate',
        email: TEACHER_EMAIL,
        password: TEACHER_PASSWORD,
        department: 'Computer Science',
      });

      expect(status).toBe(409);
    });

    it('should reject teacher login BEFORE OTP verification', async () => {
      const { status } = await api('POST', '/auth/teacher/login', {
        email: TEACHER_EMAIL,
        password: TEACHER_PASSWORD,
      });

      console.log('  📋 Login before OTP verify:', status);
      expect(status).toBe(401);
    });

    it('should reject wrong OTP code', async () => {
      const { status } = await api('POST', '/auth/teacher/verify-otp', {
        email: TEACHER_EMAIL,
        otp: '000000',
      });

      expect(status).toBe(401);
    });

    it('should verify OTP with correct code (read from DB)', async () => {
      // Read OTP directly from MongoDB (simulates checking email)
      const otp = await getOtpFromDB(TEACHER_EMAIL);
      console.log(`  🔑 OTP retrieved from DB: ${otp}`);

      const { status, data } = await api('POST', '/auth/teacher/verify-otp', {
        email: TEACHER_EMAIL,
        otp,
      });

      console.log('  📋 OTP verify response:', status, data);

      expect(status).toBe(201);
      expect(data).toHaveProperty('access_token');
      expect(data.role).toBe('teacher');
      ctx.teacherToken = data.access_token as string;
    });

    it('should reject OTP verification for already-verified teacher', async () => {
      const { status } = await api('POST', '/auth/teacher/verify-otp', {
        email: TEACHER_EMAIL,
        otp: '123456',
      });

      expect(status).toBe(400);
    });

    it('should login teacher AFTER verification', async () => {
      const { status, data } = await api('POST', '/auth/teacher/login', {
        email: TEACHER_EMAIL,
        password: TEACHER_PASSWORD,
      });

      console.log('  📋 Teacher login response:', status, data);

      expect(status).toBe(201);
      expect(data).toHaveProperty('access_token');
      expect(data.role).toBe('teacher');
      ctx.teacherToken = data.access_token as string;
    });

    it('should reject teacher login with wrong password', async () => {
      const { status } = await api('POST', '/auth/teacher/login', {
        email: TEACHER_EMAIL,
        password: 'WrongPassword',
      });

      expect(status).toBe(401);
    });
  });

  // ════════════════════════════════════════════════════════════
  // PHASE 3: STUDENT MANAGEMENT + LOGIN
  // ════════════════════════════════════════════════════════════

  describe('PHASE 3: Student CRUD & Authentication', () => {
    it('should create a student (Admin — password auto-hashed from birthday)', async () => {
      const { status, data } = await api(
        'POST',
        '/students',
        {
          fullName: 'Amine E2E Test Student',
          email: 'kalijeogo@gmail.com',
          birthday: STUDENT_BIRTHDAY,
          studentId: STUDENT_ID,
          rfidCode: RFID_CODE,
          qrCode: QR_CODE,
          group: '2A',
          year: 'L2',
          speciality: 'Computer Science',
        },
        ctx.adminToken,
      );

      console.log('  📋 Create student response:', status, data);

      expect(status).toBe(201);
      expect(data).toHaveProperty('_id');
      ctx.studentMongoId = data._id as string;
    });

    it('should login student with studentId + birthday', async () => {
      const { status, data } = await api('POST', '/auth/student/login', {
        studentId: STUDENT_ID,
        password: STUDENT_BIRTHDAY,
      });

      console.log('  📋 Student login response:', status, data);

      expect(status).toBe(201);
      expect(data).toHaveProperty('access_token');
      expect(data.role).toBe('student');
      ctx.studentToken = data.access_token as string;
    });

    it('should reject student login with wrong password', async () => {
      const { status } = await api('POST', '/auth/student/login', {
        studentId: STUDENT_ID,
        password: '99999999',
      });

      expect(status).toBe(401);
    });

    it('should get all students (Admin)', async () => {
      const { status, data } = await api(
        'GET',
        '/students',
        undefined,
        ctx.adminToken,
      );

      expect(status).toBe(200);
      expect(Array.isArray(data)).toBe(true);
    });

    it('should find student by RFID code (simulates RFID scanner)', async () => {
      const { status, data } = await api(
        'GET',
        `/students/rfid/${RFID_CODE}`,
        undefined,
        ctx.adminToken,
      );

      console.log('  📡 RFID scan result:', status, data);

      expect(status).toBe(200);
      expect(data).toHaveProperty('studentId', STUDENT_ID);
      expect(data).toHaveProperty('rfidCode', RFID_CODE);
      expect(data).toHaveProperty('qrCode', QR_CODE);
    });

    it('should reject unknown RFID code', async () => {
      const { status } = await api(
        'GET',
        '/students/rfid/UNKNOWN-RFID-CODE',
        undefined,
        ctx.adminToken,
      );

      expect(status).toBe(404);
    });

    it('should filter students by group & year', async () => {
      const { status, data } = await api(
        'GET',
        '/students?group=2A&year=L2',
        undefined,
        ctx.adminToken,
      );

      expect(status).toBe(200);
      expect(Array.isArray(data)).toBe(true);
    });
  });

  // ════════════════════════════════════════════════════════════
  // PHASE 4: MODULE CRUD
  // ════════════════════════════════════════════════════════════

  describe('PHASE 4: Academic Module Management', () => {
    it('should get the teacher ID for module creation', async () => {
      // Find our test teacher in the DB
      const db = mongoConnection?.connection.db;
      const teacher = await db
        ?.collection('teachers')
        .findOne({ email: TEACHER_EMAIL });
      expect(teacher).toBeTruthy();
      ctx.teacherId = teacher!._id.toString();
      console.log('  🆔 Teacher ID:', ctx.teacherId);
    });

    it('should create an academic module (Admin)', async () => {
      const { status, data } = await api(
        'POST',
        '/modules',
        {
          name: `E2E-NodeJS-${TEST_ID}`,
          teacherId: ctx.teacherId,
          year: 'L2',
        },
        ctx.adminToken,
      );

      console.log('  📋 Create module response:', status, data);

      expect(status).toBe(201);
      expect(data).toHaveProperty('_id');
      ctx.moduleId = data._id as string;
    });

    it('should get all modules', async () => {
      const { status, data } = await api(
        'GET',
        '/modules',
        undefined,
        ctx.adminToken,
      );

      expect(status).toBe(200);
      expect(Array.isArray(data)).toBe(true);
    });

    it('should get module by ID', async () => {
      const { status, data } = await api(
        'GET',
        `/modules/${ctx.moduleId}`,
        undefined,
        ctx.adminToken,
      );

      expect(status).toBe(200);
      expect(data).toHaveProperty('name');
    });

    it('should get modules by teacher ID', async () => {
      const { status, data } = await api(
        'GET',
        `/modules/teacher/${ctx.teacherId}`,
        undefined,
        ctx.adminToken,
      );

      expect(status).toBe(200);
      expect(Array.isArray(data)).toBe(true);
    });
  });

  // ════════════════════════════════════════════════════════════
  // PHASE 5: SCHEDULE CRUD
  // ════════════════════════════════════════════════════════════

  describe('PHASE 5: Schedule Management', () => {
    it('should create a schedule (Admin)', async () => {
      const { status, data } = await api(
        'POST',
        '/schedules',
        {
          teacherId: ctx.teacherId,
          moduleId: ctx.moduleId,
          type: 'td',
          year: 'L2',
          group: '2A',
          dayOfWeek: 'Sunday',
          startTime: '08:00',
          endTime: '09:30',
          room: 'Room A101',
        },
        ctx.adminToken,
      );

      console.log('  📋 Create schedule response:', status, data);

      expect(status).toBe(201);
      expect(data).toHaveProperty('_id');
      ctx.scheduleId = data._id as string;
    });

    it('should get all schedules', async () => {
      const { status, data } = await api(
        'GET',
        '/schedules',
        undefined,
        ctx.adminToken,
      );

      expect(status).toBe(200);
      expect(Array.isArray(data)).toBe(true);
    });

    it('should get schedules by teacher', async () => {
      const { status, data } = await api(
        'GET',
        `/schedules/teacher/${ctx.teacherId}`,
        undefined,
        ctx.adminToken,
      );

      expect(status).toBe(200);
      expect(Array.isArray(data)).toBe(true);
    });
  });

  // ════════════════════════════════════════════════════════════
  // PHASE 6: SESSION LIFECYCLE (planned → active → closed)
  // ════════════════════════════════════════════════════════════

  describe('PHASE 6: Session Lifecycle', () => {
    it('should create a session (Teacher starts class)', async () => {
      const today = new Date().toISOString().split('T')[0];
      const { status, data } = await api(
        'POST',
        '/sessions',
        {
          scheduleId: ctx.scheduleId,
          teacherId: ctx.teacherId,
          moduleId: ctx.moduleId,
          date: today,
          startTime: '08:00',
          endTime: '09:30',
          type: 'td',
          group: '2A',
          status: 'planned',
          isReplacement: false,
        },
        ctx.adminToken,
      );

      console.log('  📋 Create session response:', status, data);

      expect(status).toBe(201);
      expect(data).toHaveProperty('_id');
      ctx.sessionId = data._id as string;
    });

    it('should activate the session (planned → active)', async () => {
      const { status, data } = await api(
        'PATCH',
        `/sessions/${ctx.sessionId}/status`,
        { status: 'active' },
        ctx.adminToken,
      );

      console.log('  📋 Activate session:', status, data);

      expect(status).toBe(200);
      expect(data).toHaveProperty('status', 'active');
    });

    it('should get sessions by date (today)', async () => {
      const today = new Date().toISOString().split('T')[0];
      const { status, data } = await api(
        'GET',
        `/sessions?date=${today}`,
        undefined,
        ctx.adminToken,
      );

      expect(status).toBe(200);
      expect(Array.isArray(data)).toBe(true);
    });
  });

  // ════════════════════════════════════════════════════════════
  // PHASE 7: ATTENDANCE — RFID / QR SCAN SIMULATION
  // ════════════════════════════════════════════════════════════

  describe('PHASE 7: RFID & QR Attendance Scanning', () => {
    it('RFID SCAN: should find student by RFID, then record attendance', async () => {
      // Step 1: Simulate RFID scanner → lookup student
      console.log(`  📡 Simulating RFID scan: ${RFID_CODE}`);
      const lookup = await api(
        'GET',
        `/students/rfid/${RFID_CODE}`,
        undefined,
        ctx.adminToken,
      );

      expect(lookup.status).toBe(200);
      const scannedStudentId = lookup.data._id as string;
      console.log(
        `  ✅ RFID matched student: ${lookup.data.fullName as string} (${lookup.data.studentId as string})`,
      );

      // Step 2: Record attendance for the active session
      const { status, data } = await api(
        'POST',
        '/attendance/scan',
        {
          sessionId: ctx.sessionId,
          studentId: scannedStudentId,
          status: 'present',
        },
        ctx.adminToken,
      );

      console.log('  📋 Attendance recorded:', status, data);

      expect(status).toBe(201);
      expect(data).toHaveProperty('_id');
      expect(data).toHaveProperty('scanTime');
      ctx.attendanceId = data._id as string;
    });

    it('QR SCAN: should simulate QR code attendance (same flow, different lookup)', async () => {
      // In production, QR code scanning would resolve to studentId
      // Here we simulate: QR code → student lookup → attendance
      console.log(`  📱 Simulating QR scan: ${QR_CODE}`);

      // QR code resolves to the same student (via DB lookup in real app)
      // Record a second attendance as "late"
      const { status, data } = await api(
        'POST',
        '/attendance/scan',
        {
          sessionId: ctx.sessionId,
          studentId: ctx.studentMongoId,
          status: 'late',
          scanTime: new Date().toISOString(),
        },
        ctx.adminToken,
      );

      console.log('  📋 QR attendance recorded:', status, data);

      expect(status).toBe(201);
      expect(data).toHaveProperty('status', 'late');
    });

    it('should get all attendance records for the session', async () => {
      const { status, data } = await api(
        'GET',
        `/attendance/session/${ctx.sessionId}`,
        undefined,
        ctx.adminToken,
      );

      console.log(
        '  📋 Session attendance list:',
        status,
        Array.isArray(data) ? `${(data as unknown[]).length} records` : data,
      );

      expect(status).toBe(200);
      expect(Array.isArray(data)).toBe(true);
    });

    it('should get attendance history for the student', async () => {
      const { status, data } = await api(
        'GET',
        `/attendance/student/${ctx.studentMongoId}`,
        undefined,
        ctx.adminToken,
      );

      console.log(
        '  📋 Student attendance history:',
        status,
        Array.isArray(data) ? `${(data as unknown[]).length} records` : data,
      );

      expect(status).toBe(200);
      expect(Array.isArray(data)).toBe(true);
    });

    it('should close the session after attendance is complete', async () => {
      const { status, data } = await api(
        'PATCH',
        `/sessions/${ctx.sessionId}/status`,
        { status: 'closed' },
        ctx.adminToken,
      );

      console.log('  📋 Session closed:', status, data);

      expect(status).toBe(200);
      expect(data).toHaveProperty('status', 'closed');
    });
  });

  // ════════════════════════════════════════════════════════════
  // PHASE 8: ROLE-BASED ACCESS CONTROL
  // ════════════════════════════════════════════════════════════

  describe('PHASE 8: Role-Based Access Control', () => {
    it('should REJECT unauthenticated request', async () => {
      const { status } = await api('GET', '/students');
      expect(status).toBe(401);
    });

    it('should REJECT student trying to create a student (Admin only)', async () => {
      const { status } = await api(
        'POST',
        '/students',
        {
          fullName: 'Hacker Student',
          email: 'hacker@student.dz',
          birthday: '01011990',
          studentId: 'HACK001',
          rfidCode: 'HACK-RFID',
          qrCode: 'HACK-QR',
          group: '1A',
          year: 'L1',
          speciality: 'Hacking',
        },
        ctx.studentToken,
      );

      console.log('  🛡️  Student→CreateStudent blocked:', status);
      expect(status).toBe(403);
    });

    it('should REJECT student trying to delete a session (Admin only)', async () => {
      const { status } = await api(
        'DELETE',
        `/sessions/${ctx.sessionId}`,
        undefined,
        ctx.studentToken,
      );

      console.log('  🛡️  Student→DeleteSession blocked:', status);
      expect(status).toBe(403);
    });

    it('should ALLOW teacher to view modules', async () => {
      const { status } = await api(
        'GET',
        '/modules',
        undefined,
        ctx.teacherToken,
      );

      console.log('  ✅ Teacher→ViewModules allowed:', status);
      expect(status).toBe(200);
    });

    it('should ALLOW student to view their own data', async () => {
      const { status } = await api(
        'GET',
        `/students/${ctx.studentMongoId}`,
        undefined,
        ctx.studentToken,
      );

      console.log('  ✅ Student→ViewSelf allowed:', status);
      expect(status).toBe(200);
    });
  });

  // ════════════════════════════════════════════════════════════
  // PHASE 9: UPDATE & DELETE OPERATIONS
  // ════════════════════════════════════════════════════════════

  describe('PHASE 9: Update & Delete Operations', () => {
    it('should update the student group (Admin)', async () => {
      const { status, data } = await api(
        'PATCH',
        `/students/${ctx.studentMongoId}`,
        { group: '3B' },
        ctx.adminToken,
      );

      expect(status).toBe(200);
      expect(data).toHaveProperty('group', '3B');
    });

    it('should update the module name (Admin)', async () => {
      const { status, data } = await api(
        'PATCH',
        `/modules/${ctx.moduleId}`,
        { name: `E2E-React-${TEST_ID}` },
        ctx.adminToken,
      );

      expect(status).toBe(200);
      expect(data).toHaveProperty('name', `E2E-React-${TEST_ID}`);
    });

    it('should delete the attendance record (Admin)', async () => {
      const { status } = await api(
        'DELETE',
        `/attendance/${ctx.attendanceId}`,
        undefined,
        ctx.adminToken,
      );

      expect(status).toBe(200);
    });

    it('should return 404 for deleted attendance record', async () => {
      const { status } = await api(
        'GET',
        `/attendance/${ctx.attendanceId}`,
        undefined,
        ctx.adminToken,
      );

      expect(status).toBe(404);
    });
  });
});
