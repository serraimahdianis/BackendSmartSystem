# 🗂️ Professional Database Design (Revised)
> Version 2.0 - Decoupled Architecture (No Base User)

This is the completely rebuilt, professional database schema for the Smart Attendance System. We have successfully **removed the base `User` object**. Teachers and Students are now completely independent collections, making the system faster and much easier to manage.

---

## 👨‍🏫 1. Teachers
The Teacher is a standalone collection. They sign up via the app or web.
**Rule:** The email *must* be a university email (e.g., `@univ-setif.dz`).

```json
{
  "_id": "ObjectId",
  "fullName": "string",
  "email": "string",                  // MUST match regex: /@univ-[a-zA-Z0-9-]+\.dz$/
  "password": "string (hashed)",
  "faceImage": "string (URL)",        // Image of the teacher's face
  "department": "string",             // e.g., "Computer Science"
  "createdAt": "date",
  "updatedAt": "date"
}
```

---

## 👨‍🎓 2. Students
The Student is also a standalone collection with all necessary data integrated.

```json
{
  "_id": "ObjectId",
  "fullName": "string",
  "email": "string",                  // Student email
  "password": "string (hashed)",      // For student app login
  "studentId": "string",              // e.g., "ST1001" (University ID)
  "rfidCode": "string",               // Unique RFID card code
  "qrCode": "string",                 // Fallback QR Code
  "faceImage": "string (URL)",        // Image of the student's face
  "group": "string",                  // e.g., "2A"
  "year": "string",                   // e.g., "L2"
  "speciality": "string",             // e.g., "Computer Science",
  "createdAt": "date",
  "updatedAt": "date"
}
```

---

## 📚 3. Modules (Subjects)
The subjects taught by the teachers.

```json
{
  "_id": "ObjectId",
  "name": "string",                   // e.g., "NodeJS"
  "teacherId": "ObjectId (ref Teacher)",
  "year": "string",                   // e.g., "L2"
  "createdAt": "date"
}
```

---

## 📅 4. Schedule (Fixed Weekly Timetable)
**Rule:** The teacher defines their days in the week. These are **fixed and cannot be changed** until the end of the year.

```json
{
  "_id": "ObjectId",
  "teacherId": "ObjectId (ref Teacher)",
  "moduleId": "ObjectId (ref Module)",
  "type": "cours | td | tp",
  "year": "L1 | L2 | L3 | M1 | M2",
  "group": "string",                  // e.g., "2A" (Null if "cours" for whole year)
  "dayOfWeek": "string",              // e.g., "Sunday", "Monday", "Saturday"
  "startTime": "string",              // e.g., "08:00"
  "endTime": "string",                // e.g., "09:30"
  "room": "string"
}
```

---

## ⏱️ 5. Sessions (The Actual Class)
Generated automatically from the `Schedule`, OR created manually *only* for replacement sessions.
**Rule:** The session remains open until the end of the class.

```json
{
  "_id": "ObjectId",
  "scheduleId": "ObjectId (ref Schedule)", // NULL if it's a replacement session
  "teacherId": "ObjectId (ref Teacher)",
  "moduleId": "ObjectId (ref Module)",
  "date": "date",                     // The specific date of the class
  "startTime": "string",              // e.g., "08:00"
  "endTime": "string",                // e.g., "09:30"
  "type": "cours | td | tp",
  "group": "string",
  "status": "planned | active | closed", // Remains "active" until the class finishes
  
  // 🔄 Replacement Class Logic (حصة تعويضية)
  // This is the ONLY time a teacher can pick a random day outside their fixed schedule
  "isReplacement": "boolean",         // true if this is a makeup class
  "reasonForReplacement": "string"    // e.g., "Teacher was sick on Sunday"
}
```

---

## ✅ 6. Attendance (The Scanning Result)
When a student scans their RFID card, a record is created here.
**Rule:** If a student does not scan by the time the session is `closed`, they are considered `absent`.

```json
{
  "_id": "ObjectId",
  "sessionId": "ObjectId (ref Session)",
  "studentId": "ObjectId (ref Student)",
  "status": "present | late | absent",
  "scanTime": "date"                  // Exact timestamp when the card was swiped
}
```

---

### 🧠 System Workflow Summary (كيف يعمل النظام الآن)

1. **Teacher Registration:** Teacher registers with their face image and `@univ-setif.dz` email.
2. **Fixed Schedule:** The teacher sets their weekly schedule (e.g., every Sunday and Monday). This locks in for the year.
3. **Replacement Classes (الحصة التعويضية):** If the teacher misses a class, they can create a special `Session` where `isReplacement = true` for one specific day only.
4. **The Open Session:** When the class time starts, the session is created and marked as `active`. It stays open until the `endTime` is reached.
5. **Student Scanning:** Students scan their RFID. If they scan early or on time, status = `present`. If they scan after the allowed threshold, status = `late`.
6. **Automatic Absence:** When the session closes, any student in the group who does not have a `present` or `late` record is automatically assigned an `absent` record.
