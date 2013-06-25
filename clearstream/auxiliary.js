var _ = require('underscore')
  , Readability = require("readabilitySAX/readabilitySAX.js")
  , Parser = require("readabilitySAX/node_modules/htmlparser2/lib/Parser.js")
  , readable = new Readability({})
  , parser = new Parser(readable, {})
  , request = require('request')
  , keywords = require('./keywords.js');

//expressions to clean the article fetched
var tags = /(<([^>]+)>)/ig;
var scripts = /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi;

// gravity determines the speed at which time decay sets in.
var gravity = 1.5;


/** 
 * Returns the Score of a tweet based on the author's follower_count
 */

//function tweetScore(tweet) {
//  var score = 0.01;
//  if(tweet.user.followers_count > 9){
//	score = Math.log(1+Math.pow(tweet.user.followers_count, 2)) - 2;
//  }
//  return score;
//}
function tweetScore(tweet) {
  return Math.log(1+tweet.user.followers_count);
}


/** 
 * Returns the time decay factor for a link. Similar to HN algorithm.
 */
 
function timeDecay(link) {
  var now = new Date();
  var created_at = new Date(link.created_at);
  var diffenceInHours = ( now.getTime()-created_at.getTime() ) / 3600000;
  return ( Math.pow( (diffenceInHours+2), gravity) );
};


/**
 *  Calculate a link's current rank. Takes into account time decay, score
 * and frequency. Used for finding the minimum element in a link list and
 * to order the list when necessary.
 */

function rank(link) {
  var decay = timeDecay(link);
  var score = link.score;
  var freqFactor = 1 + Math.log(Math.pow(link.freq, 2));
  return freqFactor*(score/decay);
};


/**
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


/**
 * The basic algorithm. Takes the linkList, the list's max length
 * and a tweet object as parameters, and updates the list
 */
 
exports.spaceSaving =  function(linkList, linkListLength, tweet) {
  var min = {};
  
  //Make sure it was a valid tweet
  if (tweet.text !== undefined) {
  
    //check if the tweet contains a url
    if(tweet.entities.urls.length>0) {
      request({uri: tweet.entities.urls[0].expanded_url, encoding:'utf-8'},
          function (error, response, body) {
      
        if(response !== undefined) {         
        	var url = response.request.uri;
        	var article = {};
    
      		if (error == null && response.statusCode == 200 && !isSpam(url, keywords.spamUrls)) {
        	  body = body.replace(scripts, "");
        	  parser.reset();
        	  parser.write(body);
        	  article = readable.getArticle();
        	  
        	  /*//remove multiple white spaces
        	  article.html = article.html.replace(/\s+/g, ' ');
        	  //remove html tags
        	  article.html = article.html.replace(tags, "");*/
        	  
        	  // check for empty title
              if (!article.title){
                  return;
              }
        	  
      	    //check if the article has already been linked
      	    var link = _.find(linkList, function(urlObject) {
      	      return urlObject.article.title == article.title; 
      	    });
      	    
      	    /* If the link already exists in the list, update the frequency and date. If the new
      	     * link has a higher score, replace with the new url and update the score field.
      	     */
      	    if (link !== undefined) {
              link.freq += 1; 
              link.created_at = new Date(tweet.created_at);
      
      	      if (link.score < tweetScore(tweet)) {
                link.score = tweetScore(tweet);
                link.url = url;
      	      } 
      	      
      	    } else {
      	      
              /* if the list is not full yet, push the new link. Otherwise, order the list by rank,
               * remove the least element rank and insert the new link. 
               */
              if (_.size(linkList) < linkListLength){
                linkList.push({url: url, freq: 1, score: tweetScore(tweet), created_at: new Date(tweet.created_at), article: article});
              } else {
                min = _.min(linkList, function(link){return rank(link);});
                min.url = url;
                min.freq = 1;
                min.score = tweetScore(tweet);
                min.created_at =  new Date(tweet.created_at);
                min.article = article;
      	      } 
      	    } 
          } //check if spam
        } // response != undefined
      }); //request
    }
  }
};
