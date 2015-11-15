var config = require('./config');
var pocket = require('pocket-api');
var Q = require('q');
var express = require('express');
var session = require('express-session');

var app = express();
var pocketApiRoot = 'https://getpocket.com/auth/authorize?';

app.use(session({
	secret: config.secret,
	cookie: {
		maxAge: 60000
	}
}));

app.get('/', function(req, res) {
	constructRedirectUrl(req.session).then(function(url) {
		res.send('<a href="' + url + '">Authorize</a>');
	});
});

app.get('/response', function(req, res) {
	getAccessToken(req.session)
	.then(function() {
		res.send('Thanks');
	});
});

app.listen(config.port);

function constructRedirectUrl(session) {
	return Q.fcall(function() {
		return getRequestToken(session);
	})
	.then(function() {
		return pocketApiRoot + 'request_token=' + session.request_token + '&redirect_uri=' + config.url + ':' + config.port + '/response';
	});
}

function getRequestToken(session) {
	var d = Q.defer();
	pocket.getRequestToken(config.api_key, function(data) {
		session.request_token = data.code;
		d.resolve();
	});
	return d.promise;
}

function getAccessToken(session) {
	var d = Q.defer();
	pocket.getAccessToken(config.api_key, session.request_token, function(data) {
		session.username = data.username;
		session.access_token = data.access_token;
		d.resolve();
	});
	return d.promise;
}
