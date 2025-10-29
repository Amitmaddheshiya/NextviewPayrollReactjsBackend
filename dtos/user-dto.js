const TeamDto = require('./team-dto');
class UserDto{
    id;
    name;
    email;
    username;
    mobile;
    image;
    type;
    address;
    status;
    team;
    designation;
    panNumber;
    aadhaarNumber;
    bankName;
    accountNumber;
    ifscCode;
    date;
    constructor(user)
    {
        this.id = user._id,
        this.name = user.name,
        this.username = user.username,
        this.email = user.email,
        this.mobile = user.mobile,
        this.image = user.image && `${process.env.BASE_URL}storage/images/profile/${user.image}`,
        this.type = user.type && user.type.charAt(0).toUpperCase() + user.type.slice(1),
        this.address = user.address,
        this.status = user.status && user.status.charAt(0).toUpperCase()+user.status.slice(1),
        this.team = user.team && new TeamDto(Array.isArray(user.team) && user.team.length>0 ? user.team[0] : user.team);
        this.designation = user.designation;
        this.panNumber = user.panNumber;
        this.aadhaarNumber = user.aadhaarNumber;
        this.bankName = user.bankName;
        this.accountNumber = user.accountNumber;
        this.ifscCode = user.ifscCode;
        this.date = user.date;
    }

}

module.exports = UserDto;