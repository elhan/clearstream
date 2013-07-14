var _ = require('underscore')
  , Readability = require("readabilitySAX/readabilitySAX.js")
  , Parser = require("readabilitySAX/node_modules/htmlparser2/lib/Parser.js")
  , readable = new Readability({})
  , parser = new Parser(readable, {})
  , request = require('request')
  , cheerio = require('cheerio')
//  , iconv = require('iconv-lite')
  , keywords = require('./keywords.js')
  , txtSim = require('./textSimilarity.js');

//expressions to clean the article fetched
var tags = /(<([^>]+)>)/ig;
var spaces = / +(?= )/g;
var lines = /\r?\n|\r/g;
var scripts = /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi;

// gravity determines the speed at which time decay sets in.
var gravity = 1.6;


/** 
 * Returns the Score of a tweet based on the author's follower_count
 */

function tweetScore(tweet) {
  var score = 1;
  if(tweet.user.followers_count > 100){
	//score = Math.log(1+Math.pow(tweet.user.followers_count, 2)) - 2;
    score = Math.log(Math.pow(tweet.user.followers_count, 1.5)) - 2;
  }
  return score;
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
  var freqFactor = Math.pow((1+Math.log(link.freq)), 2);
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
 * Find the image in an article. The input is a cheerio object.
 */

function findImage($, title) {
  var meta = $('meta');
  var keys = Object.keys(meta);
  var img = '';
  
  //check if meta tag exists
  for(key in keys) {
    if(meta[key] !== undefined && meta[key].attribs !== undefined && meta[key].attribs.property == 'og:image') {
      img = meta[key].attribs.content;
      //console.log('found in meta');
    }
    //if none of the meta tags match, check for image links in the header
    if(key == keys.length-1 && img == '') {
      var link = $('link');
      var linkKeys = Object.keys(link); 
      //check in all link tags
      for(linkKey in linkKeys) {
        if(link[linkKey] !== undefined && link[linkKey].attribs !== undefined && link[linkKey].attribs.rel == 'image_src') {
          img = link[linkKey].attribs.href;
          //console.log('found in links');
        }
        
        //if none of the rel tags match, check article links that contain the title
        if(linkKey == linkKeys.length-1 && img == '') {
          var hrefs = $('href');
          //search for an href that matches the title
          for(href in hrefs) {
            if(href.indexOf(title) !== -1) {
              img = href;
              //console.log('found in hrefs');
            }
          }
        }
      }
    }
  }
  return img;
}


/**
 * Cleans an article's title of unwanted substrings
 */

function cleanTitle(title) {
  for(word in keywords.titleSpam) {
    title = title.replace(word, '');
  }
  return title;
}


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
      		  var $ = cheerio.load(body);
      		  body = body.replace(scripts, "");
        	  parser.reset();
        	  parser.write(body);
        	  article = readable.getArticle();
        	  
        	  //check if the algorithm was able to find a valid article
        	  if(article.textLength > 300) {
          	  article.title = cleanTitle(article.title);
          	  //find the article's image
              var image = findImage($, article.title);
          	  //remove tags, line breaks and multiple white spaces and limit characters to 500
          	  article.html = article.html.replace(tags, "").replace(lines,"").replace(spaces, "").substring(0,460) + '...';
          	  
          	  // check for empty title
              if (!article.title){
                return;
              }
          	  
        	    //check if the article has already been linked
        	    var link = _.find(linkList, function(urlObject) {
        	    	var similarity = txtSim.calculateSimilarity(urlObject.article.title, article.title);
        	        if (similarity > 0.6){
        	        	//console.log("Similarity:" + similarity + " for " + urlObject.article.title + " and " + article.title);
        	        	return true;
        	        }
        	      //return urlObject.article.title == article.title;
        	      return false;
        	    });
        	    
        	    /* If the link already exists in the list, update the frequency and date. If the new
        	     * link has a higher score, replace with the url and image, and update the score field.
        	     */
        	    if (link !== undefined) {
                link.freq += 1; 
                link.created_at = new Date(tweet.created_at);
        
        	      if (link.score < tweetScore(tweet)) {
                  link.score = tweetScore(tweet);
                  link.url = url;
                  link.img = image;
        	      } 
        	      
        	    } else {
        	      
                /* if the list is not full yet, push the new link. Otherwise, order the list by rank,
                 * remove the least element rank and insert the new link. 
                 */
                if (_.size(linkList) < linkListLength){
                  linkList.push({url: url, freq: 1, score: tweetScore(tweet), created_at: new Date(tweet.created_at), article: article, img: image});
                } else {
                  min = _.min(linkList, function(link){return rank(link);});
                  min.url = url;
                  min.freq = 1;
                  min.score = tweetScore(tweet);
                  min.created_at =  new Date(tweet.created_at);
                  min.article = article;
                  min.img = image;
        	      } 
        	    }
        		}//check if valid article
          } //check if spam
        } // response != undefined
      }); //request
    }
  }
};
