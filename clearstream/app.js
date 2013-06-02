
/*
 * Module dependencies.
 */
var express = require('express')
  , io = require('socket.io')
  , http = require('http')
  , path = require('path')
  , _ = require('underscore')
  , twitter = require('ntwitter')
  , unshortener = require('unshortener')
  , credentials = require('./credentials.js')
  , utils = require('./utils.js');

//Create an express app
var app = express();

//Create the HTTP server with the express app as an argument
var server = http.createServer(app);

//keywords to track
var watchKeywords = ['ο', 'η', 'το', 'τον', 'του', 'της', 'τους', 'τις', 'στο', 'στον', 'στη', 'στην', 'στους', 'στις', 'αν', 'και', 'κι', 'θα', 'τα', 'να', 'αν'];

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

var watchList = {};

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

//initialize list for space saving algorithm
var urlList = [];
var urlListLength = 50;

//Tell the twitter API to filter on the watchKeywords 
t.stream('statuses/filter', { track: watchKeywords, language: 'el' }, function(stream) {
 
  //We have a connection. Now watch the 'data' event for incoming tweets.
  stream.on('data', function(tweet) {
    //Make sure it was a valid tweet
    if (tweet.text !== undefined) {
        console.log(tweet);
      if(tweet.entities.urls.length>0) {
          console.log(tweet.entities.urls[0].expanded_url);
          unshortener.expand(tweet.entities.urls[0].expanded_url, function (err, url) {
              console.log(url.href);  
              
              /* implement space saving algorithm. Keep a list of 50 most frequent urls in a
               * structure such as [{url: 'url', freq: 'freq'}, ...]
               * */
              var urlItem = _.find(urlList, function(urlObject){
                  if (urlObject.url == url.href)
                      return true; });

              // check if url already exists in list then increase the frequency, otherwise add it
              if (urlItem !== undefined){
                  urlItem.freq += 1;
              }
              else {
                  // check if list is full
                  if (_.size(urlList) < urlListLength){
                      urlList.push({url: url.href, freq: 1});
                  }
                  else{
                      // find and remove the item with the lowest count and add the new one with increased count.
                      var min = _.min(urlList, function(o){return o.freq;});
                      console.log("MIN:"+ min.freq + " " + min.url);
                      min.url = url.href;
                      min.freq += min.freq;
                  }
              }
          });
      }
      //Send to all the clients
      sockets.sockets.emit('data', watchList);
    }
  });
});

//Create the server
server.listen(app.get('port'), function(){
  console.log('Express server listening on port ' + app.get('port'));
});