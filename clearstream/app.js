
/*
 * Module dependencies.
 */
var express = require('express')
  , http = require('http')
  , path = require('path')
  , twitter = require('ntwitter')
  , credentials = require('./credentials.js')
  , aux = require('./auxiliary.js')
  , keywords = require('./keywords.js');


//Create an express app
var app = express();
//initialise lists
var linkList = [];
var linkListLength = 50;


//Create the HTTP server with the express app as an argument
var server = http.createServer(app);


var t = new twitter({
    consumer_key: credentials.consumer_key,
    consumer_secret: credentials.consumer_secret,
    access_token_key: credentials.access_token_key,
    access_token_secret: credentials.access_token_secret
});


//Generic Express setup
app.set('port', process.env.PORT || 3000);
app.set('views', __dirname + '/views');
app.set('view engine', 'jade');
app.use(express.logger('dev'));
app.use(express.bodyParser());
app.use(express.methodOverride());
app.use(app.router);
app.use(express.static(path.join(__dirname, 'public')));
app.locals.moment = require('moment');
app.locals._ = require('underscore');


//We're using bower components so add it to the path to make things easier
app.use('/components', express.static(path.join(__dirname, 'components')));


//development only
if ('development' == app.get('env')) {
  app.use(express.errorHandler());
}


//Render the index page with the current top10links list
app.get('/', function(req, res) {
  res.render('index', { data: linkList });
});


//Return the current list
app.get('/top', function(req, res) {
  res.send('links', { data: linkList });
});


/* Start a connection with twitter's Streaming API, and filter tweets that
 * contain one of the listed keywords and their language is Greek.
 */

t.stream('statuses/filter', { track: keywords.toTrack, language: 'el' }, function(stream) {
  //We have a connection. Now watch the 'data' event for incoming tweets.
  stream.on('data', function(tweet) {
  	aux.spaceSaving(linkList, linkListLength, tweet);
  });
});
      

//Create the server
server.listen(app.get('port'), function(){
  console.log('Express server listening on port ' + app.get('port'));
});