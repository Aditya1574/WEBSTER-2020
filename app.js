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
Level: String
});

const projectSchema = new mongoose.Schema({
  Name: String,
  Desc: String,
  link: String
});

const studentSchema  = new mongoose.Schema({
email: String,
password: String,
googleId: String,
first_name: String,
last_name: String,
highest_Quali: String,
course: String,
Specialization: String,
College: String,
course_type: String,
Grad_Year: String,
projects: [projectSchema],
Skills: [String]
});

studentSchema.plugin(passportLocalMongoose); // for Student 
recruiterSchema.plugin(passportLocalMongoose); //for Recruiter
studentSchema.plugin(findOrCreate);  // google added


const User = mongoose.model("User", studentSchema);
const project = mongoose.model("project" , projectSchema);
const Recruiter = mongoose.model("recruiter", recruiterSchema);

passport.use(User.createStrategy()); // Student
passport.use(Recruiter.createStrategy()); //Recruiter

passport.serializeUser(function(user, done) {    //student // works for all the strategies // google added
  done(null, user.id);
});

passport.deserializeUser(function(id, done) {   //Student // works for all the strategies // google added                                              
  User.findById(id, function(err, user) {   
  done(err, user);
  });
  Recruiter.findById(id, function(err, user) {
  done(err, user);
  });
});

let TempObj = {
  name: ""
}
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

app.get("/auth/google",                                          /* "/auth/google" is the First to be invoked path and it is basically a passport */ //google added
  passport.authenticate("google", { scope: ['profile'] }));     /*  plugin for authenticating the user using   */ 
                                                              /* google strategy at the Lines : 61-74 and is  demanding for the profile containing all the info about the user */   
app.get("/auth/google/secrets",
    passport.authenticate("google", { failureRedirect: "/login" }),   //authenticate locally // google added
    function(req, res) {                                             /* "/auth/google/secrets" is the Link where one is redirected by google  when  */
      // Done Finally                                               /* it is authenticated by the google serves */
    
      res.render("Student_login", {user: TempObj});
});

app.get("/Student_edit", function(req, res){
if(req.isAuthenticated()){
  res.render("Student_edit", {user: TempObj});
}else{
  res.redirect("/register");
}
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
  console.log(req.body);
  let x  = req.body.skillwala;
  let y = x.split(",");
  console.log(y);
});


app.post("/student_register", function(req, res){
 
TempObj.name = req.body.username;
User.register({username: req.body.username}, req.body.password , function(err , user){
  if(err){
    console.log(err + " at Student register route" );
    res.redirect("/register");
  }else{
    passport.authenticate("local")(req, res, function(){
        res.redirect("/Student_edit");
    });
  }
});

});

app.post("/recruiter_register", function(req, res){
TempObj.name = req.body.username;
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
const user = new User({                // add More entries here
  username: req.body.username0,
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




