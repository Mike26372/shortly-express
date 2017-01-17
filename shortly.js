var express = require('express');
var util = require('./lib/utility');
var partials = require('express-partials');
var bodyParser = require('body-parser');
var cors = require('cors');
var session = require('express-session');



var db = require('./app/config');
var Users = require('./app/collections/users');
var User = require('./app/models/user');
var Links = require('./app/collections/links');
var Link = require('./app/models/link');
var Click = require('./app/models/click');

var app = express();

app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');
app.use(cors());
app.use(partials());
// Parse JSON (uniform resource locators)
app.use(bodyParser.json());
// Parse forms (signup/login)
app.use(bodyParser.urlencoded({ extended: true }));
var sess = {
  secret: 'nyancat',
  cookie: {
    maxAge: 300000
  }, 
  resave: false,
  saveUninitialized: true
};
app.use(session(sess));

// ADD MIDDLEWARE HERE***

app.use(express.static(__dirname + '/public'));

app.get('/', util.isAuthenticated, function(req, res) {
  res.render('index');
});

app.get('/create', util.isAuthenticated, function(req, res) {
  res.render('index');
});

// Find way to filter links by user_id foreign key
app.get('/links', util.isAuthenticated, function(req, res) {
  Links.reset().fetch().then(function(links) {
    res.status(200).send(links.models);
  });
});

// add current user as foreign key of user_id to links table
app.post('/links', function(req, res) {
  var uri = req.body.url;
  console.log('Inside /links');

  if (!util.isValidUrl(uri)) {
    console.log('Not a valid url: ', uri);
    return res.sendStatus(404);
  }

  var currentUser = req.session.user;
  console.log('Current User: ', currentUser);
  var currentUserId;  
  
  db.knex
    .select('id')
    .from('users')
    .where({username: currentUser})
    .then(function(data) {
      currentUserId = data[0].id;
      console.log('Current User ID: ', currentUserId);
      return data;
    }).catch(function(err) {
      console.error(err);
      return err;
    });

  new Link({ url: uri, 'user_id': null }).fetch().then(function(found) {
    if (found) {
      res.status(200).send(found.attributes);
    } else {
      util.getUrlTitle(uri, function(err, title) {
        if (err) {
          console.log('Error reading URL heading: ', err);
          return res.sendStatus(404);
        }

        Links.create({
          url: uri,
          title: title,
          baseUrl: req.headers.origin
        })
        .then(function(newLink) {
          res.status(200).send(newLink);
        });
      });
    }
  });
});

/************************************************************/
// Write your authentication routes here
/************************************************************/

app.get('/signup', function(req, res) {
  res.render('signup');

});

app.post('/signup', function(req, res) {
  var username = req.body.username;
  var password = req.body.password;
  
  var user = new User({username: username, password: password})
  .save()
  .then(function(user) {
    Users.add(user);
    req.session.user = username;
    // res.writeHead(201);
    res.redirect('/');
  }).catch(function(err) {
    console.error('User creation error: ', err);
    // res.writeHead(404);
    res.redirect('/login');
  });
});

app.get('/login', function(req, res) {
  res.render('login');

});

app.post('/login', function(req, res) {
  var username = req.body.username;
  var password = req.body.password;
  db.knex.select('password')
    .from('users')
    .where('username', '=', req.body.username)
    .then(function(hash) {
      if (!hash[0]) {
        return false;
      } else {
        return util.checkPassword(password, hash[0].password);
      }
    })
    .then(function(exists) {
      console.log('Exists: ', exists);
      if (exists) {
        req.session.user = username;
        res.redirect('/');
      } else {
        res.redirect('/login');
      }
    })
    .catch(function(err) {
      console.error(err);
      res.redirect('/login');
    });
});

app.get('/users', util.isAuthenticated, function(req, res) {
  Users.reset().fetch().then(function(users) {
    res.status(200).send(users.models);
  });
});

// Logout endpoint
app.get('/logout', function (req, res) {
  console.log('Inside /logout');
  req.session.destroy();
  res.redirect('/login');
});
/************************************************************/
// Handle the wildcard route last - if all other routes fail
// assume the route is a short code and try and handle it here.
// If the short-code doesn't exist, send the user to '/'
/************************************************************/

app.get('/*', function(req, res) {
  new Link({ code: req.params[0] }).fetch().then(function(link) {
    if (!link) {
      res.redirect('/');
    } else {
      var click = new Click({
        linkId: link.get('id')
      });

      click.save().then(function() {
        link.set('visits', link.get('visits') + 1);
        link.save().then(function() {
          return res.redirect(link.get('url'));
        });
      });
    }
  });
});

module.exports = app;
