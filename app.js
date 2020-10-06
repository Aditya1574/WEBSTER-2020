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
  secret: "LoveforKrishnaisbiggestSecret",
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

// google added
passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret:  process.env.CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/secrets",
    userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo" //changed
  },
  function(accessToken, refreshToken, profile, cb) {
    User.findOrCreate({ googleId: profile.id }, function (err, user) {
      return cb(err, user);
    });
  }
));


app.get("/", function(req, res){
  res.render("home");
});

app.get("/auth/google",                                          //authenticate on google // google added
  passport.authenticate("google", { scope: ['profile'] }));

app.get("/auth/google/secrets",
    passport.authenticate("google", { failureRedirect: "/login" }),   //authenticate locally // google added
    function(req, res) {
      // Successful authentication, redirect home.
      res.redirect("/secrets");
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

app.get("/secrets" , function(req, res){
  User.find({"secret": {$ne: null}} , function(err , foundList){
    if(err){
      console.log(err);
    }else{
      if(req.isAuthenticated()){res.render("secrets" , {userSecrets: foundList});}
      else{res.redirect("/login");}
    }
  });
});


app.get("/submit" , function(req, res){
  if(req.isAuthenticated()){
    res.render("submit");
  }else{
    res.send("<h1>Forbidden</h1><hr><h2>Error 401</h2><hr><b>Unauthorised access</b>");
  }
});

app.post("/register" ,function(req, res){

User.register({username: req.body.username} ,req.body.password , function(err , user){
  if(err){
    console.log(err + " at register route" );
    res.redirect("/register");
  }else{
    passport.authenticate("local")(req, res, function(){
    res.redirect("/secrets");
    });
  }
});

});

app.post("/login", function(req, res){
const user = new User({
  username: req.body.username,
  password: req.body.password
});
req.login(user, function(err){
  if(err){
    console.log(err);
    res.redirect("/login");
  }else{
    passport.authenticate("local")(req, res, function(){
      if(req.body.INDENTITY === "STDLOGIN"){
      res.render("Student");
      }
      else{
      res.render("Recruiter");
      }
    });
  }
});

});


app.post("/submit" , function(req, res){
  const secret = req.body.secret;
  User.findById(req.user.id , function(err ,  foundUser){
    if(err){
      console.log(err);
    }else{
      if(foundUser) {
         foundUser.secret = secret;
         foundUser.save(function(){
           res.redirect("/secrets");
         });
      } //foundUser if statement
    } // else
  }); // findById
});
app.listen(3000, function(){
  console.log("The server is Running Properly at Port 3000");
});



// for adding something to the secret page using submit page
// const secretSchema = new mongoose.Schema({secret: String});
// const Secret = mongoose.model("Secret" , secretSchema);
//
// app.post("/submit" , function(req, res){
//   const newsecret = new Secret({secret: req.body.secret});
//   newsecret.save(function(err) {
//     if(err){
//       console.log(err);
//     }else{
//        console.log("Added");
//        Secret.find({}, function(err, foundList){
//          if(!err){
//            res.render("secrets" , {<array-var-name>: foundList});
//          }
//        });
//     }
//   });
// });
//
// replace
//  res.render("secrets");
//  with
//  Secret.find({}, function(err, foundList){
//    if(!err){
//      res.render("secrets" , {<array-var-name>: foundList});
//    }
//  });
