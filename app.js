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


const userSchema  = new mongoose.Schema({
username: String,
password: String,
googleId: String,
secret: String
});

userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);  // google added


const User = mongoose.model("User", userSchema);

passport.use(User.createStrategy());

passport.serializeUser(function(user, done) {             // works for all the strategies // google added
  done(null, user.id);
});

passport.deserializeUser(function(id, done) {          // works for all the strategies // google added
  User.findById(id, function(err, user) {
    done(err, user);
  });
});


let TempObj = {
  name: "",
  pass: null
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
    
      res.render("Student", {user: TempObj});
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



app.post("/register", function(req, res){
const temp = {   // add the rest of the entries
  name: req.body.username,
  pass: req.body.password
}

User.register({username: req.body.username} ,req.body.password , function(err , user){
  if(err){
    console.log(err + " at register route" );
    res.redirect("/register");
  }else{
    passport.authenticate("local")(req, res, function(){
      if(req.body.INDENTITY === "STD"){
        res.render("Student" , {user: temp});
        }
        else{
        res.render("Recruiter", {user: temp});
        }
    });
  }
});

});

app.post("/login", function(req, res){
const user = new User({                // add More entries here
  username: req.body.username,
  password: req.body.password
});
const temp = {
  name: req.body.username,
  pass: req.body.password
}
req.login(user, function(err){
  if(err){
    console.log(err);
    res.redirect("/login");
  }else{
    passport.authenticate("local")(req, res, function(){
      if(req.body.INDENTITY === "STDLOGIN"){
      res.render("Student" , {user: temp});
      }
      else{
      res.render("Recruiter" , {user: temp});
      }
    });
  }
});

});


app.listen(3000, function(){
  console.log("The server is Running Properly at Port 3000");
});




