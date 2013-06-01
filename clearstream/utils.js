exports.rank = function(tweet) {
  var reactions = tweet.retweet_count+tweet.favourite.count;
  var inlfuence = 0.01;
  //check to avoid influence = 0
  if(tweet.user.followers_count > 9) {
	influence = Math.log(1+tweet.user.followers_count)-2;
  }
  
	
}