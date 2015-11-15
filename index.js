var config = require('./config');
var pocket = require('pocket-api');
var Q = require('q');
var request = require('request');
var express = require('express');
var session = require('express-session');

var app = express();

var pocketUrl = {
	redirect: 'https://getpocket.com/auth/authorize',
	get: 'https://getpocket.com/v3/get'
};
var headers = {
	"content-type": "application/x-www-form-urlencoded",
	"X-Accept": "application/json"
};

app.set('json spaces', 4);
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
	.then(getFavorites)
	.then(function(favorites) {
		res.send(formatFavorites(favorites, req.session));
	});
});

app.listen(config.port);

function constructRedirectUrl(session) {
	return Q.fcall(function() {
		return getRequestToken(session);
	})
	.then(function() {
		return pocketUrl.redirect + '?request_token=' + session.request_token + '&redirect_uri=' + config.url + ':' + config.port + '/response';
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
		d.resolve(session);
	});
	return d.promise;
}

function getFavorites(session) {
	var d = Q.defer();
	var options = {
		headers: headers,
		url: pocketUrl.get,
		body: 'consumer_key=' + config.api_key + '&access_token=' + session.access_token + '&favorite=1&detailType=complete'
	};

	request.post(options, function(error, response, body) {
		var list = JSON.parse(body).list;
		var favorites = Object.keys(list).map(function(key) {
			return list[key];
		});
		d.resolve(favorites);
	});
	return d.promise;
}

function formatFavorites(favorites, session) {
	var tags = getTags(favorites);
	var mkdn = '# ' + session.username + '\'s Reading List\n\n';
	mkdn += tags.map(function(tag) {
		return formatTag(favorites, tag);
	}).join('\n');
	return mkdn;
}

function getTags(favorites) {
	return [].concat.apply([], favorites.map(function(item) {
		return getItemTags(item);
	})).filter(onlyUnique).sort();
}

function getItemTags(item) {
	var tagKeys = Object.keys(item.tags);
	return tagKeys.map(function(tagKey) {
		return item.tags[tagKey].tag;
	});
}

function onlyUnique(value, index, self) {
	return self.indexOf(value) === index;
}

function formatTag(favorites, tag) {
	var filteredFavorites = filterFavorites(favorites, tag);
	var mkdn = '## ' + tag + '\n';
	mkdn += '\n' + filteredFavorites.map(function(item) {
		return '- [' + item.resolved_title + '](' + item.resolved_url + ') - ' + item.excerpt + '\n';
	}).join('');
	return mkdn;
}

function filterFavorites(favorites, tag) {
	return favorites.filter(function(item) {
		return getItemTags(item).indexOf(tag) != -1;
	}).sort(function(item1, item2) {
		return item1.resolved_title.localeCompare(item2.resolved_title);
	});
}
