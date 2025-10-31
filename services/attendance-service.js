const Attendance = require('../models/attendance-model');

class AttendanceService {
  markAttendance = async data => Attendance.create(data);
  findAttendance = async data => Attendance.findOne(data);
  findAllAttendance = async data => Attendance.find(data);
  findTodayAttendance = async (employeeID, year, month, date) => 
    Attendance.findOne({ employeeID, year, month, date });
  updateAttendanceOut = async (id, updateData) => 
    Attendance.findByIdAndUpdate(id, updateData, { new: true });
}

module.exports = new AttendanceService();
