
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
        //console.log(tweet);
        console.log(tweet.created_at);
      
        if(tweet.entities.urls.length>0) {
          console.log(tweet.entities.urls[0].expanded_url);
          unshortener.expand(tweet.entities.urls[0].expanded_url, function (err, url) {
              console.log(url.href);  
              
              // calculate score as: log((1 + followers)^2)-2
              var followersCount = tweet.user.followers_count;
              var pow = Math.pow(1 + followersCount, 2);
              var score = 0.01;
              
              // verify for positive score
              if (pow > 9){
                  score = Math.log(pow) - 2;
              }
              
              console.log("Score:" + score + " fol:" + followersCount + " url:" + url.href);
              
              /* implement space saving algorithm. Keep a list of 50 most frequent urls in a
               * structure such as [{url: 'url', freq: 'freq'}, ...]
               * */
              var urlItem = _.find(urlList, function(urlObject){
                  if (urlObject.url == url.href)
                      return true; });

              // check if url already exists in list then update the frequency and the score, otherwise add it
              if (urlItem !== undefined){
                  urlItem.freq += 1;
                  
                  // TODO: check if is the following approach correct
                  // if previous score is better keep it (with the new freq?), otherwise set the new score
                  if (urlItem.score > score){
                      urlItem.score = urlItem.score * urlItem.freq;
                  }
                  else{
                      urlItem.score = score * urlItem.freq;
                  }
              }
              else {
                  // check if list is full
                  if (_.size(urlList) < urlListLength){
                      urlList.push({url: url.href, freq: 1, score: score});
                      console.log("Adding:" + url.href + " with score: " + score);
                  }
                  else{
                      // find and remove the item with the lowest count and add the new one with increased count and new score
                      var min = _.min(urlList, function(o){return o.score;});
                      console.log("To be removed: Freq:"+ min.freq + " " + min.url + " score:" + min.score);
                      min.url = url.href;
                      min.freq += 1;
                      min.score = min.freq * score;
                  }
              }
              
              // Temp log of the list
              var a = _.sortBy(urlList, function(num){ return num.score; });
              console.log("****");
              for (var i in a)
            	  {
            	  console.log("url: "+ urlList[i].url + " freq:" + urlList[i].freq + " score: " + urlList[i].score);
            	  }
              console.log("******");
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