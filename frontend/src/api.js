const API_BASE_URL = "http://127.0.0.1:8000/api/v1";

export const loginAdmin = async (username, password) => {
  const response = await fetch(`${API_BASE_URL}/auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      username: username,
      password: password,
    }),
  });
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.detail || "Login failed");
  }
  return response.json();
};

export const addStudent = async (name, rollNumber, email, department, files) => {
  const formData = new FormData();
  formData.append("name", name);
  formData.append("roll_number", rollNumber);
  if (email) {
    formData.append("email", email);
  }
  if (department) {
    formData.append("department", department);
  }
  
  // Support multiple files
  if (Array.isArray(files)) {
    files.forEach(file => {
      formData.append("files", file);
    });
  } else {
    formData.append("files", files);
  }

  const response = await fetch(`${API_BASE_URL}/students/`, {
    method: "POST",
    body: formData,
  });
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.detail || "Failed to add student");
  }
  return response.json();
};

export const getAllStudents = async () => {
  const response = await fetch(`${API_BASE_URL}/students/`);
  if (!response.ok) {
    throw new Error("Failed to fetch students");
  }
  return response.json();
};

export const deleteStudent = async (studentId) => {
  const response = await fetch(`${API_BASE_URL}/students/${studentId}`, {
    method: "DELETE",
  });
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.detail || "Failed to delete student");
  }
  return response.json();
};

export const recognizeFrame = async (file, cameraId = null) => {
  const formData = new FormData();
  formData.append("file", file);
  
  let url = `${API_BASE_URL}/recognition/recognize-frame`;
  if (cameraId) {
    url += `?camera_id=${encodeURIComponent(cameraId)}`;
  }

  const response = await fetch(url, {
    method: "POST",
    body: formData,
  });
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.detail || "Failed to recognize frame");
  }
  return response.json();
};

export const addCamera = async (streamUrl, name = null, location = null, resolution = null) => {
  const params = new URLSearchParams({ stream_url: streamUrl });
  if (name) params.append('name', name);
  if (location) params.append('location', location);
  if (resolution) params.append('resolution', resolution);
  
  const response = await fetch(`${API_BASE_URL}/cameras/add?${params.toString()}`, {
    method: "POST",
  });
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.detail || "Failed to add camera stream");
  }
  return response.json();
};

export const addCameraStream = async (streamUrl) => {
  return addCamera(streamUrl);
};

export const listCameras = async () => {
  const response = await fetch(`${API_BASE_URL}/cameras/`);
  if (!response.ok) {
    throw new Error("Failed to fetch cameras");
  }
  const data = await response.json();
  // Return full camera objects
  return Array.isArray(data) ? data : (data.cameras || []);
};

export const updateCamera = async (cameraId, name = null, location = null, resolution = null) => {
  const params = new URLSearchParams();
  if (name) params.append('name', name);
  if (location !== null) params.append('location', location);
  if (resolution !== null) params.append('resolution', resolution);
  
  const response = await fetch(`${API_BASE_URL}/cameras/${cameraId}?${params.toString()}`, {
    method: "PUT",
  });
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.detail || "Failed to update camera");
  }
  return response.json();
};

export const removeCameraStream = async (cameraId) => {
  const response = await fetch(`${API_BASE_URL}/cameras/${cameraId}`, {
    method: "DELETE",
  });
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.detail || "Failed to remove camera stream");
  }
  return response.json();
};

export const getCameraSnapshot = async (cameraId) => {
  const response = await fetch(`${API_BASE_URL}/cameras/${cameraId}/snapshot`);
  if (!response.ok) {
    throw new Error("Failed to get camera snapshot");
  }
  return response.blob(); // Get as blob for image display
};

export const getAttendanceRecords = async (skip = 0, limit = 100) => {
  const response = await fetch(`${API_BASE_URL}/attendance/?skip=${skip}&limit=${limit}`);
  if (!response.ok) {
    throw new Error("Failed to fetch attendance records");
  }
  return response.json();
};

export const markAttendance = async (rollNumber, status = "present", cameraId = null, timestamp = null) => {
  const response = await fetch(`${API_BASE_URL}/attendance/mark`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      roll_number: rollNumber,
      status: status,
      camera_id: cameraId,
      timestamp: timestamp
    }),
  });
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.detail || "Failed to mark attendance");
  }
  return response.json();
};

export const deleteAttendance = async (attendanceId) => {
  const response = await fetch(`${API_BASE_URL}/attendance/${attendanceId}`, {
    method: "DELETE",
  });
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.detail || "Failed to delete attendance");
  }
  return response.json();
};

export const exportAttendanceCSV = async () => {
  const response = await fetch(`${API_BASE_URL}/attendance/export/csv`);
  if (!response.ok) {
    throw new Error("Failed to export attendance");
  }
  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `attendance_${new Date().toISOString().split('T')[0]}.csv`;
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
  document.body.removeChild(a);
};

export const getStudentAttendance = async (studentEmail) => {
  const response = await fetch(`${API_BASE_URL}/attendance/student/${encodeURIComponent(studentEmail)}`);
  if (!response.ok) {
    throw new Error("Failed to fetch student attendance");
  }
  return response.json();
};

export const getDashboardStats = async () => {
  const response = await fetch(`${API_BASE_URL}/dashboard/stats`);
  if (!response.ok) {
    throw new Error("Failed to fetch dashboard stats");
  }
  return response.json();
};
