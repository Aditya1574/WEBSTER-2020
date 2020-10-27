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
const { Strategy } = require("passport");
// const fs = require("fs"); 
// const path = require("path");      
// const multer = require("multer");   

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
  resave: true,
  saveUnitialized: true
}));

app.use(passport.initialize());
app.use(passport.session());

mongoose.connect("mongodb://localhost:27017/userDB", {useUnifiedTopology: true , useNewUrlParser: true});
mongoose.set("useCreateIndex" , true);

//-------------------------------------------Recruiter Matter----------------------------------------------------------------------------------------------------->
const vacancySchema = new mongoose.Schema({
  Name: String,
  position: String,
  salary: String,
  Place: String,
  type: String
});

const recruiterSchema = new mongoose.Schema({
id: String,  
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
Vacancy: [vacancySchema]
});

recruiterSchema.plugin(passportLocalMongoose); //for Recruiter
const Recruiter = mongoose.model("recruiter", recruiterSchema);
//-------------------------------------------Recruiter_ender------------------------------------------------------------------------------------------------------>
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
email: String,
googleId: String,
first_name: String,
last_name: String,
course: String,
Specialization: String,
course_type: String,
Linkdn: String,
School_info: schoolSchema,
College_info: collegeSchema,
projects: [projectSchema],
Skills: [String],
Hobbies: [String],
password: String
// profilePic: imageSchema
});

studentSchema.plugin(passportLocalMongoose); // for Student 
studentSchema.plugin(findOrCreate);  // google added


const User = mongoose.model("User", studentSchema);
const project = mongoose.model("project" , projectSchema);

//-------------------------------------------_Student_Ender_----------------------------------------------------------------------------------------------------->

function StrategyCreator(Type){                       //Strategy Created on the basis of Condition 
  if(Type === "STD"){
    passport.use(User.createStrategy());              // Student
  }else{
    passport.use(Recruiter.createStrategy());          //Recruiter
  }
}



passport.serializeUser(function(user, done) {  //student // works for all the strategies // google added
 done(null, user.id);
});

passport.deserializeUser(function(id, done) {  //Student // works for all the strategies // google added                                                                                         
  User.findById(id, function(err, user) {   
  done(err, user);
  });
  Recruiter.findById(id, function(err, user) {
  done(err, user);
  });
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
    User.find({googleId: profile.id}, function(err, Items){
      if(err){
       console.log(err);
      }else{
      //  console.log(Items.length);
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
        where = "FromGoogle";
        res.render("student_edit", {user: TempObj});
      }else{
        where = "FromGoogle";
        res.redirect("/student_loggedin");
    }
});


app.get("/student_loggedin",  function(req, res){
 /// StrategyCreator(TempObj.type);
  if(req.isAuthenticated()){
   console.log(TempObj ,  where);
   res.render("student_loggedin");
  }else{
   res.redirect("/login");
  }
});

app.get("/recruiter_loggedin", function(req, res){
 /// StrategyCreator(TempObj.type);
  if(req.isAuthenticated()){
   console.log(TempObj + " is logged in successfully");
   res.render("recruiter_loggedin");
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
  console.log(req);
   req.logout();
  res.redirect("/");
});

app.post("/student_edit", function(req, res){

  let Rec_Id  = req.body.Gid;
  let Rec_name = req.body.username;
  console.log(req.body);
  let x  = req.body.skillwala;
  let x1 = req.body.HobbyWala;
  let y = x.split(",");
  console.log(y);
  let y1 = x1.split(",");
  console.log(y1);
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
    College_info: College_Obj,
    projects: Final_projects,
    Skills: y,
    Hobbies: y1
  };

  if(where === "FromGoogle"){
    User.updateMany({googleId: Rec_Id}, {$set: Final_insertion}, function(err, result){
      if(err){
        //console.log(err + " At Google Student Route");
        res.send(err + " For Google Student Route!!");
      }else{
        where = "";
        res.redirect("/student_loggedin");
        // console.log("Updated Google Account SuccessFully"+ "Where's value =  " + where);  
      }
    });
  }else{
  User.updateMany({username: Rec_name}, {$set: Final_insertion}, function(err, result){
    if (err){
     // console.log(err + " At the Student Route");
      res.send(err + " For Normal Studdent Route!!");
    }else{
      console.log("Updated SuccessFully", result);
      res.redirect("/student_loggedin");
      // console.log("Updated SuccessFully", result);
    }
  });
}
  
});

app.post("/recruiter_edit", function(req, res){
  let Rec_Name =  req.body.username;
  console.log(req.body);
  let x  = req.body.levels;
  let y = x.split(",");
  console.log(y);
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
  levels: y
  };
  Recruiter.updateMany({username: Rec_Name}, {$set: Final_one}, function(err, result){
    if(err){
      console.log(err + " At the Recruiter Route");
    }else{
      console.log("updated Successfully", result);
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
    console.log(TempObj);
    passport.authenticate("local")(req, res, function(){
      res.render("student_edit", {user: TempObj});
    });
  }
});

});

app.post("/recruiter_register" , function(req, res){
  StrategyCreator(req.body.IDENTITY);
  console.log(req.body.username);
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

app.listen(3000, function(){
  console.log("The server is Running Properly at Port 3000");
});



