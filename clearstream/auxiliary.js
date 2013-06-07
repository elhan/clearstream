var _ = require('underscore')
  , unshortener = require('unshortener')
  , Readability = require("readabilitySAX/readabilitySAX.js")
  , Parser = require("readabilitySAX/node_modules/htmlparser2/lib/Parser.js")
  , readable = new Readability({})
  , parser = new Parser(readable, {})
  , request = require('request')
  ,	moment = require('moment')
  , keywords = require('./keywords.js');

//expressions to clean the article fetched
var tags = /(<([^>]+)>)/ig;
var scripts = /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi;

// gravity determines the speed at which time decay sets in.
var gravity = 1.5;


/* 
 * Returns the Score of a tweet based on the author's follower_count
 */
function tweetScore(tweet) {
  var score = 0.01;
  if(tweet.user.followers_count > 9){
	score = Math.log(1+Math.pow(tweet.user.followers_count, 2)) - 2;
  }
  var decay = timeDecay(tweet);
  return score/decay;
}


/* 
 * Returns the time decay factor for a link. Similar to HN algorithm.
 */
 
function timeDecay(tweet) {
  var now = new Date();
  var created_at = new Date(tweet.created_at);
  var diffenceInHours = ( now.getTime()-created_at.getTime() ) / 3600000;
  return ( Math.pow( (diffenceInHours+2), gravity) );
};


/*
 * Returns true if a url is considered spam
 */

function isSpam(link, spamWords) {
  var isSpam = false;
  for(var i=0; i<spamWords.length; i++) {
  	if(link.hostname.indexOf(spamWords[i]) !== -1) {
	  isSpam = true;
  	}
  }
  return isSpam;
};


/* The basic algorithm. Takes the urlList, the list's max length
 * and a tweet object as parameters, and updates the list
 */
 
exports.spaceSaving =  function(urlList, urlListLength, tweet) {
  //Make sure it was a valid tweet
  if (tweet.text !== undefined) {
  
	//check if the tweet contains a url
	if(tweet.entities.urls.length>0) {
	  request(tweet.entities.urls[0].expanded_url,  function (error, response, body) {
	  	var url = response.request.uri;
	  	var article = {};
  	
		if (!error && response.statusCode == 200) {
	  	  body = body.replace(scripts, "");
	  	  parser.write(body);
	  	  article = readable.getArticle();
	  	  //remove multiple white spaces
	  	  article.html = article.html.replace(/\s+/g, ' ');
	  	  //remove html tags
	  	  article.html = article.html.replace(tags, "");
    	}
    	console.log();
      //check for spam links
      if(!isSpam(url, keywords.spamUrls)) {
    	    //check if url already exists in list 
    	    var urlItem = _.find(urlList, function(urlObject) {
            if (urlObject.url == response.request.uri.href) return true; 
    	    });

    	    // update the frequency and the score (the time decay is included in the score)
    	    if (urlItem !== undefined) {
            urlItem.freq += 1; 
        
    	      // if previous score is better keep it otherwise set the new score
    	      if (urlItem.score > tweetScore(tweet)) {
              urlItem.score = tweetScore(tweet);
    	      }
    	    } else {
            // check if list is full
            if (_.size(urlList) < urlListLength){
              urlList.push({url: url, freq: 1, score: tweetScore(tweet), created_at: moment(new Date(tweet.created_at)).format('MMM Do, HH:mm:ss').toString(), article: article});
            } else {
              // find and remove the item with the lowest count*score, and add the new one with increased count and new score
              var min = _.min(urlList, function(link){return link.score*link.freq});
              //console.log("To be removed: Freq:"+ min.freq + " " + min.url + " score:" + min.score);
              min.url = url.href;
              min.freq += 1;
              min.score = tweetScore(tweet);
              min.article = article;
    	      }
    	    }
        }
     });
	}
  }
};
