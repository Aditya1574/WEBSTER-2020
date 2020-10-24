//jshint esversion:6
// const fs = require("fs"); 
// const path = require("path"); 
// const multer = require("multer");
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
  type: ""
}


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

mongoose.connect("mongodb://localhost:27017/userDB", {useUnifiedTopology: true , useNewUrlParser: true});
mongoose.set("useCreateIndex" , true);


//-------------------------------------------Image Matter ----------------------------------------------------------------------------------------------------->
// const imageSchema = new mongoose.Schema({ 
//   name: String, 
//   img: 
//   { 
//       data: Buffer, 
//       contentType: String 
//   } 
// }); 

// const Image = new mongoose.model("Image", imageSchema);

// let storage = multer.diskStorage({ 
//   destination: (req, file, cb) => { 
//       cb(null, "uploads") 
//   }, 
//   filename: (req, file, cb) => { 
//       cb(null, file.fieldname + '-' + Date.now()) 
//   } 
// }); 

// let upload = multer({ storage: storage }); 
//-------------------------------------------Image Ender----------------------------------------------------------------------------------------------------->

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
Recruiter_Pos: String,
Recruiter_email: String,
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
//-------------------------------------------Recruiter ender ----------------------------------------------------------------------------------------------------->

//-------------------------------------------Student Matter ----------------------------------------------------------------------------------------------------->
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
password: String,
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
Hobbies: [String]
// profilePic: imageSchema
});

studentSchema.plugin(passportLocalMongoose); // for Student 
studentSchema.plugin(findOrCreate);  // google added


const User = mongoose.model("User", studentSchema);
const project = mongoose.model("project" , projectSchema);

//------------------------------------------- Student Ender ----------------------------------------------------------------------------------------------------->

function StrategyCreator(Type){   //Strategy Created on the basis of Condition 
  if(Type === "STD"){
    passport.use(User.createStrategy()); // Student
  }else{
    passport.use(Recruiter.createStrategy()); //Recruiter
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
    TempObj.name = profile.displayName;
    User.findOrCreate({ googleId: profile.id }, function (err, user) {
      return cb(err, user);
    });
  }
));



app.get("/", function(req, res){
  res.render("home");
});

app.get("/auth/google",                                           /* "/auth/google" is the First to be invoked path and it is basically a passport */ //google added
  passport.authenticate("google", { scope: ['profile'] }));       /*  plugin for authenticating the user using   */ 
                                                                  /* google strategy at the Lines : 61-74 and is  demanding for the profile containing all the info about the user */   
app.get("/auth/google/secrets",
    passport.authenticate("google", { failureRedirect: "/login" }),   //authenticate locally // google added
    function(req, res) {                                             /* "/auth/google/secrets" is the Link where one is redirected by google  when  */
      // Done Finally                                               /* it is authenticated by the google serves */
    
      res.render("Student_login", {user: TempObj});
});



app.get("/login", function(req, res){
  res.render("login");
});

app.get("/register", function(req, res){
  res.render("register");
});

app.get("/logout" , function(req, res){
   req.logout();
  res.redirect("/");
});

app.post("/Student_edit", function(req, res){

  let Rec_name = req.body.username;
  console.log(req.body);
  let x  = req.body.skillwala;
  let x1 = req.body.HobbyWala;
  let y = x.split(",");
  let y1 = x1.split(",");
  let Project_names = req.body.P0name;
  let Project_desc = req.body.P0desc;
  let Project_Links = req.body.Link0;
  let Final_projects  = [];
  let L = Project_Links.length;
  for(let i=0;i<L;i++){
    let temp = {Name: Project_names[i], Desc: Project_desc[i], link: Project_Links[i]};
    Final_projects.push(temp); 
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

// let obj = { 
//     name: req.body.Profile_pic, 
//     img: { 
//         data: fs.readFileSync(path.join(__dirname + "/uploads/" + req.file.filename)), 
//         contentType: 'image/png'
//     } 
// } 
// Image.create(obj, (err, item) => { 
//     if (err) { 
//         console.log(err); 
//     } 
//     else { 
//         console.log("Created Succesfully");
//     } 
// });

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
    // profilePic: obj
  };
  User.updateMany({username: Rec_name}, {$set: Final_insertion}, function(err, res){
    if (err){
      console.log(err);
    }else{
      console.log("Updated SuccessFully");
    }
  });
  
});

app.post("/Recruiter_edit", function(req, res){
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
  Recruiter.updateMany({username: Rec_Name}, {$set: Final_one}, function(err, res){
    if(err){
      console.log(err);
    }else{
      console.log("updated Successfully");
    }
  });

});

app.post("/student_register", function(req, res){

TempObj.name = req.body.username;
StrategyCreator(req.body.IDENTITY);
  User.register({username: req.body.username}, req.body.password , function(err , user){
  if(err){
    console.log(err + " at Student register route" );
    res.redirect("/register");
  }else{
    console.log(TempObj);
    passport.authenticate("local")(req, res, function(){
      res.render("Student_edit", {user: TempObj});
    });
  }
});

});

app.post("/recruiter_register" , function(req, res){
  TempObj.name = req.body.username;
  StrategyCreator(req.body.IDENTITY);
  Recruiter.register({username: req.body.username}, req.body.password, function(err, recruiter){
    if(err){
      console.log(err + " at Recruiter register Route");
      res.redirect("/register");
    }else{
      passport.authenticate("local")(req, res, function(){
       res.render("Recruiter_edit", {user: TempObj});
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
      res.render("Student_login" , {user: TempObj});
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
        res.render("Recruiter_login", {user: TempObj});
      });
    }
  });
});

app.listen(3000, function(){
  console.log("The server is Running Properly at Port 3000");
});



