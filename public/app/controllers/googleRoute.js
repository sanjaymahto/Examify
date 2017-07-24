var express = require('express'),
    app = express(),
    server = require('http').createServer(app),
    passport = require('passport'),
    util = require('util'),
    bodyParser = require('body-parser'),
    cookieParser = require('cookie-parser'),
    session = require('express-session'),
    RedisStore = require('connect-redis')(session),
    GoogleStrategy = require('passport-google-oauth2').Strategy;
app.use(require('morgan')('combined'));
var GoogleAuth = require('../models/GoogleAuth');

var GOOGLE_CLIENT_ID = "570609486769-cpvj79ktob43ls04smp86hl4laavk68l.apps.googleusercontent.com",
    GOOGLE_CLIENT_SECRET = "GTqQIvQLuTMZffRGl1EGvUc1";

module.exports = function (app, passport) {

    var resGenerator = require('./../../libs/resGenerator');
    //defining token...
    var token;

    // used to create, sign, and verify tokens
    var jwt = require('jsonwebtoken');

    //json secret key
    var jsonSecret = "97hw9a73hr2q@#$#@mo8afjoeidha0e8doh";

    //defining decoded tokens...
    var decodedToken;

    var auth = function (req, res, next) {
        // check header or url parameters or post parameters for token
        var token = req.body.token || req.query.token || req.headers['x-access-token'];
        // decode token
        if (token) {
            // verifies secret and checks exp
            jwt.verify(token, "97hw9a73hr2q@#$#@mo8afjoeidha0e8doh", function (err, decoded) {
                if (err) {
                    return res.json({
                        success: false,
                        message: 'Failed to authenticate token.'
                    });
                } else {
                    // if everything is good, save to request for use in other routes
                    decodedToken = decoded;
                    //console.log("Decoded Token"); 
                    //console.log(decodedToken);  
                    next();
                }
            });
        }
    }


    passport.serializeUser(function (user, done) {
        done(null, user);
    });

    passport.deserializeUser(function (obj, done) {
        done(null, obj);
    });


    passport.use(new GoogleStrategy({
            clientID: GOOGLE_CLIENT_ID,
            clientSecret: GOOGLE_CLIENT_SECRET,
            callbackURL: "http://ec2-54-179-155-238.ap-southeast-1.compute.amazonaws.com:3000/auth/google/callback",
            passReqToCallback: true
        },
        function (request, accessToken, refreshToken, profile, done) {
            // asynchronous verification, for effect...
            process.nextTick(function () {

                GoogleAuth.findOne({
                    'id': profile.id
                }, function (err, user) {
                    console.log(profile);
                    console.log(user);
                    if (err)
                        return done(err);
                    if (user)
                        return done(null, user);
                    else {

                        var newUser = new GoogleAuth();
                        newUser.id = profile.id;
                        newUser.name = profile.displayName;
                        newUser.email = profile.emails[0].value;

                        newUser.save(function (err) {
                            if (err)
                                throw err;
                            return done(null, newUser);
                        })

                    }
                });
                return done(null, profile);
            });
        }
    ));


    app.get('/auth/google', passport.authenticate('google', {
        scope: [
       'https://www.googleapis.com/auth/plus.login',
       'https://www.googleapis.com/auth/plus.profile.emails.read']
    }));

    app.get('/auth/google/callback',
        passport.authenticate('google', {
            failureRedirect: '/'
        }),

        function (req, res) {

            var user = req.user;
            //creating jwt token for user to authenticate other requests
            token = jwt.sign({
                exp: Math.floor(Date.now() / 1000) + (60 * 60 * 60),
                id: user._id,
                email: user.email,
                name: user.name
            }, jsonSecret);

            var response = resGenerator.generate(false, "Logged in Successfully", 200, user);
            response.token = token;
            res.json(response);
        });

    function ensureAuthenticated(req, res, next) {
        if (req.isAuthenticated()) {
            console.log("hello!" + req.user.displayName);
            return next();
        } else {
            res.send("not Found");
        }
    }

}
