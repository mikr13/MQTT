// config/passport.js

// load all the things we need
var LocalStrategy = require('passport-local').Strategy;
var util = require('util');
var flash = require('connect-flash');
var FacebookStrategy = require('passport-facebook').Strategy;

var config = require('../secret/config');

// load up the user model
var mysql = require('mysql');
var bcrypt = require('bcrypt-nodejs');
var con = mysql.createConnection({
  host: config[con].host,
  user: config[con].user,
  password: config[con].password,
  database: config[con].database
});

app.use(flash());

var config = {
  "facebook_api_key"      :     config[fb].facebook_api_key,
  "facebook_api_secret"   :     config[fb].facebook_api_secret,
  "callback_url"          :     config[fb].callback_url,
};

// expose this function to our app using module.exports
module.exports = function(passport) {

    // =========================================================================
    // passport session setup ==================================================
    // =========================================================================
    // required for persistent login sessions
    // passport needs ability to serialize and unserialize users out of session

    // used to serialize the user for the session
    passport.serializeUser(function(user, done) {
        done(null, user.id);
    });

    // used to deserialize the user
    passport.deserializeUser(function(id, done) {
        con.query("SELECT * FROM users WHERE id = ? ",[id], function(err, rows){
            done(err, rows[0]);
       });
    });

    // =========================================================================
    // LOCAL SIGNUP ============================================================
    // =========================================================================
    // we are using named strategies since we have one for login and one for signup
    // by default, if there was no name, it would just be called 'local'

    passport.use(
        'local-signup',
        new LocalStrategy({
            // by default, local strategy uses username and password, we will override with email
            //nameField: 'Name',
            usernameField : 'Email',
            passwordField : 'Password',
            passReqToCallback : true // allows us to pass back the entire request to the callback
        },
        function(req, Email, Password, done) {
            // find a user whose email is the same as the forms email
            // we are checking to see if the user trying to login already exists
            con.query("SELECT * FROM users WHERE Email = ?",[Email], function(err, rows) {
                if (err)
                    return done(err);
                if(req.body.Password!= req.body.CPassword) {
                    return done(null, false, req.flash('Message', "Password doesn't match."));
                }
                if (rows.length) {
                    return done(null, false, req.flash('Message', 'That username is already taken.'));
                } else {
                    // if there is no user with that username
                    // create the user
                    var newUserMysql = {
                        name: req.body.Name,
                        email: Email,
                        password: bcrypt.hashSync(Password, null, null)  // use the generateHash function in our user model
                    };

                    var insertQuery = "INSERT INTO users (Name, Email, Password ) values (?,?,?)";

                    con.query(insertQuery,[newUserMysql.name, newUserMysql.email, newUserMysql.password],function(err, rows) {
                        newUserMysql.id = rows.insertId;
                        return done(null, newUserMysql);
                    });
                }
            });
        })
    );

    // =========================================================================
    // LOCAL LOGIN =============================================================
    // =========================================================================
    // we are using named strategies since we have one for login and one for signup
    // by default, if there was no name, it would just be called 'local'

    passport.use(
        'local-login',
        new LocalStrategy({
            // by default, local strategy uses username and password, we will override with email
            usernameField : 'Email',
            passwordField : 'Password',
            passReqToCallback : true // allows us to pass back the entire request to the callback
        },
        function(req, Email, Password, done) { // callback with email and password from our form
            con.query("SELECT * FROM users WHERE Email = ?",[Email], function(err, rows){
                if (err)
                    return done(err);
                if (!rows.length) {
                    return done(null, false, req.flash('Message', 'No user found.')); // req.flash is the way to set flashdata using connect-flash
                }

                // if the user is found but the password is wrong
                if (!bcrypt.compareSync(Password, rows[0].Password))
                    return done(null, false, req.flash('Message', 'Oops! Wrong password.')); // create the loginMessage and save it to session as flashdata
                // all is well, return successful user
                return done(null, rows[0]);
            });
        })
    );

        // Use the FacebookStrategy within Passport.
    passport.use(new FacebookStrategy({
        clientID: config.facebook_api_key,
        clientSecret:config.facebook_api_secret ,
        callbackURL: config.callback_url,
        profileFields: ["id", "email", "first_name", "gender", "last_name"]
      },
      function(accessToken, refreshToken, profile, done) {
        process.nextTick(function () {
          console.log(profile);
          //Further DB code.
            con.query("SELECT * FROM users WHERE Email = ?",[profile._json.email], function(err, rows) {
                if (err)
                    return done(err);
                if (rows.length) {
                    return done(null, rows[0]);
                } else {
                    // if there is no user with that username
                    // create the user
                    var newUserMysql = {
                        name: profile._json.first_name+" "+profile._json.last_name,
                        email: profile._json.email,
                    };

                    var insertQuery = "INSERT INTO users (Name, Email) values (?,?)";

                    con.query(insertQuery,[newUserMysql.name, newUserMysql.email],function(err, rows) {
                        newUserMysql.id = rows.insertId;
                        return done(null, newUserMysql);
                    });
                }
            });
        });
      }
    ));
//getClientID = function() {
//  var insertQuery = "SELECT email FROM users "
//};

};
