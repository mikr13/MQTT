// set up ======================================================================
// get all the tools we need
var http = require('http');
var url = require('url');
var fs = require('fs');
var mysql = require('mysql');
var qs = require('querystring');
var ejs=require('ejs');
var ex=require('express');
var bodyParser = require('body-parser');
var cookieParser = require('cookie-parser');
var session = require('express-session');
var mqtt = require('mqtt');
var morgan = require('morgan');
var passport = require('passport');
var flash    = require('connect-flash');
var LocalStrategy = require('passport-local').Strategy;

// for client ===============================================================
global.client=[];
var flag=[];
var flagsesstopic=[];
var topic=[];
var msg=[];
var lastmsg=[];
var qq=0;
var clientId=[];
var retain='false';
var flagfromdevpage=[];
var lenmsg= [];

//app use and require ===============================================================
app=ex();
app.set('view engine', 'ejs');
app.use(flash());
app.use(ex.static(__dirname + '/public'));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
require('./config/passport')(passport); // pass passport for configuration

// required for session ===============================================================
app.use(session({
  secret: 'man home secret tour',
  resave: false,
  saveUninitialized: true,
  cookie: {maxAge: 3600000, secure:false}
}));
app.use(passport.initialize());
app.use(passport.session()); // persistent login sessions
app.use(flash()); // use connect-flash for flash messages stored in session

//app router and client code ===============================================================

  app.get('/', function(req, res){
      topic[req.session.id]=topic[req.session.id]?topic[req.session.id]:[];
      msg[req.session.id]=msg[req.session.id]?msg[req.session.id]:[];
      lastmsg[req.session.id]=lastmsg[req.session.id]?lastmsg[req.session.id]:[];
      clientId[req.session.id]=[];
      client[req.session.id]=client[req.session.id]?client[req.session.id]:[];
      flag[req.session.id]=0;
      flagsesstopic[req.session.id]=0;
      flagfromdevpage[req.session.id]=0;
      res.render('front', { message: req.flash('Message')});    
  });

  app.post('/login', passport.authenticate('local-login', {
        successRedirect : '/connecting', // redirect to the secure profile section
        failureRedirect : '/', // redirect back to the signup page if there is an error
        failureFlash : true // allow flash messages
    }),
        function(req, res) {
            if (req.body.remember) {
              req.session.cookie.maxAge = 1000 * 60 * 3;
            } else {
              req.session.cookie.expires = false;
            }
        res.redirect('/');
  });

  app.post('/signup', passport.authenticate('local-signup', {
        successRedirect : '/connecting',
        failureRedirect : '/', // redirect back to the signup page if there is an error
        failureFlash : true // allow flash messages
  }));

  app.get('/auth/facebook', passport.authenticate('facebook', { scope: ['email', 'public_profile']}));
    app.get('/auth/facebook/callback',
      passport.authenticate('facebook', {
           successRedirect : '/connecting',
           failureRedirect: '/'
      }),
      function(req, res) {
        res.redirect('/');
    });


  app.get('/devpage', function (req, res) {

      topic[req.session.id]=topic[req.session.id]?topic[req.session.id]:[];
      msg[req.session.id]=msg[req.session.id]?msg[req.session.id]:[];
      lastmsg[req.session.id]=lastmsg[req.session.id]?lastmsg[req.session.id]:[];
      clientId[req.session.id]=[];
      client[req.session.id]=client[req.session.id]?client[req.session.id]:[];
      flag[req.session.id]=0;
      flagfromdevpage[req.session.id]=0;
      flagsesstopic[req.session.id]=0;
      lenmsg[req.session.id]=0;
      return res.render('index', {data:"Please provide connection details..."});
  });

  var resarr=[];
  var resi=0;

  app.post('/devpage', function(req, res) {
    resi=resi+1;
    resarr[resi]=res;
    
    flag[req.session.id]=1;
    flagfromdevpage[req.session.id]=1;
    var protocol=req.body.protocol;
    var host=req.body.host;
    var port=req.body.port;
    var user=req.body.user;
    var password=req.body.password;
    var clientid=req.body.clientid;
    clientId[req.session.id] = clientid +'_' + Math.random().toString(16).substr(2, 8);
      var url=protocol+host+":"+port;
      var options = {
          username: user,
          password: password,   
          keepalive: 10,
          clientId: clientId[req.session.id],   
          clean: true,
          resubscribe: false,
          reconnectPeriod: 1000,
          connectTimeout: 30 * 1000,
      };

      if(flagsesstopic[req.session.id]==0 && client[req.session.id].length!==0)
      {
        client[req.session.id].end();
        client[req.session.id]=[];
      }

      client[req.session.id]  = mqtt.connect(url, options);
      client[req.session.id].on('connect', function () {
        if(!resarr[resi].headersSent)
        {
          
          return resarr[resi].redirect('/pubsub'); 
        }
      })
    client[req.session.id].on('error', function () {
      
      if(flag[req.session.id]==1)
      {
        flag[req.session.id]=0;

        if (typeof res=="object");
        {
          
          if(!resarr[resi].headersSent)
          {
         
            if(client[req.session.id].length!==0)
            {
              client[req.session.id].end();
            }
            client[req.session.id]  = [];
            resarr[resi].render('index', {data:"Error in connection!"});
            return;
          }
        }
      }
    })
    client[req.session.id].on('close', function () {
      
      if(flag[req.session.id]==1)
      {
        flag[req.session.id]=0;
        if(!resarr[resi].headersSent)
        {
          
          if(client[req.session.id].length!==0)
          {
            client[req.session.id].end();
          }
          client[req.session.id]  = [];
          resarr[resi].render('index', {data:"Error in connection!"});
          return;
        } 
      }
    })        
  });
  

  app.get('/connecting', function (req, res) {
    var clientid;
    var con = mysql.createConnection({
      host: "localhost",
      user: "root",
      password: "123456789",
      database: "tenpi"
    });
    con.query("SELECT name FROM users WHERE id = ? ",[req.user.id], function(err, rows){
      clientid=rows[0].name;
 
      clientId[req.session.id] = clientid +'_' + Math.random().toString(16).substr(2, 8);
      var url='WSS://mqtt.tenpitech.com:8083';
      var options = {
          username: 'tenpitech',
          password: 'tenpitech123',   
          keepalive: 10,
          clientId: clientId[req.session.id],   
          clean: true,
          resubscribe: false,
          reconnectPeriod: 1000,
          connectTimeout: 30 * 1000,
      };

      if(flagsesstopic[req.session.id]==0 && client[req.session.id].length!==0)
      {
        client[req.session.id].end();
        client[req.session.id]=[];
      }

      client[req.session.id]  = mqtt.connect(url, options);
      client[req.session.id].on('connect', function () {
          return res.redirect('/pubsub');
      });
 });
});

    
app.get('/pubsub',  isLoggedIn, function (req, res) {
  if(typeof client[req.session.id]==="object")
  {
    if(topic[req.session.id].length)
    {	console.log("Here");
      if(flagsesstopic[req.session.id]==0)
      {
        
        flagsesstopic[req.session.id]=1;
        for(var i in topic[req.session.id])
        { 
          
          client[req.session.id].subscribe(topic[req.session.id][i]);
        }
      }
      if(msg[req.session.id].length){
        return res.render('pubsub', {data:"Successfully connected and receiving!", topics:topic[req.session.id], messages:msg[req.session.id], client:clientId[req.session.id], lastmessages:lastmsg[req.session.id]});
      }
      else{
        return res.render('pubsub', {data:"Successfully connected and subscribed!", topics:topic[req.session.id], messages:msg[req.session.id], client:clientId[req.session.id], lastmessages:lastmsg[req.session.id]});
    	}
    }
    else
    {
      flagsesstopic[req.session.id]=1;
      return res.render('pubsub', {data:"Successfully connected!", topics:topic[req.session.id], messages:msg[req.session.id], client:clientId[req.session.id], lastmessages:lastmsg[req.session.id]});
    }
  }
  else
  {
    return res.redirect('/');
  }
});

app.post('/pubsub', isLoggedIn, function (req, res) {
  if(typeof client[req.session.id]==="object")
  {
    client[req.session.id].on('message', function (topic, message) {
      //message is Buffer
        var d=new Date();
        var msgset=[topic.toString(), message.toString(), d.toLocaleTimeString()];
        if(msg[req.session.id].length==0) {
			msg[req.session.id].push(msgset);
        } else {
        	var len;
        	len= msg[req.session.id].length;
        	if(msgset[2].toString() != msg[req.session.id][len-1][2].toString()) {
				msg[req.session.id].push(msgset);
        	}
 		}
        lastmsg[req.session.id][topic.toString()]=[message.toString(), d.toLocaleTimeString()];
    })

    if(req.body.submitbut=="Subscribe")
    { 
      if(topic[req.session.id].indexOf(req.body.topic) == -1)
      {
        qq=parseInt(req.body.qos);
        topic[req.session.id].push(req.body.topic);
        client[req.session.id].subscribe(req.body.topic, {qos:qq});
      }
      return res.redirect('/pubsub');      
    }
    else if(req.body.submitbut=="Publish")
    { 
      var topicpub=req.body.topicpub;
      var payloadpub=req.body.payloadpub;
      qq=parseInt(req.body.qos);
      retain=parseInt(req.body.retain);
      client[req.session.id].publish(topicpub, payloadpub, {qos:qq, retain:Boolean(retain)});
      return res.redirect('/pubsub');
    }
    else if(req.body.submitbut=="Delete")
    {
      
      if(req.body.hidetopic!='delmessage')
      {
        client[req.session.id].unsubscribe(req.body.hidetopic);
        topic[req.session.id].splice(topic[req.session.id].indexOf(req.body.hidetopic), 1);
      }
      else
      { lenmsg[req.session.id]= 0;
        msg[req.session.id]=[];
      }
      return res.redirect('/pubsub');
    }
  }
  else
  {    
    return res.redirect('/');
  }
      
});

app.post('/check', isLoggedIn, function(req, res){
    if(lenmsg[req.session.id]<msg[req.session.id].length){
    	lenmsg[req.session.id]= msg[req.session.id].length;
      	return res.send([1]);
    }
});

// route middleware to make sure
function isLoggedIn(req, res, next) {

  // if user is authenticated in the session, carry on
  if (req.isAuthenticated() || flagfromdevpage[req.session.id])
    { 
    return next();
    }

  // if they aren't redirect them to the home page
  res.redirect('/');
}

app.get('/logout', function(req, res){
  req.logout();
  res.redirect('/');
});

app.listen(8080);
console.log('8080 is on');    
