
var db = require('../config');
var bcrypt = require('bcrypt-nodejs');
var Promise = require('bluebird');



var User = db.Model.extend({
  tableName: 'users',
  hasTimestamps: true,

  initialize: function() {
    this.on('creating', function(model, attrs, options) {
      var password = model.get('password');
      bcrypt.hash(password, null, null, function(err, hash) {
        if (err) {
          console.log('Bcrypt Error: ', err);
        }
        console.log('Hash: ', hash);
        model.set('password', hash);
      });
    });
  }
});

module.exports = User;