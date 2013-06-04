
/*
 * Module dependencies.
 */
var express = require('express')
  , io = require('socket.io')
  , http = require('http')
  , path = require('path')
  , twitter = require('ntwitter')
  , credentials = require('./credentials.js')
  , aux = require('./auxiliary.js')
  , keywords = require('./keywords.js')
  , utils = require('./utils.js');

//Create an express app
var app = express();

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


//We're using bower components so add it to the path to make things easier
app.use('/components', express.static(path.join(__dirname, 'components')));


// development only
if ('development' == app.get('env')) {
  app.use(express.errorHandler());
}


//Only one route. Render it with the current urlList
app.get('/', function(req, res) {
  res.render('index', { data: urlList });
});

	
//Start a Socket.IO listen
var sockets = io.listen(server);

/*
//Set the sockets.io configuration.
//THIS IS NECESSARY ONLY FOR HEROKU!
sockets.configure(function() {
  sockets.set('transports', ['xhr-polling']);
  sockets.set('polling duration', 10);
});
 */
 
//If the client just connected, give them fresh data!
sockets.sockets.on('connection', function(socket) { 
  socket.emit('data', urlList);
});


//initialize list for space saving algorithm
var urlList = [];
var urlListLength = 10;


/* Start a connection with twitter's Streaming API, and filter tweets that
 * contain one of the listed keywords and their language is Greek.
 */
t.stream('statuses/filter', { track: keywords.toTrack, language: 'el' }, function(stream) {
  //We have a connection. Now watch the 'data' event for incoming tweets.
  stream.on('data', function(tweet) {
  	aux.spaceSaving(urlList, urlListLength, tweet);
  	sockets.sockets.emit('data', urlList);
  });
});
      

//Create the server
server.listen(app.get('port'), function(){
  console.log('Express server listening on port ' + app.get('port'));
});