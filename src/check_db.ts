import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Attendance } from './attendance/schemas/attendance.schema';
import { Student } from './student/schemas/student.schema';

async function checkData() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const attendanceModel = app.get<Model<any>>(getModelToken(Attendance.name));
  const studentModel = app.get<Model<any>>(getModelToken(Student.name));

  const totalAttendance = await attendanceModel.countDocuments();
  console.log(`Total Attendance Records: ${totalAttendance}`);

  if (totalAttendance > 0) {
    const first = await attendanceModel.findOne();
    console.log('First Attendance Record:', JSON.stringify(first, null, 2));
  }

  const totalStudents = await studentModel.countDocuments();
  console.log(`Total Students: ${totalStudents}`);
  
  const students = await studentModel.find().limit(5);
  students.forEach(s => {
      console.log(`Student: ${s.fullName} | _id: ${s._id} | studentId: ${s.studentId}`);
  });

  await app.close();
}

checkData();
