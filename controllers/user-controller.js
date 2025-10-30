const User = require("../models/user-model");
const ErrorHandler = require('../utils/error-handler');
const userService = require('../services/user-service');
const UserDto = require('../dtos/user-dto');
const mongoose = require('mongoose');
const crypto = require('crypto');
const teamService = require('../services/team-service');
const attendanceService = require('../services/attendance-service');


class UserController {

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
    } = req.body;

    // ✅ Ensure username is always a string
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
      username: finalUsername, // ✅ guaranteed string
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


    updateUser = async (req, res, next) => {
  try {
    const file = req.file; // ✅ If new image uploaded
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
    } = req.body;

    // ✅ Validate user ID
    if (!mongoose.Types.ObjectId.isValid(id))
      return next(ErrorHandler.badRequest("Invalid User Id"));

    // ✅ Find existing user
    const dbUser = await userService.findUser({ _id: id });
    if (!dbUser) return next(ErrorHandler.notFound("User not found"));

    // ✅ Prepare updated user data
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
      profile: file ? file.filename : dbUser.profile, // ✅ update if new image, else keep old
    };

    // ✅ Update user in DB
    const updatedUser = await userService.updateUser(id, userData);
    if (!updatedUser)
      return next(ErrorHandler.serverError("Failed To Update Account"));

    res.json({ success: true, message: "User Updated Successfully", data: updatedUser });
  } catch (error) {
    console.error("Update User Error:", error);
    res.json({ success: false, error });
  }
};


    getUsers = async (req,res,next) =>
    {
        const type = req.path.split('/').pop().replace('s','');
        const emps = await userService.findUsers({type});
        if(!emps || emps.length<1) return next(ErrorHandler.notFound(`No ${type.charAt(0).toUpperCase()+type.slice(1).replace(' ','')} Found`));
        const employees = emps.map((o)=> new UserDto(o));
        res.json({success:true,message:`${type.charAt(0).toUpperCase()+type.slice(1).replace(' ','')} List Found`,data:employees})
    }


    getFreeEmployees = async (req,res,next) =>
    {
        const emps = await userService.findUsers({type:'employee',team:null});
        if(!emps || emps.length<1) return next(ErrorHandler.notFound(`No Free Employee Found`));
        const employees = emps.map((o)=> new UserDto(o));
        res.json({success:true,message:'Free Employees List Found',data:employees})
    }

    deleteUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    console.log("Deleting user:", id);

    if (!mongoose.Types.ObjectId.isValid(id)) {
      console.log("Invalid ID");
      return next(ErrorHandler.badRequest('Invalid User ID'));
    }

    const deletedUser = await userService.deleteUser({ _id: id });
    console.log("Deleted user result:", deletedUser);

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

    markEmployeeAttendance = async (req,res,next) => {
        try {
        const {employeeID} = req.body;
        const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
        const d = new Date();

        // const {_id} = employee;
        
        const newAttendance = {
            employeeID,
            year:d.getFullYear(),
            month:d.getMonth() + 1,
            date:d.getDate(),
            day:days[d.getDay()],
            present: true, 
        };

       const isAttendanceMarked = await attendanceService.findAttendance(newAttendance);
       if(isAttendanceMarked) return next(ErrorHandler.notAllowed(d.toLocaleDateString() +" "+ days[d.getDay()-1]+" "+"Attendance Already Marked!"));

       const resp = await attendanceService.markAttendance(newAttendance);
       console.log(resp);
       if(!resp) return next(ErrorHandler.serverError('Failed to mark attendance'));

       const msg = d.toLocaleDateString() +" "+ days[d.getDay()]+" "+ "Attendance Marked!";
       
       res.json({success:true,newAttendance,message:msg});
            
        } catch (error) {
            res.json({success:false,error});    
        } 
    }

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

  applyLeaveApplication = async (req, res, next) => {
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

    updateEmployeeSalary = async (req,res,next) => {
        try {
            const body = req.body;
            const {employeeID} = body;
            const d = new Date();
            body["assignedDate"] = d.getFullYear()+"-"+(d.getMonth()+1)+"-"+d.getDate();
            const isSalaryUpdated = await userService.updateSalary({employeeID},body);
            console.log(isSalaryUpdated);
            if(!isSalaryUpdated) return next(ErrorHandler.serverError('Failed to update salary'));
            res.json({success:true,message:'Salary Updated'});
            
        } catch (error) {
            res.json({success:false,error});
        }
    }

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