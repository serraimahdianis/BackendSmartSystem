import { connect, connection, Types } from 'mongoose';
import * as dotenv from 'dotenv';
import { TeacherSchema, TeacherDocument } from './teacher/schemas/teacher.schema';
import { StudentSchema, StudentDocument } from './student/schemas/student.schema';
import { AcademicModuleSchema } from './module/schemas/module.schema';
import { ScheduleSchema } from './schedule/schemas/schedule.schema';
import { SessionSchema } from './session/schemas/session.schema';
import { AttendanceSchema } from './attendance/schemas/attendance.schema';

dotenv.config();

const API_URL = 'http://localhost:3000';

async function apiRequest(method: string, endpoint: string, body?: any, token?: string) {
  const headers: any = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_URL}${endpoint}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  let data;
  const text = await response.text();
  try {
    data = JSON.parse(text);
  } catch {
    data = text;
  }

  if (!response.ok) {
    throw new Error(`API Error [${method} ${endpoint}]: ${response.status} ${JSON.stringify(data)}`);
  }
  
  return data;
}

async function seed() {
  const uri = process.env.mongo_uri;
  if (!uri) {
    console.error('❌ No mongo_uri found in .env');
    process.exit(1);
  }

  console.log('🔌 Connecting to MongoDB...');
  await connect(uri);

  const TeacherModel = connection.model<TeacherDocument>('Teacher', TeacherSchema);
  const StudentModel = connection.model<StudentDocument>('Student', StudentSchema);
  const ModuleModel = connection.model('AcademicModule', AcademicModuleSchema);
  const ScheduleModel = connection.model('Schedule', ScheduleSchema);
  const SessionModel = connection.model('Session', SessionSchema);
  const AttendanceModel = connection.model('Attendance', AttendanceSchema);

  console.log('🗑️  Clearing existing data...');
  await Promise.all([
    TeacherModel.deleteMany({}),
    StudentModel.deleteMany({}),
    ModuleModel.deleteMany({}),
    ScheduleModel.deleteMany({}),
    SessionModel.deleteMany({}),
    AttendanceModel.deleteMany({}),
  ]);

  console.log('🔑 Logging in as Admin...');
  const adminLogin = await apiRequest('POST', '/auth/admin/login', {
    email: 'admin@admin.com',
    password: 'admin123'
  });
  const adminToken = adminLogin.access_token;

  // ─── STUDENTS ─────────────────────────────────────────────────────────────
  console.log('👨‍🎓 Creating 10 Mock Students via API...');
  const studentIds: string[] = [];
  const studentData = [
    { fullName: 'Amine Khelifi', birthday: '15031999' },
    { fullName: 'Sara Amrani', birthday: '22081999' },
    { fullName: 'Youssef Benali', birthday: '05112000' },
    { fullName: 'Nadia Zouaoui', birthday: '30062001' },
    { fullName: 'Karim Hadj', birthday: '18012000' },
    { fullName: 'Lina Boukhalfa', birthday: '09092001' },
    { fullName: 'Omar Tlemcani', birthday: '27042000' },
    { fullName: 'Rania Ferhat', birthday: '14122000' },
    { fullName: 'Bilal Meziane', birthday: '02032001' },
    { fullName: 'Amel Djoudi', birthday: '11072001' },
  ];

  for (let i = 0; i < 10; i++) {
    const { fullName, birthday } = studentData[i];
    const studentResponse = await apiRequest('POST', '/students', {
      fullName,
      email: `student${i + 1}@student.dz`,
      birthday,
      studentId: `ST100${i + 1}`,
      rfidCode: `RFID-2A-${String(i + 1).padStart(3, '0')}`,
      qrCode: `QR-2A-${String(i + 1).padStart(3, '0')}`,
      group: '2A',
      year: 'L2',
      speciality: 'Computer Science',
    }, adminToken);
    studentIds.push(studentResponse._id);
  }

  // ─── TEACHER ──────────────────────────────────────────────────────────────
  console.log('👨‍🏫 Registering Test Teacher via API...');
  const testEmail = 't.test@univ-setif.dz';
  const testPassword = 'password123';
  await apiRequest('POST', '/auth/teacher/register', {
    fullName: 'Dr. Test Teacher',
    email: testEmail,
    password: testPassword,
    department: 'Computer Science',
  });

  console.log('🔍 Fetching OTP from Database...');
  const teacherDoc = await TeacherModel.findOne({ email: testEmail }).select('+otp').exec();
  if (!teacherDoc || !teacherDoc.otp) {
    throw new Error('Failed to retrieve OTP from database');
  }

  console.log(`✅ Verifying OTP (${teacherDoc.otp})...`);
  const verifyRes = await apiRequest('POST', '/auth/teacher/verify-otp', {
    email: testEmail,
    otp: teacherDoc.otp,
  });

  console.log('🔑 Extracting Teacher ID from Token...');
  const teacherToken = verifyRes.access_token;
  const tokenPayload = JSON.parse(Buffer.from(teacherToken.split('.')[1], 'base64').toString());
  const teacherId = tokenPayload.sub;

  // ─── MODULES ──────────────────────────────────────────────────────────────
  console.log('📚 Creating Modules via API...');
  const webModule = await apiRequest('POST', '/modules', {
    name: 'Web Development',
    teacherId,
    year: 'L2',
  }, teacherToken);

  const mobileModule = await apiRequest('POST', '/modules', {
    name: 'Mobile Development',
    teacherId,
    year: 'L2',
  }, teacherToken);

  // ─── SCHEDULES ────────────────────────────────────────────────────────────
  console.log('📅 Creating Schedules via API...');
  const webCours = await apiRequest('POST', '/schedules', {
    teacherId,
    moduleId: webModule._id,
    type: 'cours',
    year: 'L2',
    group: 'Whole Year',
    dayOfWeek: 'Sunday',
    startTime: '08:00',
    endTime: '09:30',
    room: 'Amphi A',
  }, teacherToken);

  const webTd = await apiRequest('POST', '/schedules', {
    teacherId,
    moduleId: webModule._id,
    type: 'td',
    year: 'L2',
    group: '2A',
    dayOfWeek: 'Sunday',
    startTime: '09:45',
    endTime: '11:15',
    room: 'Room 101',
  }, teacherToken);

  await apiRequest('POST', '/schedules', {
    teacherId,
    moduleId: mobileModule._id,
    type: 'td',
    year: 'L2',
    group: '2A',
    dayOfWeek: 'Monday',
    startTime: '13:00',
    endTime: '14:30',
    room: 'Room 204',
  }, teacherToken);

  await apiRequest('POST', '/schedules', {
    teacherId,
    moduleId: mobileModule._id,
    type: 'tp',
    year: 'L2',
    group: '2A',
    dayOfWeek: 'Wednesday',
    startTime: '10:00',
    endTime: '11:30',
    room: 'Lab 02',
  }, teacherToken);

  // ─── SESSIONS ─────────────────────────────────────────────────────────────
  console.log('⏱️  Creating Sessions via API...');
  const today = new Date();
  const yesterday = new Date(); yesterday.setDate(today.getDate() - 1);
  const twoDaysAgo = new Date(); twoDaysAgo.setDate(today.getDate() - 2);
  const tomorrow = new Date(); tomorrow.setDate(today.getDate() + 1);
  const dayAfter = new Date(); dayAfter.setDate(today.getDate() + 2);

  const formatDate = (date: Date) => date.toISOString().split('T')[0];

  const closedSession = await apiRequest('POST', '/sessions', {
    scheduleId: webCours._id,
    teacherId,
    moduleId: webModule._id,
    date: formatDate(yesterday),
    startTime: '08:00',
    endTime: '09:30',
    type: 'cours',
    group: 'Whole Year',
    status: 'closed',
    isReplacement: false,
  }, teacherToken);

  const closedSession2 = await apiRequest('POST', '/sessions', {
    scheduleId: webTd._id,
    teacherId,
    moduleId: webModule._id,
    date: formatDate(twoDaysAgo),
    startTime: '09:45',
    endTime: '11:15',
    type: 'td',
    group: '2A',
    status: 'closed',
    isReplacement: false,
  }, teacherToken);

  const activeSession = await apiRequest('POST', '/sessions', {
    scheduleId: webTd._id,
    teacherId,
    moduleId: webModule._id,
    date: formatDate(today),
    startTime: '09:45',
    endTime: '11:15',
    type: 'td',
    group: '2A',
    status: 'active',
    isReplacement: false,
  }, teacherToken);

  await apiRequest('POST', '/sessions', {
    scheduleId: webCours._id,
    teacherId,
    moduleId: webModule._id,
    date: formatDate(tomorrow),
    startTime: '08:00',
    endTime: '09:30',
    type: 'cours',
    group: 'Whole Year',
    status: 'planned',
    isReplacement: false,
  }, teacherToken);

  await apiRequest('POST', '/sessions', {
    teacherId,
    moduleId: mobileModule._id,
    date: formatDate(dayAfter),
    startTime: '13:00',
    endTime: '14:30',
    type: 'td',
    group: '2A',
    status: 'planned',
    isReplacement: true,
    reasonForReplacement: 'Teacher was sick last Monday',
  }, teacherToken);

  // ─── ATTENDANCE ───────────────────────────────────────────────────────────
  console.log('✅ Creating Attendance Records via API...');

  // Closed session 1 — mostly present
  for (let i = 0; i < studentIds.length; i++) {
    const roll = Math.random();
    const status = roll < 0.6 ? 'present' : roll < 0.8 ? 'late' : 'absent';
    await apiRequest('POST', '/attendance/scan', {
      sessionId: closedSession._id,
      studentId: studentIds[i],
      status,
      ...(status !== 'absent' && { scanTime: yesterday.toISOString() }),
    }, teacherToken);
  }

  // Closed session 2 — mixed
  for (let i = 0; i < studentIds.length; i++) {
    const roll = Math.random();
    const status = roll < 0.5 ? 'present' : roll < 0.75 ? 'late' : 'absent';
    await apiRequest('POST', '/attendance/scan', {
      sessionId: closedSession2._id,
      studentId: studentIds[i],
      status,
      ...(status !== 'absent' && { scanTime: twoDaysAgo.toISOString() }),
    }, teacherToken);
  }

  // Active session — only first 6 students have scanned so far
  for (let i = 0; i < 6; i++) {
    await apiRequest('POST', '/attendance/scan', {
      sessionId: activeSession._id,
      studentId: studentIds[i],
      status: i < 4 ? 'present' : 'late',
      scanTime: today.toISOString(),
    }, teacherToken);
  }

  // ─── DONE ─────────────────────────────────────────────────────────────────
  console.log('\n====================================');
  console.log('✅ API Seeding completed successfully!');
  console.log('====================================');
  console.log('\n📋 SEED DATA SUMMARY:');
  console.log('────────────────────────────────────');
  console.log('👨‍🏫 TEACHER LOGIN:');
  console.log('   Email:    t.test@univ-setif.dz');
  console.log('   Password: password123');
  console.log('────────────────────────────────────');
  console.log('👨‍🎓 STUDENTS (10 total):');
  console.log('   Year: L2 | Group: 2A | Speciality: Computer Science');
  console.log('   Passwords: each student\'s birthday (e.g. 15031999)');
  console.log('────────────────────────────────────');
  console.log('📚 MODULES: Web Development, Mobile Development');
  console.log('📅 SCHEDULES: 4 (Sun, Sun, Mon, Wed)');
  console.log('⏱️  SESSIONS:');
  console.log('   - 2 × closed (past)');
  console.log('   - 1 × active (TODAY — 6/10 students scanned)');
  console.log('   - 2 × planned (future)');
  console.log('✅ ATTENDANCE: Full records for closed sessions');
  console.log('====================================\n');

  await connection.close();
}

seed().catch((err) => {
  console.error('❌ Seeding failed:', err);
  process.exit(1);
});
