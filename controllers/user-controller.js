const User = require("../models/user-model");
const Attendance = require("../models/attendance-model");
const Leave = require("../models/leave-model");
const Expense = require("../models/expense-model");
const PayrollPolicy = require("../models/payroll-policy-model");
const UserSalaries = require("../models/user-salary");
const ErrorHandler = require('../utils/error-handler');
const userService = require('../services/user-service');
const UserDto = require('../dtos/user-dto');
const mongoose = require('mongoose');
const crypto = require('crypto');
const teamService = require('../services/team-service');
const attendanceService = require('../services/attendance-service');


class UserController {

//   calculateCurrentMonthSalaries = async (req, res) => {
//   try {
//     const currentDate = new Date();
//     const year = currentDate.getFullYear();
//     const month = currentDate.getMonth() + 1;
//     const today = currentDate.getDate();

//     const [users, salaries, attendances, leaves, expenses, payrollPolicy] = await Promise.all([
//       User.find({}),
//       UserSalaries.find({}),
//       Attendance.find({ year, month }),
//       Leave.find({ year, month }),
//       Expense.find({}),
//       PayrollPolicy.findOne({}),
//     ]);

//     const results = users.map((user) => {
//       const empSalary = salaries.find(
//         (s) => s.employeeID.toString() === user._id.toString()
//       );

//       const grossSalary = empSalary?.earnings?.gross || 0;
//       const perDaySalary = grossSalary / 26;

//       const deductions = {
//         pfEmployee: empSalary?.deductions?.pfEmployee || 0,
//         esiEmployee: empSalary?.deductions?.esiEmployee || 0,
//         tdsMonthly: empSalary?.deductions?.tdsMonthly || 0,
//         professionalTax: empSalary?.deductions?.professionalTax || 0,
//       };

//       const totalMonthlyDeduction =
//         deductions.pfEmployee +
//         deductions.esiEmployee +
//         deductions.tdsMonthly +
//         deductions.professionalTax;

//       // ✅ Monthly Net Pay (fixed for full month)
//       const monthlyNetPay = Math.max(0, grossSalary - totalMonthlyDeduction);

//       // ✅ Till-date attendance
//       const empAttendance = attendances.filter(
//         (a) => a.employeeID.toString() === user._id.toString()
//       );

//       const tillDateAttendance = empAttendance.filter(
//         (a) => a.present && a.date <= today
//       ).length;

//       // ✅ Sundays calculation (assuming Sunday off)
//       const totalSundays = Array.from({ length: today }, (_, i) => i + 1).filter(
//         (d) => new Date(year, month - 1, d).getDay() === 0
//       ).length;

//       // ✅ Paid leaves till today
//       const empLeaves = leaves.filter(
//         (l) =>
//           (l.applicantID?.toString() || l.employeeID?.toString()) ===
//             user._id.toString() && l.adminResponse === "Approved"
//       );
//       const paidLeavesTillDate =
//         payrollPolicy?.payForApprovedLeaves?.enabled === "Yes"
//           ? empLeaves.filter((l) => new Date(l.startDate).getDate() <= today)
//               .length
//           : 0;

//       // ✅ Holidays (you can make it dynamic later)
//       const holidaysTillDate = payrollPolicy?.holidays?.filter?.(
//         (h) =>
//           new Date(h.date).getFullYear() === year &&
//           new Date(h.date).getMonth() + 1 === month &&
//           new Date(h.date).getDate() <= today
//       )?.length || 0;

//       // ✅ Total payable days till date
//       // ✅ Total payable days till date
// let payableDaysTillDate = 0;

// // Salary milni chahiye agar employee present ya approved leave par ho
// if (tillDateAttendance > 0 || paidLeavesTillDate > 0) {
//   payableDaysTillDate =
//     tillDateAttendance + totalSundays + paidLeavesTillDate + holidaysTillDate;
// } else {
//   // agar employee ek bhi din present nahi hai, to 0 payable days
//   payableDaysTillDate = 0;
// }

// // ✅ Till Date Salary (per day * payable days)
// const tillDateSalary =
//   payableDaysTillDate > 0
//     ? Math.max(
//         0,
//         perDaySalary * payableDaysTillDate -
//           (totalMonthlyDeduction / 26) * payableDaysTillDate
//       )
//     : 0;

//       // ✅ Approved Expenses till date
//       const empExpenses = expenses.filter(
//         (e) =>
//           e.employeeID.toString() === user._id.toString() &&
//           e.adminResponse === "Approved" &&
//           new Date(e.expenseDate).getDate() <= today
//       );
//       const tillDateExpense = empExpenses.reduce(
//         (sum, e) => sum + (e.amount || 0),
//         0
//       );

//       const totalTillDatePay = tillDateSalary + tillDateExpense;

//       return {
//         employeeID: user._id,
//         name: user.name,
//         email: user.email,
//         month,
//         year,
//         earnings: { gross: Number(grossSalary.toFixed(2)) },
//         perDaySalary: Number(perDaySalary.toFixed(2)),
//         deductions,
//         netPay: Number(monthlyNetPay.toFixed(2)), // full month salary
//         tillDateSalary: Number(tillDateSalary.toFixed(2)), // till date earned
//         totalExpenses: Number(tillDateExpense.toFixed(2)), // approved till date
//         totalPay: Number(totalTillDatePay.toFixed(2)), // till date + expenses
//       };
//     });

//     res.json({
//       success: true,
//       data: results,
//       message: "Till date salary calculation done successfully",
//     });
//   } catch (err) {
//     console.error("❌ Salary calc error:", err);
//     res.status(500).json({
//       success: false,
//       message: "Error calculating salary",
//       error: err.message,
//     });
//   }
// };

calculateCurrentMonthSalaries = async (req, res) => {
  try {
    const currentDate = new Date();
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth() + 1;

    const [users, salaries, attendances, expenses] = await Promise.all([
      User.find({}),
      UserSalaries.find({}),
      Attendance.find({ year, month }),
      Expense.find({})
    ]);

    const workingDays = 26;

    const results = users.map((user) => {
      // ===== Salary Assigned =====
      const empSalary = salaries.find(
        (s) => s.employeeID.toString() === user._id.toString()
      );

      const grossSalary = empSalary?.earnings?.gross || 0;
      const netPaySalary = empSalary?.netPay || 0;

      // Per day salary (company rule: 26 days)
      const perDaySalary = Number((netPaySalary / workingDays).toFixed(2));

      // ===== Attendance =====
      const empAttendance = attendances.filter(
        (a) => a.employeeID.toString() === user._id.toString()
      );

      const presentDays = empAttendance.filter((a) => a.present).length;

      // ===== Till Date Salary =====
      const tillDateSalary = Number((perDaySalary * presentDays).toFixed(2));

      // ===== Approved Expenses =====
      const empExpenses = expenses.filter(
        (e) =>
          e.employeeID.toString() === user._id.toString() &&
          e.adminResponse === "Approved" &&
          new Date(e.expenseDate).getFullYear() === year &&
          new Date(e.expenseDate).getMonth() + 1 === month
      );

      const totalExpenses = empExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);

      const totalPay = Number((tillDateSalary + totalExpenses).toFixed(2));

      return {
        employeeID: user._id,
        name: user.name,
        email: user.email,

        month,
        year,

        earnings: {
          gross: grossSalary,
        },

        perDaySalary,

        deductions: {
          pfEmployee: empSalary?.deductions?.pfEmployee || 0,
          esiEmployee: empSalary?.deductions?.esiEmployee || 0,
          tdsMonthly: empSalary?.deductions?.tdsMonthly || 0,
          professionalTax: empSalary?.deductions?.professionalTax || 0,
        },

        netPay: netPaySalary, // monthly net pay assigned

        presentDays, // for reference in frontend

        tillDateSalary,
        totalExpenses,
        totalPay,
      };
    });

    res.json({
      success: true,
      data: results,
      message: "Till-date salary calculated successfully",
    });
  } catch (err) {
    console.error("Salary error:", err);
    res.status(500).json({
      success: false,
      message: "Error calculating salary",
      error: err.message,
    });
  }
};


  createUser = async (req, res) => {
    try {
      const {
        name,
        username,
        email,
        mobile,
        password,
        type,
        address,
        designation,
        date,
        panNumber,
        aadhaarNumber,
        bankName,
        accountNumber,
        ifscCode,
        workType,   // ✅ added
        uan,        // ✅ added
        esi,        // ✅ added
      } = req.body;

      const finalUsername =
        typeof username === "string"
          ? username
          : Array.isArray(username)
          ? username[0]
          : "";

      if (!finalUsername) {
        return res.status(400).json({ success: false, message: "Enter Username" });
      }

      const userObj = {
        name,
        username: finalUsername,
        email,
        mobile,
        password,
        type,
        address,
        designation,
        date,
        panNumber,
        aadhaarNumber,
        bankName,
        accountNumber,
        ifscCode,
        workType,   // ✅ added
        uan,        // ✅ added
        esi,        // ✅ added
        profile: req.file ? req.file.filename : "user.png",
      };

      const user = new User(userObj);
      await user.save();

      res.status(200).json({
        success: true,
        message: "User Created Successfully",
        data: user,
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({
        success: false,
        message: err.message || "Something went wrong",
      });
    }
  };

  // ===========================
  // UPDATE USER
  // ===========================
  updateUser = async (req, res, next) => {
    try {
      const file = req.file;
      const { id } = req.params;
      const {
        name,
        email,
        mobile,
        password,
        type,
        status,
        address,
        designation,
        date,
        panNumber,
        aadhaarNumber,
        bankName,
        accountNumber,
        ifscCode,
        workType,   // ✅ added
        uan,        // ✅ added
        esi,        // ✅ added
      } = req.body;

      if (!mongoose.Types.ObjectId.isValid(id))
        return next(ErrorHandler.badRequest("Invalid User Id"));

      const dbUser = await userService.findUser({ _id: id });
      if (!dbUser) return next(ErrorHandler.notFound("User not found"));

      const userData = {
        name: name || dbUser.name,
        email: email || dbUser.email,
        mobile: mobile || dbUser.mobile,
        password: password || dbUser.password,
        type: type || dbUser.type,
        status: status || dbUser.status,
        address: address || dbUser.address,
        designation: designation || dbUser.designation,
        date: date || dbUser.date,
        panNumber: panNumber || dbUser.panNumber,
        aadhaarNumber: aadhaarNumber || dbUser.aadhaarNumber,
        bankName: bankName || dbUser.bankName,
        accountNumber: accountNumber || dbUser.accountNumber,
        ifscCode: ifscCode || dbUser.ifscCode,
        workType: workType || dbUser.workType,   // ✅ added
        uan: uan || dbUser.uan,                  // ✅ added
        esi: esi || dbUser.esi,                  // ✅ added
        profile: file ? file.filename : dbUser.profile,
      };

      const updatedUser = await userService.updateUser(id, userData);
      if (!updatedUser)
        return next(ErrorHandler.serverError("Failed To Update Account"));

      res.json({
        success: true,
        message: "User Updated Successfully",
        data: updatedUser,
      });
    } catch (error) {
      console.error("Update User Error:", error);
      res.json({ success: false, error });
    }
  };

  // ===========================
  // REMAINING METHODS (unchanged)
  // ===========================

  getUsers = async (req, res, next) => {
    const type = req.path.split('/').pop().replace('s', '');
    const emps = await userService.findUsers({ type });
    if (!emps || emps.length < 1)
      return next(ErrorHandler.notFound(`No ${type.charAt(0).toUpperCase() + type.slice(1).replace(' ', '')} Found`));
    const employees = emps.map((o) => new UserDto(o));
    res.json({
      success: true,
      message: `${type.charAt(0).toUpperCase() + type.slice(1).replace(' ', '')} List Found`,
      data: employees,
    });
  };

  getFreeEmployees = async (req, res, next) => {
    const emps = await userService.findUsers({ type: 'employee', team: null });
    if (!emps || emps.length < 1)
      return next(ErrorHandler.notFound(`No Free Employee Found`));
    const employees = emps.map((o) => new UserDto(o));
    res.json({ success: true, message: 'Free Employees List Found', data: employees });
  };

  deleteUser = async (req, res, next) => {
    try {
      const { id } = req.params;
      if (!mongoose.Types.ObjectId.isValid(id))
        return next(ErrorHandler.badRequest('Invalid User ID'));
      const deletedUser = await userService.deleteUser({ _id: id });
      if (!deletedUser)
        return next(ErrorHandler.notFound('User not found or already deleted'));
      res.json({ success: true, message: 'User deleted successfully' });
    } catch (error) {
      console.error("Delete user error:", error);
      res.json({ success: false, error });
    }
  };

    getUser = async (req,res,next) =>
    {
        const {id} = req.params;
        const type = req.path.replace(id,'').replace('/','').replace('/','');
        if(!mongoose.Types.ObjectId.isValid(id)) return next(ErrorHandler.badRequest(`Invalid ${type.charAt(0).toUpperCase() + type.slice(1).replace(' ','')} Id`));
        const emp = await userService.findUser({_id:id,type});
        if(!emp) return next(ErrorHandler.notFound(`No ${type.charAt(0).toUpperCase() + type.slice(1).replace(' ','')} Found`));
        res.json({success:true,message:'Employee Found',data:new UserDto(emp)})
    }

    getUserNoFilter = async (req,res,next) =>
    {
        const {id} = req.params;
        if(!mongoose.Types.ObjectId.isValid(id)) return next(ErrorHandler.badRequest('Invalid User Id'));
        const emp = await userService.findUser({_id:id});
        if(!emp) return next(ErrorHandler.notFound('No User Found'));
        res.json({success:true,message:'User Found',data:new UserDto(emp)})
    }

    getLeaders = async (req,res,next) =>
    {
        const leaders = await userService.findLeaders();
        const data = leaders.map((o)=>new UserDto(o));
        res.json({success:true,message:'Leaders Found',data})
    }

    getFreeLeaders = async (req,res,next) =>
    {
        const leaders = await userService.findFreeLeaders();
        const data = leaders.map((o)=>new UserDto(o));
        res.json({success:true,message:'Free Leaders Found',data})
    }

    markEmployeeAttendance = async (req, res, next) => {
  try {
    const { employeeID } = req.body;
    const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const d = new Date();
    const todayDay = days[d.getDay()];

    const newAttendance = {
      employeeID,
      year: d.getFullYear(),
      month: d.getMonth() + 1,
      date: d.getDate(),
      day: todayDay,
      present: true,
    };

    const isAttendanceMarked = await attendanceService.findAttendance(newAttendance);
    if (isAttendanceMarked)
      return res.json({ success: false, message: "Attendance already marked!" });

    // 🟢 If Sunday — mark auto-present, no In/Out times
    if (todayDay === "Sunday") {
      const resp = await attendanceService.markAttendance({
        ...newAttendance,
        attendanceIn: "-",
        attendanceOut: "-",
        totalHours: "-",
        late: "-",
      });
      return res.json({
        success: true,
        message: "Sunday marked automatically as Present",
        data: resp,
      });
    }

    // Otherwise normal marking
    const resp = await attendanceService.markAttendance(newAttendance);
    res.json({
      success: true,
      message: `${todayDay} Attendance Marked!`,
      data: resp,
    });
  } catch (error) {
    res.json({ success: false, error });
  }
};

 checkInEmployeeAttendance = async (req, res, next) => {
  try {
    const { employeeID } = req.body;
    const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const d = new Date();

    // Convert current time to readable format
    const attendanceIn = d.toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });

    // ✅ Extract current hour & minute in 24-hour format
    const currentHour = d.getHours(); // e.g. 10
    const currentMinute = d.getMinutes(); // e.g. 45

    // ✅ Company start time — 11:00 AM
    const late = currentHour > 11 || (currentHour === 11 && currentMinute > 0) ? "Yes" : "No";

    const newAttendance = {
      employeeID,
      year: d.getFullYear(),
      month: d.getMonth() + 1,
      date: d.getDate(),
      day: days[d.getDay()],
      present: true,
      attendanceIn,
      late,
    };

    // ✅ Prevent duplicate check-ins
    const isMarked = await attendanceService.findAttendance({
      employeeID,
      year: d.getFullYear(),
      month: d.getMonth() + 1,
      date: d.getDate(),
    });

    if (isMarked)
      return res.json({ success: false, message: "Already checked in today!" });

    const resp = await attendanceService.markAttendance(newAttendance);
    res.json({
      success: true,
      data: resp,
      message: `Checked In successfully! (${late === "Yes" ? "Late" : "On Time"})`,
    });
  } catch (error) {
    res.json({ success: false, error });
  }
};



checkOutEmployeeAttendance = async (req, res, next) => {
  try {
    const { employeeID } = req.body;
    const d = new Date();

    const year = d.getFullYear();
    const month = d.getMonth() + 1;
    const date = d.getDate();

    const record = await attendanceService.findTodayAttendance(
      employeeID,
      year,
      month,
      date
    );

    if (!record)
      return res.json({ success: false, message: "Please check in first!" });

    if (record.attendanceOut)
      return res.json({ success: false, message: "Already checked out today!" });

    const attendanceOut = d.toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });

    // ✅ Calculate total hours as decimal
    const inTime = new Date(`${year}-${month}-${date} ${record.attendanceIn}`);
    const outTime = new Date(`${year}-${month}-${date} ${attendanceOut}`);
    const totalMs = outTime - inTime;
    const totalHours = (totalMs / (1000 * 60 * 60)).toFixed(2); // e.g. "4.52"

    const updated = await attendanceService.updateAttendanceOut(record._id, {
      attendanceOut,
      totalHours,
    });

    res.json({ success: true, data: updated, message: "Checked Out successfully!" });
  } catch (error) {
    res.json({ success: false, error });
  }
};



    viewEmployeeAttendance = async (req,res,next) => {
        try {
            const data = req.body;
            const resp = await attendanceService.findAllAttendance(data);
            if(!resp) return next(ErrorHandler.notFound('No Attendance found'));

            res.json({success:true,data:resp});
            
        } catch (error) {
            res.json({success:false,error});
        }
    }

updateEmployeeAttendance = async (req, res, next) => {
  try {
    const {
      id,
      employeeID,
      attendanceIn,
      attendanceOut,
      present,
      date,
      month,
      year,
      day,
    } = req.body;

    // 🧩 Validation
    if (!employeeID || !date || !month || !year) {
      return res.json({
        success: false,
        message: "Missing employee or date info",
      });
    }

    // 🚫 Prevent editing future date
    const today = new Date();
    const targetDate = new Date(year, month - 1, date);
    today.setHours(0, 0, 0, 0);
    if (targetDate > today) {
      return res.json({
        success: false,
        message: "Cannot modify attendance for a future date.",
      });
    }

    // 🧩 Absent case
    if (!present) {
      const absentData = {
        employeeID,
        attendanceIn: "-",
        attendanceOut: "-",
        totalHours: "-",
        late: "-",
        timeStatus: "-",
        present: false,
        date,
        month,
        year,
        day,
      };

      if (id) {
        const updated = await attendanceService.updateAttendance(id, absentData);
        return res.json({ success: true, message: "Marked Absent", data: updated });
      }

      const created = await attendanceService.createAttendance(absentData);
      return res.json({ success: true, message: "Attendance marked Absent", data: created });
    }

    // ✅ Present case
    const inTime = new Date(`${year}-${month}-${date} ${attendanceIn}`);
    const outTime = new Date(`${year}-${month}-${date} ${attendanceOut}`);
    const totalHours = (outTime - inTime) / (1000 * 60 * 60);

    const lateThreshold = new Date(`${year}-${month}-${date} 11:00:00`);
    const isLate = inTime > lateThreshold ? "Yes" : "No";

    let timeStatus = "-";
    const d = (day || "").toLowerCase();
    if (d === "sunday") timeStatus = "Full Time";
    else if (d === "saturday") timeStatus = totalHours >= 5 ? "Full Time" : "Half Time";
    else timeStatus = totalHours >= 7 ? "Full Time" : "Half Time";

    const attendanceData = {
      employeeID,
      attendanceIn,
      attendanceOut,
      totalHours: totalHours.toFixed(2),
      late: isLate,
      timeStatus,
      present: true,
      date,
      month,
      year,
      day,
    };

    if (id) {
      const updated = await attendanceService.updateAttendance(id, attendanceData);
      return res.json({ success: true, message: "Attendance updated", data: updated });
    }

    const newAttendance = await attendanceService.createAttendance(attendanceData);
    return res.json({ success: true, message: "Attendance created", data: newAttendance });

  } catch (error) {
    console.error("Attendance update error:", error);
    res.json({
      success: false,
      message: error.message || "Server error while updating attendance",
    });
  }
};



//
autoMarkAttendanceForAll = async () => {
  try {
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth() + 1;
    const date = today.getDate();
    const dayName = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][today.getDay()];

    const payroll = await PayrollPolicy.findOne({});
    const users = await User.find({});
    const leaves = await Leave.find({ adminResponse: "Approved" });

    const isFestivalHoliday =
      payroll?.festivalHolidays?.enabled === "Yes" &&
      payroll?.festivalHolidays?.days?.some(
        (d) => new Date(d).toDateString() === today.toDateString()
      );

    const isInternationalHoliday =
      payroll?.internationalHolidays?.enabled === "Yes" &&
      payroll?.internationalHolidays?.days?.some(
        (d) => new Date(d).toDateString() === today.toDateString()
      );

   

    // If none apply, skip
    const isAutoPresent =
       isFestivalHoliday || isInternationalHoliday;

    for (const user of users) {
      // Check if already marked
      const already = await attendanceService.findAttendance({
        employeeID: user._id,
        year,
        month,
        date,
      });

      if (already) continue;

      // LEAVE CHECK (approved leaves only)
      const leaveApproved = leaves.some((lv) => {
        const start = new Date(lv.startDate);
        const end = new Date(lv.endDate);
        return today >= start && today <= end;
      });

      // Attendance object (default absent)
      let attendanceData = {
        employeeID: user._id,
        year,
        month,
        date,
        day: dayName,
        present: false,
        attendanceIn: "-",
        attendanceOut: "-",
        totalHours: "-",
        late: "-",
        timeStatus: "-",
      };

      // Mark present for:
      // ✔ Sunday
      // ✔ Festival
      // ✔ International
      // ✔ Approved leaves
      if (isAutoPresent || leaveApproved) {
        attendanceData.present = true;
        attendanceData.timeStatus = "Full Time";
      }

      await attendanceService.markAttendance(attendanceData);
    }

    console.log("Auto Attendance Applied for All Employees ✔");

  } catch (err) {
    console.error("Auto Attendance Error:", err);
  }
};


  applyLeaveApplication = async (req, res, next) => {
    console.log("✅ Apply Leave API hit, body:", req.body); // <-- ADD THIS LINE
    try {
        const data = req.body;
        const { applicantID, title, type, startDate, endDate, appliedDate, period, reason } = data;

        // 👇 Get applicant details from DB
        const applicant = await userService.findUser({ _id: applicantID });
        if (!applicant) return next(ErrorHandler.notFound('Applicant not found'));

        const newLeaveApplication = {
            applicantID,
            applicantName: applicant.name,     // 👈 store name
            applicantEmail: applicant.email,   // 👈 store email
            title,
            type,
            startDate,
            endDate,
            appliedDate,
            period,
            reason,
            adminResponse: "Pending"
        };

        const isLeaveApplied = await userService.findLeaveApplication({
            applicantID,
            startDate,
            endDate,
            appliedDate
        });
        if (isLeaveApplied) return next(ErrorHandler.notAllowed('Leave Already Applied'));

        const resp = await userService.createLeaveApplication(newLeaveApplication);
        if (!resp) return next(ErrorHandler.serverError('Failed to apply leave'));
        res.json({ success: true, data: resp });

    } catch (error) {
        res.json({ success: false, error });
    }
};


    viewLeaveApplications = async (req, res, next) => {
        try {
            const data = req.body;
            const resp = await userService.findAllLeaveApplications(data);
            if(!resp) return next(ErrorHandler.notFound('No Leave Applications found'));

            res.json({success:true,data:resp});

        } catch (error) {
            res.json({success:false,error});
        }
    }

    updateLeaveApplication = async (req, res, next) => {
        try {

            const {id} = req.params;
            const body = req.body;
            const isLeaveUpdated = await userService.updateLeaveApplication(id,body);
            if(!isLeaveUpdated) return next(ErrorHandler.serverError('Failed to update leave'));
            res.json({success:true,message:'Leave Updated'});
            
            
        } catch (error) {
            res.json({success:false,error});
        }
    }

    assignEmployeeSalary = async (req, res, next) => {
        try {
            const data = req.body;
            const obj = {
                "employeeID":data.employeeID
            }
            const isSalaryAssigned = await userService.findSalary(obj);
            if(isSalaryAssigned) return next(ErrorHandler.serverError('Salary already assigned'));

            const d = new Date();
            data["assignedDate"] = d.getFullYear()+"-"+(d.getMonth()+1)+"-"+d.getDate();
            const resp = await userService.assignSalary(data);
            if(!resp) return next(ErrorHandler.serverError('Failed to assign salary'));
            res.json({success:true,data:resp}); 
        } catch (error) {
            res.json({success:false,error});
        }
    }

   updateEmployeeSalary = async (req, res, next) => {
  try {
    const body = req.body;
    const { employeeID } = body;
    const d = new Date();
    body["assignedDate"] = `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;

    const isSalaryUpdated = await userService.updateEmployeeSalary({ employeeID }, body);

    if (!isSalaryUpdated) 
      return next(ErrorHandler.serverError('Failed to update salary'));

    res.json({ success: true, message: 'Salary Updated' });
  } catch (error) {
    console.error("Update Salary Error:", error);
    res.json({ success: false, message: 'Update Failed', error: error.message });
  }
};


    viewSalary = async (req,res,next) => {
        try {
            const data = req.body;
            const resp = await userService.findAllSalary(data);
            if(!resp) return next(ErrorHandler.notFound('No Salary Found'));
            res.json({success:true,data:resp});

        } catch (error) {
            res.json({success:false,error});
        }
    }
    getAllUsers = async (req, res, next) => {
        try {
            const users = await userService.findUsers({});
            if(!users || users.length<1) return next(ErrorHandler.notFound('No Users Found'));
            res.json({success:true,data:users});
        } catch (error) {
            res.json({success:false,error});
        }
    }


    

}

module.exports = new UserController();