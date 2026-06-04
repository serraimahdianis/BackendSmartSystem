import { connect, connection } from 'mongoose';
import * as dotenv from 'dotenv';
import {
  TeacherSchema,
  TeacherDocument,
} from './teacher/schemas/teacher.schema';
import {
  StudentSchema,
  StudentDocument,
} from './student/schemas/student.schema';
import { AcademicModuleSchema } from './module/schemas/module.schema';
import { ScheduleSchema } from './schedule/schemas/schedule.schema';
import { SessionSchema } from './session/schemas/session.schema';
import { AttendanceSchema } from './attendance/schemas/attendance.schema';

dotenv.config();

const API_URL = 'http://localhost:3000';

async function apiRequest<T = unknown>(
  method: string,
  endpoint: string,
  body?: Record<string, unknown>,
  token?: string,
): Promise<T> {
  const headers: Record<string, string> = {
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

  const text = await response.text();
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    data = text;
  }

  if (!response.ok) {
    throw new Error(
      `API Error [${method} ${endpoint}]: ${response.status} ${
        typeof data === 'string' ? data : JSON.stringify(data)
      }`,
    );
  }

  return data as T;
}

interface AuthResponse {
  access_token: string;
}

interface ItemResponse {
  _id: string;
  status?: string;
  isReplacement?: boolean;
}

async function seed() {
  const uri = process.env.mongo_uri;
  if (!uri) {
    console.error('❌ No mongo_uri found in .env');
    process.exit(1);
  }

  console.log('🔌 Connecting to MongoDB...');
  await connect(uri);

  const TeacherModel = connection.model<TeacherDocument>(
    'Teacher',
    TeacherSchema,
  );
  const StudentModel = connection.model<StudentDocument>(
    'Student',
    StudentSchema,
  );
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
  const adminLogin = await apiRequest<AuthResponse>(
    'POST',
    '/auth/admin/login',
    {
      email: 'admin@admin.com',
      password: 'admin123',
    },
  );
  const adminToken = adminLogin.access_token;

  // ─── STUDENTS ─────────────────────────────────────────────────────────────
  console.log('👨‍🎓 Admin creating Mock Students...');
  const studentData = [
    // --- Group 2A (L2) ---
    {
      fullName: 'Amine Khelifi',
      birthday: '15031999',
      email: 'student1@student.dz',
      studentId: '1001',
      rfidCode: 'RFID-2A-001',
      group: '2A',
      year: 'L2',
      speciality: 'Computer Science',
    },
    {
      fullName: 'Sara Amrani',
      birthday: '22081999',
      email: 'student2@student.dz',
      studentId: '1002',
      rfidCode: 'RFID-2A-002',
      group: '2A',
      year: 'L2',
      speciality: 'Computer Science',
    },
    {
      fullName: 'Karim Zeggai',
      birthday: '12122000',
      email: 'k.zeggai@student.dz',
      studentId: '1003',
      rfidCode: 'RFID-2A-003',
      group: '2A',
      year: 'L2',
      speciality: 'Computer Science',
    },
    {
      fullName: 'Meriem Bensalah',
      birthday: '05042003',
      email: 'm.bensalah@student.dz',
      studentId: '1004',
      rfidCode: 'RFID-2A-004',
      group: '2A',
      year: 'L2',
      speciality: 'Computer Science',
    },
    {
      fullName: 'Sofiane Touati',
      birthday: '18092002',
      email: 's.touati@student.dz',
      studentId: '1005',
      rfidCode: 'RFID-2A-005',
      group: '2A',
      year: 'L2',
      speciality: 'Computer Science',
    },
    // --- Group 2B (L2) ---
    {
      fullName: 'Youcef Belhadj',
      birthday: '20012003',
      email: 'y.belhadj@student.dz',
      studentId: '1006',
      rfidCode: 'RFID-2B-006',
      group: '2B',
      year: 'L2',
      speciality: 'Computer Science',
    },
    {
      fullName: 'Rania Hammoudi',
      birthday: '14072002',
      email: 'r.hammoudi@student.dz',
      studentId: '1007',
      rfidCode: 'RFID-2B-007',
      group: '2B',
      year: 'L2',
      speciality: 'Computer Science',
    },
    {
      fullName: 'Khaled Mimouni',
      birthday: '30112001',
      email: 'k.mimouni@student.dz',
      studentId: '1008',
      rfidCode: 'RFID-2B-008',
      group: '2B',
      year: 'L2',
      speciality: 'Computer Science',
    },
    {
      fullName: 'Yousra Cheikh',
      birthday: '03022003',
      email: 'y.cheikh@student.dz',
      studentId: '1009',
      rfidCode: 'RFID-2B-009',
      group: '2B',
      year: 'L2',
      speciality: 'Computer Science',
    },
    {
      fullName: 'Oussama Boutaleb',
      birthday: '25052002',
      email: 'o.boutaleb@student.dz',
      studentId: '1010',
      rfidCode: 'RFID-2B-010',
      group: '2B',
      year: 'L2',
      speciality: 'Computer Science',
    },
    // --- Group 01 (M2) ---
    {
      fullName: 'SERRAI MAHDI ANIS',
      birthday: '26062003',
      email: 'm.serrai@univ-setif.dz',
      studentId: '212135055186',
      rfidCode: '0007637223',
      group: '01',
      year: 'M2',
      speciality: 'IDTW',
    },
    {
      fullName: 'Yacine Belkacem',
      birthday: '10102002',
      email: 'y.belkacem@student.dz',
      studentId: '2001',
      rfidCode: 'RFID-01-003',
      group: '01',
      year: 'M2',
      speciality: 'IDTW',
    },
    {
      fullName: 'Lina Mansouri',
      birthday: '05052001',
      email: 'l.mansouri@student.dz',
      studentId: '2002',
      rfidCode: 'RFID-01-004',
      group: '01',
      year: 'M2',
      speciality: 'IDTW',
    },
    {
      fullName: 'Nour El Houda',
      birthday: '01012004',
      email: 'n.houda@student.dz',
      studentId: '2003',
      rfidCode: 'RFID-01-005',
      group: '01',
      year: 'M2',
      speciality: 'IDTW',
    },
    {
      fullName: 'Ryad Merabet',
      birthday: '15082001',
      email: 'r.merabet@student.dz',
      studentId: '2004',
      rfidCode: 'RFID-01-011',
      group: '01',
      year: 'M2',
      speciality: 'IDTW',
    },
    // --- Group 02 (M2) ---
    {
      fullName: 'Selma Ghalem',
      birthday: '12032002',
      email: 's.ghalem@student.dz',
      studentId: '2005',
      rfidCode: 'RFID-02-012',
      group: '02',
      year: 'M2',
      speciality: 'SE',
    },
    {
      fullName: 'Mourad Haddad',
      birthday: '08122001',
      email: 'm.haddad@student.dz',
      studentId: '2006',
      rfidCode: 'RFID-02-013',
      group: '02',
      year: 'M2',
      speciality: 'SE',
    },
    {
      fullName: 'Feriel Chaib',
      birthday: '19062002',
      email: 'f.chaib@student.dz',
      studentId: '2007',
      rfidCode: 'RFID-02-014',
      group: '02',
      year: 'M2',
      speciality: 'SE',
    },
    {
      fullName: 'Zaki Bensenouci',
      birthday: '22102001',
      email: 'z.bensenouci@student.dz',
      studentId: '2008',
      rfidCode: 'RFID-02-015',
      group: '02',
      year: 'M2',
      speciality: 'SE',
    },
    {
      fullName: 'Ines Madani',
      birthday: '04042002',
      email: 'i.madani@student.dz',
      studentId: '2009',
      rfidCode: 'RFID-02-016',
      group: '02',
      year: 'M2',
      speciality: 'SE',
    },
  ];

  const studentObjIds: string[] = [];
  for (let i = 0; i < studentData.length; i++) {
    const s = studentData[i];
    const studentResponse = await apiRequest<ItemResponse>(
      'POST',
      '/students',
      {
        fullName: s.fullName,
        email: s.email,
        birthday: s.birthday,
        studentId: s.studentId,
        rfidCode: s.rfidCode,
        qrCode: `QR-${s.group}-${String(i + 1).padStart(3, '0')}`,
        group: s.group,
        year: s.year,
        speciality: s.speciality,
      },
      adminToken,
    );
    studentObjIds.push(studentResponse._id);
  }

  // ─── TEACHERS ────────────────────────────────────────────────────────────
  console.log('👨‍🏫 Registering Teachers...');

  const teachers = [
    {
      fullName: 'Prof. Dr. Amine Khelifi',
      email: 'a.khelifi@univ-setif.dz',
      department: 'Computer Science',
    },
    {
      fullName: 'Prof. Dr. Ahmed Bouzid',
      email: 'ahmed.bouzid@gmail.com',
      department: 'Software Engineering',
    },
    {
      fullName: 'Dr. Mohamed Larbi',
      email: 'm.larbi@univ-setif.dz',
      department: 'Mathematics',
    },
  ];

  const teacherTokens: string[] = [];
  const teacherIds: string[] = [];

  for (const t of teachers) {
    console.log(`📝 Registering ${t.fullName}...`);
    await apiRequest<unknown>('POST', '/auth/teacher/register', {
      ...t,
      password: 'password123',
    });

    console.log(`🔍 Fetching OTP for ${t.email}...`);
    const doc = await TeacherModel.findOne({ email: t.email })
      .select('+otp')
      .exec();
    if (!doc || !doc.otp) throw new Error(`OTP not found for ${t.email}`);

    console.log(`✅ Verifying OTP ${doc.otp} for ${t.email}...`);
    const verifyRes = await apiRequest<AuthResponse>(
      'POST',
      '/auth/teacher/verify-otp',
      {
        email: t.email,
        otp: doc.otp,
      },
    );
    teacherTokens.push(verifyRes.access_token);

    const payload = JSON.parse(
      Buffer.from(verifyRes.access_token.split('.')[1], 'base64').toString(),
    ) as { sub: string };
    teacherIds.push(payload.sub);
  }

  // ─── MODULES ──────────────────────────────────────────────────────────────
  console.log('📚 Creating Modules...');
  const modulesData = [
    { name: 'Web Development', teacherId: teacherIds[0], year: 'L2' },
    { name: 'Database Systems', teacherId: teacherIds[0], year: 'L2' },
    { name: 'Mobile Development', teacherId: teacherIds[1], year: 'M2' },
    { name: 'Deep Learning', teacherId: teacherIds[1], year: 'M2' },
    { name: 'Advanced Calculus', teacherId: teacherIds[2], year: 'L2' },
  ];

  const moduleObjIds: string[] = [];
  for (let i = 0; i < modulesData.length; i++) {
    const m = modulesData[i];
    const tIndex = teacherIds.indexOf(m.teacherId);
    const res = await apiRequest<ItemResponse>(
      'POST',
      '/modules',
      m,
      teacherTokens[tIndex],
    );
    moduleObjIds.push(res._id);
  }

  // ─── SCHEDULE ────────────────────────────────────────────────────────────
  console.log('📅 Creating Schedules...');
  const today = new Date();
  const days = [
    'Sunday',
    'Monday',
    'Tuesday',
    'Wednesday',
    'Thursday',
    'Friday',
    'Saturday',
  ];
  const todayDayName = days[today.getDay()];

  const schedulesData = [
    {
      teacherId: teacherIds[0],
      moduleId: moduleObjIds[0],
      type: 'cours',
      year: 'L2',
      group: 'Whole Year',
      dayOfWeek: todayDayName,
      startTime: '08:00',
      endTime: '09:30',
      room: 'Amphi A',
    },
    {
      teacherId: teacherIds[0],
      moduleId: moduleObjIds[1],
      type: 'td',
      year: 'L2',
      group: '2A',
      dayOfWeek: todayDayName,
      startTime: '09:45',
      endTime: '11:15',
      room: 'Lab 01',
    },
    {
      teacherId: teacherIds[1],
      moduleId: moduleObjIds[2],
      type: 'td',
      year: 'M2',
      group: '01',
      dayOfWeek: todayDayName,
      startTime: '10:00',
      endTime: '11:30',
      room: 'Lab 05',
    },
    {
      teacherId: teacherIds[1],
      moduleId: moduleObjIds[3],
      type: 'cours',
      year: 'M2',
      group: 'Whole Year',
      dayOfWeek: todayDayName,
      startTime: '11:45',
      endTime: '13:15',
      room: 'Amphi C',
    },
    {
      teacherId: teacherIds[2],
      moduleId: moduleObjIds[4],
      type: 'cours',
      year: 'L2',
      group: 'Whole Year',
      dayOfWeek: todayDayName,
      startTime: '13:00',
      endTime: '14:30',
      room: 'Amphi B',
    },
    {
      teacherId: teacherIds[2],
      moduleId: moduleObjIds[4],
      type: 'td',
      year: 'L2',
      group: '2B',
      dayOfWeek: todayDayName,
      startTime: '14:45',
      endTime: '16:15',
      room: 'Room 12',
    },
  ];

  const scheduleObjIds: string[] = [];
  for (const s of schedulesData) {
    const tIndex = teacherIds.indexOf(s.teacherId);
    const res = await apiRequest<ItemResponse>(
      'POST',
      '/schedules',
      s,
      teacherTokens[tIndex],
    );
    scheduleObjIds.push(res._id);
  }

  // ─── SESSIONS & ATTENDANCE ───────────────────────────────────────────────
  console.log('🚀 Running Session Life Cycles for Today...');

  for (let i = 0; i < scheduleObjIds.length; i++) {
    const schId = scheduleObjIds[i];
    const sData = schedulesData[i];
    const tIndex = teacherIds.indexOf(sData.teacherId);
    const token = teacherTokens[tIndex];

    console.log(`▶️ Starting session for schedule ${schId} (${sData.room})...`);
    const session = await apiRequest<ItemResponse>(
      'POST',
      `/sessions/start/${schId}`,
      undefined,
      token,
    );

    console.log('📡 Scanning students...');
    for (let j = 0; j < studentObjIds.length; j++) {
      const sid = studentObjIds[j];
      if (studentData[j].year !== sData.year) continue;
      if (sData.group !== 'Whole Year' && studentData[j].group !== sData.group)
        continue;
      const roll = Math.random();
      const status = roll < 0.7 ? 'present' : roll < 0.9 ? 'late' : 'absent';
      await apiRequest<unknown>(
        'POST',
        '/attendance/scan',
        {
          sessionId: session._id,
          studentId: sid,
          status,
        },
        token,
      );
    }

    console.log('🛑 Ending session...');
    await apiRequest<unknown>(
      'POST',
      `/sessions/${session._id}/end`,
      undefined,
      token,
    );
  }

  // ─── HISTORICAL DATA (LAST 30 DAYS) ─────────────────────────────────────
  console.log('⏳ Creating historical data (last 30 days)...');
  const formatDate = (date: Date) => date.toISOString().split('T')[0];

  for (let d = 1; d <= 30; d++) {
    const date = new Date();
    date.setDate(today.getDate() - d);
    if (date.getDay() === 5 || date.getDay() === 6) continue; // Skip Friday/Saturday (weekend)

    // Find a schedule for this day or just use one
    const sData = schedulesData[d % schedulesData.length];
    const tIndex = teacherIds.indexOf(sData.teacherId);
    const token = teacherTokens[tIndex];

    const historicalSession = await apiRequest<ItemResponse>(
      'POST',
      '/sessions',
      {
        teacherId: sData.teacherId,
        moduleId: sData.moduleId,
        date: formatDate(date),
        startTime: sData.startTime,
        endTime: sData.endTime,
        type: sData.type,
        group: sData.group,
        status: 'active',
      },
      token,
    );

    for (let j = 0; j < studentObjIds.length; j++) {
      const sid = studentObjIds[j];
      if (studentData[j].year !== sData.year) continue;
      if (sData.group !== 'Whole Year' && studentData[j].group !== sData.group)
        continue;
      const roll = Math.random();
      // Most students are present in history
      const status = roll < 0.85 ? 'present' : roll < 0.95 ? 'late' : 'absent';
      await apiRequest<unknown>(
        'POST',
        '/attendance/scan',
        {
          sessionId: historicalSession._id,
          studentId: sid,
          status,
        },
        token,
      );
    }

    // End the historical session
    await apiRequest<unknown>(
      'POST',
      `/sessions/${historicalSession._id}/end`,
      undefined,
      token,
    );
  }

  console.log('\n====================================');
  console.log('🎉 Seeding completed successfully!');
  console.log('====================================');
  console.log('\n--- Seeded Credentials ---');
  console.log('Admin: admin@admin.com / admin123');
  teachers.forEach((t) => {
    console.log(`Teacher: ${t.email} / password123`);
  });
  studentData.forEach((s, index) => {
    console.log(
      `Student: ${s.fullName} | ID: ${s.studentId} | Password: ${s.birthday} | MongoID: ${studentObjIds[index]}`,
    );
  });
  console.log('====================================');

  await connection.close();
}

seed().catch((err) => {
  console.error('❌ Seeding failed:', err);
  process.exit(1);
});
