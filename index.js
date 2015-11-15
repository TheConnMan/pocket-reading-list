var config = require('./config');
var pocket = require('pocket-api');
var Q = require('q');
var express = require('express');
var app = express();

var pocketApiRoot = 'https://getpocket.com/auth/authorize?';

app.get('/', function(req, res) {
	constructRedirectUrl().then(function(url) {
		res.send('<a href="' + url + '">Authorize</a>');
	});
});

app.get('/response', function(req, res) {
	res.send('Thanks');
});

app.listen(config.port);

function constructRedirectUrl() {
	return Q.fcall(getRequestToken)
	.then(function() {
		return pocketApiRoot + 'request_token=' + config.request_token + '&redirect_uri=' + config.url + ':' + config.port + '/response';
	});
}

function getRequestToken() {
	var d = Q.defer();
	pocket.getRequestToken(config.api_key, function(data) {
		config.request_token = data.code;
		d.resolve();
	});
	return d.promise;
}
