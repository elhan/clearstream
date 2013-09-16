var _ = require('underscore')
  , Readability = require("readabilitySAX/readabilitySAX.js")
  , Parser = require("readabilitySAX/node_modules/htmlparser2/lib/Parser.js")
  , readable = new Readability({})
  , parser = new Parser(readable, {})
  , request = require('request')
  , cheerio = require('cheerio')
  , jsc = require("jschardet")
  , S = require('string')
  , keywords = require('./keywords.js')
  , txtSim = require('./textSimilarity.js');

//expressions to clean the article fetched
var tags = /(<([^>]+)>)/ig;
var spaces = /\s+/g;
var lines = /(\r\n|\n|\r)/gm;
var scripts = /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi;
var dots = /\.{4,}/;
var sentences = /[^\.!;:\?]+[\.!;:\?]+/g;

// gravity determines the speed at which time decay sets in.
var gravity = 1.6;


/** 
 * Returns the Score of a tweet based on the author's follower_count
 */

function tweetScore(tweet) {
  var score = 1;
  if(tweet.user.followers_count > 100){
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
 * Determines if an article is encoded in utf8 or not
 */
function isUtf(buffer) {
  var jscResult = jsc.detect(buffer);
  return (jscResult.encoding == 'windows-1252' &&  jscResult.confidence > 0.8);
}


/**
 * Find the image in an article. The input is a cheerio object.
 */

function findImage($, title, link) {
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
              //check if the image url is complete
              img = (href.indexOf(url.hostname) !== -1) ? href : url.hostname + href;
              //console.log('found in hrefs:');
            }
          }
        }
      } //check in tags
    }
  }
  return img;
}


/**
 * Truncate and clean an article's title
 */

function cleanTitle(title, maxChars) {
  var finalTitle = '';
  
  try {
    //remove spammy words like [photo] etc.
    for(var i=0; i<keywords.titleSpam.length; i++) {
      title = title.replace(keywords.titleSpam[i], ' ');
    }
  
    title = title.replace(lines, " ").replace(spaces, " ").replace(dots, "...").replace('&# ;', '...');
    
    var words = title.split(' ');
    var tempWord = '';
    
    for(var i=0; i<words.length; i++) {
      tempWord = words[i];
      if(finalTitle.length < maxChars) {
        //capitalize each word in the title
        tempWord = S(tempWord).capitalize().s;
        finalTitle = finalTitle + tempWord + ' ';
      } else { 
        finalTitle = finalTitle + '...';
        break;
      }
    }
  } catch(e) {
    console.log('something went wrong while processing the title!');
    console.log(e);
    finalTitle = title;
  }
  return finalTitle;
}


/**
 * Clean and truncate an article's text
 */

function cleanText(text, maxChars) {
  var finalText = '';
  var words = [];//
  
  try {
    text = text.replace(tags, " ").replace(lines, " ").replace(spaces, " ").replace(dots, "...").replace('&# ;', '...');
    
    //break the text into sentences and capitalize the first word in each
    var sent = text.match(sentences);
    text = '';
    for(var i=0; i< sent.length; i++) {
      words = sent[i].split(" ");
      S(words[0]).capitalize().s;
      sent[i] = '';
      for(var k=0; k<words.length; k++) {
        sent[i] = sent[i] + words[k] + " ";
      }
      text = text + sent[i] + " ";
    }
    
    words = text.split(" ");
    
    //truncate
    for(var j=0; j<words.length; j++) {
      if(finalText.length < maxChars) {
        finalText = finalText + words[j] + ' ';
      } else { 
        finalText = finalText + '...';
        break;
      };
    }
  
  //if something went wrong, just return the default text
  } catch(e) {
    console.log('something went wrong while processing the text! Error: ');
    console.log(e);
    finalText = text;
  }
  return finalText;
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
      request({uri: tweet.entities.urls[0].expanded_url, encoding: 'utf8'},
          function (error, response, body) {
      
        if(response !== undefined) {         
        	var url = response.request.uri;
        	var article = {};
    
      		if (error == null && response.statusCode == 200 && !isSpam(url, keywords.spamUrls)
      		    && isUtf(body)) {  
      		  
      		  var $ = cheerio.load(body);
      		  
      		  body = body.replace(scripts, " ");
        	  parser.reset();
        	  parser.write(body);
        	  article = readable.getArticle();
        	  
        	  //check if the algorithm was able to find a valid article
        	  if(article.textLength > 300) {
          	  article.title = cleanTitle(article.title, 140);
          	  //find the article's image
              var image = findImage($, article.title, url);
          	  //remove tags, line breaks and multiple white spaces and limit characters to 500
              article.html = cleanText(article.html, 250);
          	  
          	  // check for empty title
              if (!article.title){
                return;
              }
          	  
        	    //check if the article has already been linked
        	    var link = _.find(linkList, function(urlObject) {
        	    	var similarity = txtSim.calculateSimilarity(urlObject.article.title, article.title);
        	      if (similarity > 0.6) return true;
        	      //return urlObject.article.title == article.title;
        	      return false;
        	    });
        	    
        	    /* 
        	     * If the link already exists in the list, update the frequency and date. If the new
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
        	      
                /*
                 *  if the list is not full yet, push the new link. Otherwise, order the list by rank,
                 * remove the least element rank and insert the new link. 
                 */
                if (_.size(linkList) < linkListLength) {
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
