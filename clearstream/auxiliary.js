var _ = require('underscore')
  , unshortener = require('unshortener')
  , keywords = require('./keywords.js');


// gravity determines the speed at which time decay sets in.
var gravity = 1.5;

/* 
 * Returns the Score of a tweet based on the author's follower_count
 */
function tweetScore(tweet) {
  return Math.log(1+Math.pow(tweet.user.followers_count, 2)) - 2; 
}


/* 
 * Returns the time decay factor for a link. Similar to HN algorithm.
 */
 
function timeDecay(urlItem) {
  var now = new Date();
  var created_at = urlItem.created_at;
  //var created_at = new Date ("June 03, 2013 12:48:00");
  var diffenceInHours = ( now.getTime()-created_at.getTime() ) / 3600000;
  return ( Math.pow( (diffenceInHours+2), gravity) );
};


/* 
 * Calculates the current rank of a link
 */

function rank(urlItem) {
  //console.log('score: ..... ' + urlItem.score + '     time decay: ..... ' +timeDecay(urlItem)+ '     rank: ...... ' + urlItem.score / timeDecay(urlItem));
  return urlItem.score / timeDecay(urlItem);
};


/*
 * Returns true if a url is considered spam
 */

function isSpam(link, spamWords) {
  var isSpam = false;
  for(var i=0; i<spamWords.length; i++) {
  	if(link.href.indexOf(spamWords[i]) !== -1) {
	  isSpam = true;
  	}
  }
  return isSpam;
};


/* The basic algorith. Takes the urlList, the list's max length
 * and a tweet object as parameters, and updates the list
 */
 
exports.spaceSaving =  function(urlList, urlListLength, tweet) {
  //Make sure it was a valid tweet
  if (tweet.text !== undefined) {
  
	//check if the tweet contains a url
	if(tweet.entities.urls.length>0) {
	  //console.log(tweet.entities.urls[0].expanded_url);
	  unshortener.expand(tweet.entities.urls[0].expanded_url, function (err, url) {
	  
	  //check for spam links
	  if(!isSpam(url, keywords.spamUrls)) {
	  	var score = 0.01;   
	   
      	// verify for positive score
      	if (tweet.user.followers_count > 9){
          score = tweetScore(tweet);
      	}
      
      	//check if url already exists in list 
      	var urlItem = _.find(urlList, function(urlObject) {
          if (urlObject.url == url.href) return true; 
      	});

      	// update the frequency and the score
      	if (urlItem !== undefined) {
          urlItem.freq += 1; 
      	  // if previous score is better keep it (with the new freq?), otherwise set the new score
      	  if (urlItem.score > score) {
            urlItem.score = urlItem.score * urlItem.freq;
      	  } else {
            urlItem.score = score * urlItem.freq;
      	  }
      	} else {
          // check if list is full
          if (_.size(urlList) < urlListLength){
            urlList.push({url: url.href, freq: 1, score: score, created_at: new Date(tweet.created_at) });
          } else {
            // find and remove the item with the lowest count and add the new one with increased count and new score
            var min = _.min(urlList, function(o){return rank(o)});
            //console.log("To be removed: Freq:"+ min.freq + " " + min.url + " score:" + min.score);
            min.url = url.href;
            min.freq += 1;
            min.score = min.freq * score;
      	  }
        }
      }
      }); //expand url
	}
  }
};
