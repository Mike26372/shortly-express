
var db = require('../config');
var bcrypt = require('bcrypt-nodejs');
var Promise = require('bluebird');



var User = db.Model.extend({
  tableName: 'users',
  hasTimestamps: true,

  initialize: function() {
    this.on('creating', this.hashPassword, this);
  },

  hashPassword: function(model, attrs, options) {
    return new Promise(function(resolve, reject) {
      bcrypt.hash(model.attributes.password, null, null, function(err, hash) {
        if (err) {
          reject(err);
        }
        model.set('password', hash);
        resolve(hash); // data is created only after this occurs
      });
    });
  },

  authenticate: function(password, hash) {    
    return new Promise(function(resolve, reject) {
      bcrypt.compare(password, hash, function(err, res) {
        if (err) {
          console.error('Bcrypt error', err);
          return reject(err);
        }
        return resolve(res);
      });
    });
  }
});

module.exports = User;