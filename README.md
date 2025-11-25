# 🎓 Real-Time Face Recognition Attendance System

A modern, AI-powered attendance management system using facial recognition technology. Built with FastAPI, React, and InsightFace for accurate real-time face detection and recognition.

## ✨ Features

### 🔐 Authentication & Authorization
- **Google OAuth 2.0 Integration** - Secure login with institutional email (@bitsathy.ac.in)
- **Role-Based Access Control** - Separate dashboards for students and administrators
- **JWT Token Authentication** - Secure API access with token-based auth
- **Auto-Role Assignment** - Automatic role detection based on email domain

### 👤 Face Recognition
- **Real-Time Detection** - Live face detection and recognition via webcam/IP cameras
- **GPU Acceleration** - CUDA-optimized for faster processing (SCRFD-10G detector)
- **High Accuracy** - InsightFace (buffalo_l model) with configurable thresholds
- **Multi-Face Detection** - Detect and recognize multiple faces simultaneously
- **CPU Fallback** - Automatic fallback to CPU if GPU unavailable
- **Annotated Frames** - Visual bounding boxes with roll numbers on detected faces

### 📊 Attendance Management
- **Automated Marking** - Auto-mark attendance on face recognition
- **Manual Entry** - Admin can manually mark attendance
- **Duplicate Prevention** - Configurable cooldown period (5 minutes default)
- **Comprehensive Records** - View, filter, and export attendance data (CSV export)
- **Multiple Cameras** - Support for multiple camera feeds with RTSP/webcam
- **Statistics Dashboard** - Real-time attendance analytics and insights

### 🎯 Student Management
- **Complete CRUD Operations** - Add, edit, view, and delete student records
- **Multiple Photos** - Upload up to 10 photos per student for better recognition
- **Department Organization** - Organize students by department
- **Roll Number Linking** - Automatic linking with Google account
- **Cascade Deletion** - Safely delete students with related attendance/messages cleanup

### 📹 Camera Management & Live Monitoring
- **Multiple Camera Support** - Add webcams, IP cameras, and RTSP streams
- **Camera Configuration** - Set name, location, and resolution for each camera
- **Edit Camera Details** - Update camera metadata (name, location, resolution)
- **Resolution Presets** - Select from VGA, 720p, 1080p, 1440p, or 4K resolutions
- **Real-Time Recognition** - Live video feed with face recognition overlay
- **Visual Feedback** - Green boxes for recognized students, red for unknown faces
- **Confidence Scores** - Display detection confidence and similarity scores
- **Frame Processing** - Optimized frame processing every second with error handling

### 💬 Messaging System
- **Student-to-Admin Messaging** - Students can send queries and messages
- **Admin Replies** - Admins can reply directly to student messages
- **Message Status Tracking** - Read/unread indicators and reply status
- **Message Deletion** - Both students and admins can delete messages
- **Filter Options** - Filter by all, read, or unread messages (admin view)
- **Real-Time Updates** - Auto-refresh every 30 seconds for new messages

## 🏗️ Architecture

### Backend (FastAPI)
```
backend/
├── app/
│   ├── main.py                    # FastAPI application entry point
│   ├── config.py                  # Configuration loader
│   ├── api/v1/
│   │   ├── api.py                 # API router aggregator
│   │   └── endpoints/
│   │       ├── auth.py            # Authentication endpoints
│   │       ├── google_auth.py     # Google OAuth endpoints
│   │       ├── students.py        # Student management
│   │       ├── attendance.py      # Attendance operations
│   │       ├── cameras.py         # Camera management
│   │       ├── recognition.py     # Face recognition
│   │       ├── livestream.py      # WebSocket streaming
│   │       ├── dashboard.py       # Dashboard statistics
│   │       └── messages.py        # Messaging system
│   └── services/
│       ├── auth_service.py        # JWT & Google auth logic
│       ├── database.py            # SQLAlchemy models
│       ├── recognition_service.py # Face recognition engine
│       ├── training_service.py    # Model training service
│       └── live_stream_service.py # WebSocket streaming service
├── config.yaml                    # System configuration
├── requirements.txt               # Python dependencies
└── models/buffalo_l/              # InsightFace models
```

### Frontend (React + Vite)
```
frontend/
├── src/
│   ├── main.jsx                   # React entry point
│   ├── App.jsx                    # Main app component
│   ├── auth.js                    # Authentication utilities
│   ├── api.js                     # API client
│   ├── pages/
│   │   └── HomePage.jsx           # Login page
│   └── components/
│       ├── AdminDashboard.jsx     # Admin main dashboard
│       ├── StudentDashboard.jsx   # Student dashboard
│       ├── StudentsManagement.jsx # Student CRUD operations
│       ├── AttendanceManagement.jsx # Attendance records
│       ├── CamerasManagement.jsx  # Camera configuration
│       ├── LiveMonitoring.jsx     # Live recognition feed
│       ├── Messaging.jsx          # Communication hub
│       └── UserManagement.jsx     # User role management
├── package.json
└── vite.config.js
```

## 🚀 Getting Started

### Prerequisites
- **Python 3.8+** (Recommended: 3.9-3.11)
- **Node.js 16+** and npm
- **CUDA Toolkit 11.x** (Optional, for GPU acceleration)
- **Google Cloud Project** with OAuth 2.0 credentials
- **Webcam** or IP camera for live recognition

### Installation

#### 1. Clone the Repository
```bash
git clone https://github.com/Thiyanesh07/Attendance_System.git
cd Attendance_System
```

#### 2. Backend Setup

**Install Dependencies:**
```bash
cd backend
pip install -r requirements.txt
```

**Configure Environment:**
Create `backend/.env` file:
```env
SECRET_KEY=your-secret-key-here-generate-with-openssl
GOOGLE_CLIENT_ID=your-google-oauth-client-id.apps.googleusercontent.com
DATABASE_URL=sqlite:///./sql_app.db
```

Generate a secret key:
```bash
openssl rand -hex 32
```

**Configure System Settings:**
Edit `backend/config.yaml` to customize:
- Face recognition thresholds
- Detection resolution
- Attendance cooldown period
- Camera settings
- Database path
- API CORS origins

**Initialize Database:**
```bash
python migrate_database.py
```

**Setup Admin Users:**
```bash
python setup_admin.py
```

**Download Face Recognition Models:**
Models are automatically downloaded on first run. Ensure internet connection for initial setup.

#### 3. Frontend Setup

**Install Dependencies:**
```bash
cd frontend
npm install
```

**Configure Environment:**
Create `frontend/.env` file:
```env
VITE_GOOGLE_CLIENT_ID=your-google-oauth-client-id.apps.googleusercontent.com
VITE_API_BASE_URL=http://localhost:8000
```

#### 4. Google OAuth Setup

1. **Create Google Cloud Project:**
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Create a new project or select existing

2. **Enable APIs:**
   - Navigate to "APIs & Services" → "Library"
   - Enable "Google+ API"

3. **Configure OAuth Consent Screen:**
   - Go to "APIs & Services" → "OAuth consent screen"
   - Select "Internal" or "External"
   - Add authorized domain: `bitsathy.ac.in`

4. **Create OAuth 2.0 Credentials:**
   - Go to "APIs & Services" → "Credentials"
   - Click "Create Credentials" → "OAuth 2.0 Client ID"
   - Application type: "Web application"
   - Add authorized redirect URIs:
     - `http://localhost:5173`
     - `http://localhost:8000`
   - Copy the Client ID

5. **Update Configuration:**
   - Add Client ID to both `backend/.env` and `frontend/.env`

See [README_GOOGLE_AUTH.txt](README_GOOGLE_AUTH.txt) for detailed instructions.

### Running the Application

#### Start Backend Server
```bash
cd backend
conda activate face
uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```
Backend will run on: http://localhost:8000
API Documentation: http://localhost:8000/docs

#### Start Frontend Development Server
```bash
cd frontend
npm run dev
```
Frontend will run on: http://localhost:5173

#### Running Multiple Frontend Instances (Optional)
For testing with multiple users or ports:
```bash
# Admin frontend (Port 5173)
npm run dev:admin

# Student 1 frontend (Port 5174)
npm run dev:student1

# Student 2 frontend (Port 5175)
npm run dev:student2
```

#### GPU Mode
The backend automatically uses GPU acceleration if CUDA is available. GPU detection happens on startup with CUDA Execution Provider.

## 📖 Usage

### Student Flow
1. Navigate to http://localhost:5173
2. Click "Sign in with Google" under **Student** tab
3. Login with @bitsathy.ac.in email
4. View your attendance dashboard
5. Check attendance records and statistics

### Administrator Flow
1. Navigate to http://localhost:5173
2. Click "Sign in with Google" under **Administrator** tab
3. Login with authorized admin email
4. Access admin dashboard with tabs:
   - **Dashboard** - Overview and statistics
   - **Students** - Manage student records
   - **Attendance** - View and manage attendance
   - **Cameras** - Configure camera feeds
   - **Live Monitoring** - Real-time recognition
   - **Messaging** - Send announcements
   - **Users** - Manage user roles

### Adding Students
1. Go to **Students** tab
2. Click "Add New Student"
3. Enter details (Roll Number, Name, Email, Department)
4. Upload 3-5 clear face photos (different angles)
5. System automatically trains recognition model

### Managing Cameras
1. Go to **Cameras** tab
2. Click "Add Camera"
3. Enter:
   - **Camera Name** (e.g., "Main Entrance Camera")
   - **Stream URL** ("0" for webcam, "1" for second camera, or RTSP URL like `rtsp://user:pass@ip:port/path`)
   - **Location** (e.g., "Building A, 1st Floor")
   - **Resolution** (Select from: 640x480, 1280x720, 1920x1080, 2560x1440, 3840x2160)
4. Click "Add Camera" to save
5. **Edit Camera**: Click "Edit" to update name, location, or resolution (stream URL cannot be changed)
6. **Delete Camera**: Click "Delete" to remove camera

**Note for RTSP Cameras:**
- If password contains special characters like `@`, URL-encode them (e.g., `@` becomes `%40`)
- Example: `rtsp://user:pass%40word@192.168.1.100:554/stream`

### Live Recognition
1. Go to **Live Monitoring** tab
2. Select camera from list (shows camera name and location)
3. Click on camera card to view details
4. Click "▶️ Start Monitoring"
5. System processes frames every second and detects faces
6. **Green boxes** = Recognized students (with roll number)
7. **Red boxes** = Unknown faces
8. View **Recognition Results** in sidebar with:
   - Student name
   - Similarity score
   - Detection confidence
9. Attendance is automatically marked with configurable cooldown

## ⚙️ Configuration

### Face Recognition Settings (`config.yaml`)
```yaml
face_recognition:
  model_name: "buffalo_l"  # High accuracy model
  detection:
    det_threshold_gpu: 0.5  # Lower = more detections
    det_threshold_cpu: 0.6
    max_faces: 10
  recognition:
    similarity_threshold: 0.6  # Lower = stricter matching
```

### Attendance Settings
```yaml
attendance:
  cooldown_minutes: 5      # Prevent duplicate entries
  auto_mark_enabled: true  # Auto-mark on recognition
```

### Performance Optimization
```yaml
live_stream:
  frame_interval_ms: 33    # 30 FPS
  jpeg_quality: 75         # Lower = faster streaming
  resize_width: 640        # Smaller = faster processing
```

## 🔒 Security Features

- **Domain Restriction** - Only institutional emails allowed
- **JWT Authentication** - Secure token-based API access
- **Role-Based Access** - Separate admin/student permissions
- **Password Hashing** - Bcrypt encryption (if applicable)
- **CORS Protection** - Configured allowed origins
- **Token Expiration** - 7-day JWT validity

## 🗄️ Database Schema

### Users Table
- `id`, `email`, `name`, `google_id`
- `role` (student/admin)
- `is_active`, `created_at`, `last_login`

### Students Table
- `id`, `roll_number`, `name`, `email`, `department`
- `user_id` (FK to Users)
- `face_encoding`, `created_at`, `updated_at`

### Attendance Table
- `id`, `student_id`, `timestamp`, `status`
- `camera_id`, `marked_by`

### Cameras Table
- `id`, `name`, `stream_url`, `location`, `resolution`
- `is_active`, `created_at`

### Messages Table
- `id`, `sender_id`, `sender_email`, `subject`, `message`
- `admin_reply`, `is_read`, `created_at`, `reply_date`

## 📊 API Endpoints

### Authentication
- `POST /auth/google-login` - Login with Google token
- `GET /auth/verify` - Verify JWT token
- `GET /auth/me` - Get current user info

### Students
- `GET /students/` - List all students
- `POST /students/` - Add new student
- `GET /students/{id}` - Get student details
- `PUT /students/{id}` - Update student
- `DELETE /students/{id}` - Delete student
- `POST /students/{id}/photos` - Upload face photos

### Attendance
- `GET /attendance/` - Get attendance records
- `POST /attendance/` - Mark attendance manually
- `GET /attendance/student/{roll_number}` - Student attendance
- `GET /attendance/stats` - Attendance statistics

### Cameras
- `GET /cameras/` - List all active cameras
- `POST /cameras/add` - Add new camera (stream_url, name, location, resolution)
- `PUT /cameras/{id}` - Update camera details (name, location, resolution)
- `DELETE /cameras/{id}` - Delete/deactivate camera
- `GET /cameras/{id}/snapshot` - Get camera snapshot

### Messages
- `POST /messages/send` - Send message to admin (students)
- `GET /messages/admin/all` - Get all messages (admin)
- `GET /messages/student/{id}` - Get student's messages
- `POST /messages/{id}/reply` - Reply to message (admin)
- `PUT /messages/{id}/read` - Mark message as read (admin)
- `DELETE /messages/{id}` - Delete message (admin/student own messages)

### Live Recognition
- `POST /recognition/recognize-frame` - Process frame and recognize faces
- `WebSocket /ws/recognition/{camera_id}` - Real-time recognition stream

See full API documentation at: http://localhost:8000/docs

## 🛠️ Troubleshooting

### Common Issues

**GPU Not Detected:**
```bash
# Check CUDA installation
python -c "import torch; print(torch.cuda.is_available())"

# Verify ONNX Runtime GPU
python -c "import onnxruntime; print(onnxruntime.get_available_providers())"
```

**Poor Recognition Accuracy:**
- Upload more photos per student (5-10 recommended)
- Ensure good lighting in photos
- Lower `similarity_threshold` in config.yaml
- Use higher resolution camera

**Google Auth Fails:**
- Verify Client ID matches in both `.env` files
- Check authorized redirect URIs in Google Console
- Ensure email domain is @bitsathy.ac.in
- Clear browser cache and try again

**WebSocket Connection Error:**
- Check CORS settings in config.yaml
- Verify backend is running
- Check firewall/antivirus settings

## 📝 Migration Scripts

- `migrate_database.py` - Initial database setup
- `migrate_add_user_id.py` - Add user_id to students
- `migrate_add_department.py` - Add department field
- `migrate_add_camera_fields.py` - Add location and resolution to cameras
- `migrate_database_schema.py` - Full schema migration

## 🎯 Project Status

### ✅ Completed Features
- ✅ Google OAuth 2.0 authentication with role-based access
- ✅ Student management with CRUD operations
- ✅ Face recognition with GPU acceleration (InsightFace buffalo_l)
- ✅ Attendance tracking with auto-marking and cooldown
- ✅ Multiple camera support (webcam, IP cameras, RTSP streams)
- ✅ Camera management with full CRUD and configuration
- ✅ Live monitoring with real-time face recognition
- ✅ Messaging system with student-admin communication
- ✅ Message deletion for both students and admins
- ✅ Attendance export to CSV
- ✅ Dashboard with statistics and analytics
- ✅ Multi-port frontend support for testing
- ✅ Complete error handling and validation
- ✅ Database cascade deletion for data integrity

### 🔧 Technical Specifications
- **Backend**: FastAPI with Python 3.10
- **Frontend**: React 18 with Vite
- **Face Recognition**: InsightFace (buffalo_l) with SCRFD-10G detector
- **Database**: SQLite with SQLAlchemy ORM
- **Authentication**: Google OAuth 2.0 + JWT
- **Real-time**: WebSocket streaming
- **GPU**: CUDA Execution Provider (auto-fallback to CPU)
- **Camera Support**: OpenCV with RTSP/webcam integration

### 📊 Performance Metrics
- Face detection: ~30 FPS on GPU
- Recognition accuracy: High (buffalo_l model)
- Frame processing: 1 second intervals (configurable)
- Attendance cooldown: 5 minutes (configurable)
- Cache refresh: 30 seconds for student embeddings

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

This project is licensed under the MIT License.

## 👥 Authors

- Thiyanesh07 - [GitHub](https://github.com/Thiyanesh07)

## 🙏 Acknowledgments

- **InsightFace** - Face recognition models
- **FastAPI** - Modern Python web framework
- **React** - Frontend framework
- **Google OAuth** - Authentication service

## 📞 Support

For issues and questions:
- Open an issue on GitHub
- Check existing documentation
- Review IMPLEMENTATION_SUMMARY.md for recent changes

---

**Note:** This system is designed for educational institutions using @bitsathy.ac.in domain. Modify authentication settings in `auth_service.py` for different domains.
