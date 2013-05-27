
/*
 * Module dependencies.
 */
var express = require('express')
  , io = require('socket.io')
  , http = require('http')
  , path = require('path')
  , twitter = require('ntwitter')
  , credentials = require('./credentials.js')
  , _ = require('underscore');

//Create an express app
var app = express();

//Create the HTTP server with the express app as an argument
var server = http.createServer(app);

//keywords to track
var watchKeywords = ['$msft', '$intc', '$hpq', '$goog', '$nok', '$nvda', '$bac', '$orcl', '$csco', '$aapl', '$ntap', '$emc', '$t', '$ibm', '$vz', '$xom', '$cvx', '$ge', '$ko', '$jnj'];

/* Keep the total number of tweets received and a map of all the 
 * keywords and how many tweets received of that keyword
 */
var watchList = {
    total: 0,
    keywords: {}
};

//Set the watch keywords to zero.
_.each(watchKeywords, function(v) { watchList.keywords[v] = 0; });

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

//Only one route. Render it with the current watchList
app.get('/trending', function(req, res) {
  res.render('index', { data: watchList });
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
  socket.emit('data', watchList);
});

//Tell the twitter API to filter on the watchKeywords 
t.stream('statuses/filter', { track: watchKeywords }, function(stream) {
 
  //We have a connection. Now watch the 'data' event for incomming tweets.
  stream.on('data', function(tweet) {
 
    /* This variable is used to indicate whether a symbol was actually mentioned.
     * Since twitter doesnt why the tweet was forwarded we have to search through the text
     * and determine which symbol it was ment for. Sometimes we can't tell, in which case we don't
     * want to increment the total counter...
     */
    var claimed = false;
 
    //Make sure it was a valid tweet
    if (tweet.text !== undefined) {
 
      //We'll do some indexOf comparisons and we want it to be case agnostic.
      var text = tweet.text.toLowerCase();
 
      /* Go through every symbol and see if it was mentioned. If so, increment its counter and
       * set the 'claimed' variable to true to indicate something was mentioned so we can 
       * increment the 'total' counter!
       */
      _.each(watchKeywords, function(v) {
      	  //check if the tweet's text contains the symbol.
          if (text.indexOf(v.toLowerCase()) !== -1) {
			watchList.keywords[v]++;
       		claimed = true;
          }
      });
 
      //If something was mentioned, increment the total counter and send the update to all the clients
      if (claimed) {
          //Increment total
          watchList.total++;
 
          //Send to all the clients
          sockets.sockets.emit('data', watchList);
      }
    }
  });
});

//Create the server
server.listen(app.get('port'), function(){
  console.log('Express server listening on port ' + app.get('port'));
});