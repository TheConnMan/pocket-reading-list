var config = require('./config');
var pocket = require('pocket-api');
var Q = require('q');

Q.fcall(getRequestToken)
.then(function(token) {
	console.log(token);
});

function getRequestToken() {
	var d = Q.defer();
	pocket.getRequestToken(config.api_key, function(data) {
		d.resolve(data.code);
	});
	return d.promise;
}
