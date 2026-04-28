# Database Entity Relationship Diagram

You can copy and paste the code block below into any Mermaid visualizer (like [Mermaid Live Editor](https://mermaid.live/)) to see a visual relationship chart of your database.

```mermaid
erDiagram
    Teacher ||--o{ Module : "teaches"
    Teacher ||--o{ Schedule : "creates"
    Teacher ||--o{ Session : "manages"
    Module ||--o{ Schedule : "has"
    Schedule ||--o{ Session : "generates"
    Session ||--o{ Attendance : "records"
    Student ||--o{ Attendance : "has"

    Teacher {
        ObjectId _id PK
        string fullName
        string email "Must be @univ-setif.dz"
        string password "hashed"
        string faceImage "URL"
        string department
        date createdAt
    }
    
    Student {
        ObjectId _id PK
        string fullName
        string email
        string password "hashed"
        string studentId "ST1001"
        string rfidCode "Unique"
        string qrCode "Unique"
        string faceImage "URL"
        string group
        string year
        string speciality
    }
    
    Module {
        ObjectId _id PK
        string name "e.g., NodeJS"
        ObjectId teacherId FK
        string year
    }
    
    Schedule {
        ObjectId _id PK
        ObjectId teacherId FK
        ObjectId moduleId FK
        string type "cours/td/tp"
        string year
        string group
        string dayOfWeek "e.g., Sunday"
        string startTime "HH:MM"
        string endTime "HH:MM"
        string room
    }
    
    Session {
        ObjectId _id PK
        ObjectId scheduleId FK
        ObjectId teacherId FK
        ObjectId moduleId FK
        date date
        string startTime "HH:MM"
        string endTime "HH:MM"
        string status "planned/active/closed"
        boolean isReplacement
        string reasonForReplacement
    }
    
    Attendance {
        ObjectId _id PK
        ObjectId sessionId FK
        ObjectId studentId FK
        string status "present/late/absent"
        date scanTime
    }
```
