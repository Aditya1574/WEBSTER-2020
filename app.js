//jshint esversion:6

require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const session = require("express-session");
const GoogleStrategy = require('passport-google-oauth20').Strategy;  // google added
const findOrCreate = require("mongoose-findorcreate");    // google added


let TempObj = {
  name: "",
  type: "",
  googleId: ""
};

let status = "";
let where = "";

const app = express();
app.set("view engine" , "ejs");
app.use(bodyParser.urlencoded({extended: true}));
app.use(express.static("public"));

app.use(session({
  secret: "ThisisaNewSecret",
  resave: false,
  saveUnitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());
mongoose.set("useFindAndModify", false);
mongoose.connect("mongodb://localhost:27017/userDB", {useUnifiedTopology: true , useNewUrlParser: true});
mongoose.set("useCreateIndex" , true);


//=======================================================Vacancy Starter===========================================================>
const vacancySchema = new mongoose.Schema({
  Name: String,
  position: String,
  salary: String,
  Place: String,
  MinCPI: String,
  type: String,
  Logo_link: String
});
//=======================================================Vacancy Ender==============================================================>

//-------------------------------------------Student_Matter------------------------------------------------------------------------------------------------------>
const projectSchema = new mongoose.Schema({
  Name: String,
  Desc: String,
  link: String
});

const schoolSchema = new mongoose.Schema({
  Name: String,
  YOS: String,
  NOB: String,
  CGPA: String 
});

const collegeSchema = new mongoose.Schema({
  NOC: String,
  YOG: String,
  CPI: String
});

const studentSchema  = new mongoose.Schema({
username: String,
googleId: String,
first_name: String,
last_name: String,
course: String,
Specialization: String,
course_type: String,
Linkdn: String,
Contact: String,
UserInfo: String,
School_info: schoolSchema,
College_info: collegeSchema,
projects: [projectSchema],
Skills: [String],
Hobbies: [String],
Applied_vacancy: [vacancySchema],
Avatar_link: String,
password: String
});

studentSchema.plugin(passportLocalMongoose); // for Student 
studentSchema.plugin(findOrCreate);  // google added
const User = mongoose.model("User", studentSchema);


//-------------------------------------------_Student_Ender_----------------------------------------------------------------------------------------------------->
//-------------------------------------------Recruiter Matter----------------------------------------------------------------------------------------------------->


const recruiterSchema = new mongoose.Schema({
username: String, 
Company: String,
Recruiter_name: String,
Recruiter_email: String,
Recruiter_Pos: String,
Company_email: String,
Recruiter_Phno: String,
Country: String,
City: String,
Experience: String,
Level: String,
Vacancy: [vacancySchema],
Applicants: [studentSchema],
Avatar_link: String,
password: String
});

recruiterSchema.plugin(passportLocalMongoose); //for Recruiter
const Recruiter = mongoose.model("recruiter", recruiterSchema);
//-------------------------------------------Recruiter_ender------------------------------------------------------------------------------------------------------>

function StrategyCreator(Type){                //Strategy Created on the basis of Condition 
  if(Type === "STD"){
    passport.use(User.createStrategy());       // Student
  }else{
    passport.use(Recruiter.createStrategy());   //Recruiter
  }
}



passport.serializeUser(function(user, done) {  //student // works for all the strategies // google added
 done(null, user.id);
});

passport.deserializeUser(function(id, done) {  //Student // works for all the strategies // google added                                                                                         
  if(TempObj.type === "STD"){
  User.findById(id, function(err, user) {   
  done(err, user);
  });
}else{
  Recruiter.findById(id, function(err, user) {
  done(err, user);
  });
}
});


// google added
passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret:  process.env.CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/secrets",
    userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo" //changed
  },
  function(accessToken, refreshToken, profile, cb) {
    // console.log(profile);
    TempObj.name = profile.displayName;
    TempObj.googleId = profile.id;
    TempObj.type = "STD"
    User.find({googleId: profile.id}, function(err, Items){
      if(err){
       console.log(err);
      }else{
        // console.log(Items);
       if(Items.length === 0){
        status = "New Registration";
        }else{
        status= "Old Registration";
      }
     }
    });
    User.findOrCreate({ googleId: profile.id }, function (err, user) {
      return cb(err, user);
    });
  }
));

app.get("/auth/google",                                           
  passport.authenticate("google", { scope: ['profile'] }));        
                                                                  
app.get("/auth/google/secrets",
    passport.authenticate("google", { failureRedirect: "/login" }),   
    function(req, res) {                                              
      // Sends to Edit Page if Not Already Registered                 
      if(status === "New Registration"){
        // console.log(req.isAuthenticated() + " @ New Registration");
        where = "FromGoogle";
        res.render("student_edit", {user: TempObj});
        TempObj.googleId = "";
      }else{
        // console.log(req.isAuthenticated() + " @ old Registration");
        where = "FromGoogle";
        res.redirect("/student_loggedin");
    }
});



app.get("/student_loggedin",  function(req, res){
  if(req.isAuthenticated()){
  if(where === "FromGoogle"){
     User.findOne({googleId: TempObj.googleId}, function(err, Items){
       if(err){
         console.log(err);
       }else{
        let FullName = Items.first_name + " " +  Items.last_name;
        let Email = Items.username;
        let SPEC = Items.Specialization;
        let COURSE = Items.course;
        let COURSE_TYPE = Items.course_type;
        let HOBBIES = Items.Hobbies;
        let COLLEGE_INFO = Items.College_info;
        let SCHOOL_INFO = Items.School_info;
        let PROJECTS = Items.projects;
        let LINKDN  = Items.Linkdn; 
        let CONTACT = Items.Contact;
        let USERINFO = Items.UserInfo;
        let SKILLS = Items.Skills;
        let AVA_LINK= Items.Avatar_link;
        let Final_Shot = {
          FullName: FullName,
          Email: Email,
          Spec: SPEC, 
          Course: COURSE,
          Course_Type: COURSE_TYPE,
          College_Info: COLLEGE_INFO,
          School_Info: SCHOOL_INFO,
          Linkdn: LINKDN,
          Contact: CONTACT,
          UserInfo: USERINFO,
          Link: AVA_LINK
        }
        res.render("student_loggedin", {Final: Final_Shot, Skills: SKILLS, Hobbies: HOBBIES,  Projects: PROJECTS});
       }
     });
  }else{ 
  User.findOne({username: TempObj.name} , function(err, Items){
    if(err){
      res.send(err);
    }else{
      let FullName = Items.first_name + " " +  Items.last_name;
      let Email = Items.username;
      let SPEC = Items.Specialization;
      let COURSE = Items.course;
      let COURSE_TYPE = Items.course_type;
      let HOBBIES = Items.Hobbies;
      let COLLEGE_INFO = Items.College_info;
      let SCHOOL_INFO = Items.School_info;
      let PROJECTS = Items.projects;
      let LINKDN  = Items.Linkdn; 
      let CONTACT = Items.Contact;
      let USERINFO = Items.UserInfo;
      let SKILLS = Items.Skills;
      let AVA_LINK= Items.Avatar_link;
      let Final_Shot = {
        FullName: FullName,
        Email: Email,
        Spec: SPEC, 
        Course: COURSE,
        Course_Type: COURSE_TYPE,
        College_Info: COLLEGE_INFO,
        School_Info: SCHOOL_INFO,
        Linkdn: LINKDN,
        Contact: CONTACT,
        UserInfo: USERINFO,
        Link: AVA_LINK
      }
      res.render("student_loggedin", {Final: Final_Shot, Skills: SKILLS, Hobbies: HOBBIES,  Projects: PROJECTS});
    }
  }); 
  }
  }else{ // if it is not authenticated
   res.redirect("/login");
  }
});

app.get("/recruiter_loggedin", function(req, res){
  if(req.isAuthenticated()){
  Recruiter.findOne({username: TempObj.name}, function(err, found){
    if(err){
      console.log(err);
    }else{
       let Final_one = {
       Rec_name: found.Recruiter_name,
       company: found.Company,
       Rec_email:found.Recruiter_email,
       Comp_email: found.Company_email,
       Rec_pos: found.Recruiter_Pos,
       Rec_Contact: found.Recruiter_Phno,
       Country: found.Country,
       City: found.City,
       Experience: found.Experience,
       Link: found.Avatar_link  
      }; 
    res.render("recruiter_loggedin" , {Final: Final_one});
    }
  });
  }else{
    res.redirect("/login");
  }
});


app.get("/", function(req, res){
  res.render("home");
});
  
app.get("/login", function(req, res){
  res.render("login");
});
  
app.get("/register", function(req, res){
  res.render("register");
});
  
app.get("/logout" , function(req, res){
  // console.log(req);
   req.logout();
  res.redirect("/");
});

app.post("/student_edit", function(req, res){
  let ava_link  = req.body.AVATAR;
  let Rec_Id  = req.body.Gid;
  let Rec_name = req.body.username;
  let Contact = req.body.contact;
  let userinfo = req.body.userinfo;
  // console.log(req.body);
  let x  = req.body.skillwala;
  let x1 = req.body.HobbyWala;
  let y = x.split(",");  
  //console.log(y);
  let y1 = x1.split(",");
  //console.log(y1);
  let Project_names = req.body.P0name;
  let Project_desc = req.body.P0desc;
  let Project_Links = req.body.Link0;
  let Final_projects  = [];
  if(typeof(Project_Links) === "string"){
    let temp1 = {Name: Project_names, Desc: Project_desc, link: Project_Links};
    Final_projects.push(temp1);
  }else{
  let L = Project_Links.length;
  for(let i=0;i<L;i++){
    let temp = {Name: Project_names[i], Desc: Project_desc[i], link: Project_Links[i]};
    Final_projects.push(temp); 
  }
}
  let School_Obj = {
   Name: req.body.NOS,
   YOS: req.body.YOHSCC,
   NOB: req.body.NOB,
   CGPA: req.body.CGPA
  };
  let College_Obj = {
   NOC: req.body.NOC,
   YOG: req.body.YOG,
   CPI: req.body.CPI
  };

  let Final_insertion = {
    first_name: req.body.fname,
    last_name: req.body.lname,
    course: req.body.course,
    Specialization: req.body.SPEC,
    course_type: req.body.CT,
    Linkdn: req.body.LINKDN,
    School_info: School_Obj,
    Contact: Contact,
    UserInfo: userinfo,
    College_info: College_Obj,
    projects: Final_projects,
    Skills: y,
    Hobbies: y1,
    Avatar_link: ava_link
  };

  if(where === "FromGoogle"){
  User.updateMany({googleId: Rec_Id}, {$set: Final_insertion}, function(err, result){
      if(err){
        //console.log(err + " At Google Student Route");
        res.send(err + " For Google Studdent Route!!");
      }else{
        // where = "";
        res.redirect("/student_loggedin");
        // console.log("Updated Google Account SuccessFully"+ "Where's value =  " + where);  
      }
    });
  }else{
  User.updateMany({username: Rec_name}, {$set: Final_insertion}, function(err, result){
    if (err){
     console.log(err + " At the Student Route");
      res.send(err + " For Normal Studdent Route!!");
    }else{
     // console.log("Updated SuccessFully", result);
      res.redirect("/student_loggedin");
      // console.log("Updated SuccessFully", result);
    }
  });
}
  
});

app.post("/recruiter_edit", function(req, res){
  let Rec_Name =  req.body.username;
  //console.log(req.body);
  let x  = req.body.levels;
  let y = x.split(",");
  //console.log(y);
  let Final_one = {
  Company: req.body.CNAME,
  Recruiter_name: req.body.RNAME,
  Recruiter_Pos: req.body.DNAME,
  Company_email: req.body.Cmail,
  Recruiter_email: req.body.Rmail,
  Recruiter_Phno: req.body.PHNO,
  Country: req.body.CoNAME,
  City: req.body.CiNAME,
  Experience:  req.body.HEXP,
  levels: y,
  Avatar_link: req.body.AVATAR
  };
  Recruiter.updateMany({username: Rec_Name}, {$set: Final_one}, function(err, result){
    if(err){
      console.log(err + " At the Recruiter Route");
    }else{
      // console.log("updated Successfully", result);
      res.redirect("/recruiter_loggedin");
    }
  });

});

app.post("/student_register", function(req, res){
StrategyCreator(req.body.IDENTITY);
TempObj.name = req.body.username;
TempObj.type = req.body.IDENTITY;
  User.register({username: req.body.username}, req.body.password , function(err , user){
  if(err){
    console.log(err + " at Student register route" );
    res.redirect("/register");
  }else{
    //console.log(TempObj);
    passport.authenticate("local")(req, res, function(){
      res.render("student_edit", {user: TempObj});
    });
  }
});

});

app.post("/recruiter_register" , function(req, res){
StrategyCreator(req.body.IDENTITY);
//console.log(req.body.username);
TempObj.name = req.body.username;
TempObj.type = req.body.IDENTITY;
  Recruiter.register({username: req.body.username}, req.body.password, function(err, recruiter){
    if(err){
      console.log(err + " at Recruiter register Route");
      res.redirect("/register");
    }else{
      passport.authenticate("local")(req, res, function(){
       res.render("recruiter_edit", {user: TempObj});
      });
    }
  });
});

app.post("/student_login", function(req, res){
StrategyCreator(req.body.IDENTITY);
const user = new User({                // add More entries here
  username: req.body.username,
  password: req.body.password
});

TempObj.name = req.body.username;
TempObj.type = req.body.IDENTITY;
req.login(user, function(err){
  if(err){
    console.log(err);
    res.redirect("/login");
  }else{
    passport.authenticate("local")(req, res, function(){
       res.redirect("/student_loggedin");
    });
  }
});

});

app.post("/recruiter_login", function(req, res){
  StrategyCreator(req.body.IDENTITY);
  const recruiter = new Recruiter({
   username: req.body.username,
   password: req.body.password
  });

  TempObj.name = req.body.username;
  TempObj.type = req.body.IDENTITY;
  req.login(recruiter, function(err){
    if(err){
      console.log(err);
    }else{
      passport.authenticate("local")(req, res, function(){
        res.redirect("/recruiter_loggedin");
      });
    }
  });
});
let k=0;

app.post("/Vacancy_poster", function(req, res){
  let postedVacancy = {
    Name: req.body.TITLE,
    position: req.body.ROLE,
    salary: req.body.CURRENCY + req.body.Exp_Sal,
    Place: req.body.COUNTRY + " ," + req.body.CITY,
    MinCPI: req.body.CPI,
    type: req.body.TYPE,
    Logo_link: req.body.LINK
  };
  console.log(postedVacancy);
 
   Recruiter.findOne({username: TempObj.name} , function(err, result){
     if(err){
       console.log(err+ " At post route");
     }else{
        //console.log(result);
        let pusher = result.Vacancy;
        pusher.push(postedVacancy);
        Recruiter.updateOne({username: TempObj.name}, { $set: { Vacancy: pusher } }, function(error, Result){
          if(err){
            console.log(err);
          }else{
            res.redirect("/Vacancy_poster");
          }
        });  
     }
   });
  
});

app.get("/Vacancy_poster", function(req, res){

  Recruiter.findOne({username: TempObj.name} , function(err, found_Rec){
    if(err){
      console.log(err + " at get route");
    }else{
      //console.log(found_Rec);
      res.render("Vacancy_poster", {ADDS: found_Rec.Vacancy});
    }
  });
});

app.get("/Student_vacancy", function(req, res){
  User.findOne({username: TempObj.name}, function(err, student){
    if(err){
      console.log(err);
    }else{
      // console.log(student);
      Recruiter.find({Vacancy: { $ne: null } }, function(err, available_rec){
        if(err){
          console.log(err);
        }else{
          // console.log(available_rec[0].Vacancy);
          let x = [];
          available_rec.forEach(function(element){
          element.Vacancy.forEach(function(ele){
           x.push(ele);
          });
          });
          // console.log(x);
          // console.log(student);
          let student_CPI = student.College_info.CPI;
          let Final_rec = x.filter(function(element){
            return (element.MinCPI <= student_CPI);
          });
          //console.log(student.Applied_vacancy)
          res.render("Student_vacancy", {pushed: Final_rec, applied: student.Applied_vacancy});
        }
      });
      // of Student 
    }
  });
});

app.get("/applyRoute/:id", function(req, res){
   let finder = req.params.id;
   //console.log(finder)
   Recruiter.findOne({Vacancy: { $elemMatch: { _id: { $eq: finder } } } }, function(err, result){
     if(err){
       console.log(err);
     }else{
      //console.log("Recruiter out of User result= = " +  result);
      User.findOne({username: TempObj.name}, function(error, found){
        if(error){
          console.log(error);
        }else{
          let pusher = result.Vacancy;
          let getter = {};
          for(let i=0; i<pusher.length;i++){ 
            if(pusher[i]._id == finder){
              getter = pusher[i];
            }
          }
          User.updateOne({username: TempObj.name}, { $push: { Applied_vacancy: getter } }, function(error, Result){
            if(error){
              console.log(error);
            }else{
              Recruiter.updateOne({username: result.username}, {$push: {Applicants: found}}, function(Error, RES){
                if(Error){
                  console.log(Error);
                }else{
                  res.redirect("/Student_vacancy");
                }
              });
            }
          }); 
        }
      }); 
     }
   });
});

app.get("/deleteRoute/:id" , function(req, res){
  let finder = req.params.id;                          //pull    //from     //thisThing
  Recruiter.findOneAndUpdate({username: TempObj.name}, { $pull: { Vacancy: {_id: finder} } }, function(err, result){
    if(err){
      console.log(err);
    }else{
      res.redirect("/Vacancy_poster");
    }
  });
});

app.get("/applicantRoute/:id", function(req, res){
let finder = req.params.id;
User.find({Applied_vacancy: { $elemMatch: { _id: { $eq: finder }  } } }, function(err, found){
  if(err){
    console.log(err);
    res.send("<h1><center>Sorry! Unfortunately the App Crashed!</center></h1>")
  }else{
     res.render("View_Applicant", {applicants: found});
  }
});

});

app.get("/viewProfile/:id", function(req, res){
  let finder = req.params.id;
  User.findOne({_id: finder}, function(err, found){
   if(err){
     console.log(err);
   }else{
    let FullName = found.first_name + " " +  found.last_name;
    let Email = found.username;
    let SPEC = found.Specialization;
    let COURSE = found.course;
    let COURSE_TYPE = found.course_type;
    let HOBBIES = found.Hobbies;
    let COLLEGE_INFO = found.College_info;
    let SCHOOL_INFO = found.School_info;
    let PROJECTS = found.projects;
    let LINKDN  = found.Linkdn; 
    let CONTACT = found.Contact;
    let USERINFO = found.UserInfo;
    let SKILLS = found.Skills;
    let AVA_LINK = found.Avatar_link;
    let Final_Shot = {
      FullName: FullName,
      Email: Email,
      Spec: SPEC, 
      Course: COURSE,
      Course_Type: COURSE_TYPE,
      College_Info: COLLEGE_INFO,
      School_Info: SCHOOL_INFO,
      Linkdn: LINKDN,
      Contact: CONTACT,
      UserInfo: USERINFO,
      Link: AVA_LINK
    }
    res.render("Applicant", {Final: Final_Shot, Skills: SKILLS, Hobbies: HOBBIES,  Projects: PROJECTS});
   }
  });
});

app.listen(3000, function(){
  console.log("The server is Running Properly at Port 3000");
});
