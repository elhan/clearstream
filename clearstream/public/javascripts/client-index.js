$(function () {
  
  var links = [];
  var topLinks = [];
  var indexUrl = 'http://localhost:3000';
  var topUrl = indexUrl.concat('/top');
  
  /**
   * Sorts and reduces the initial list to only the top N elements
   */
  
  var topLinks = function(data) {
    var topLinks = [];
    topLinks = _.sortBy(data, function(link){return link.score;});
    topLinks = topLinks.reverse();
    topLinks = _.first(topLinks, 20);
    topLinks = _.sortBy(topLinks, function(link){return link.freq;});
    topLinks = topLinks.reverse();
    return topLinks;
  };
  
  
  /**
   * From a link object, creates a string for each list element
   */
  
  var linkStr = function(link) {
    var str = '<li class="link">' +
      '<span id="link-title"><a href="' + 
      link.url.href +'" target="_blank">' + 
      link.article.title + '</a></span><span id="link-hostname">' +
      link.url.hostname + '</span>' + 
      '<p id="link-info"><span class="link-footer-text">last mentioned on</span><span class="link-footer-value">' + 
      moment(link.created_at).format('MMM Do, HH:mm:ss') + '</span><span class="separator">|</span>' + 
      '<span class="link-footer-text">mentions:</span><span class="link-footer-value">' +
      link.freq + '</span></p></li>';
    return str;
  };
  
  
  /**
   * Renders the top links list
   */
  
  var renderList = function(links){
    $('#links').fadeOut();
    $('#links li').remove();
    for(var i=0; i<links.length; i++){
      $('#links').append(linkStr(link[i]));
    }
    $('#links').fadeIn();
  };
  
  
  /**
   * Handle the refresh button behaviour. When refresh is pressed request the 
   * current list. The response data is the new topLinks list. Clear the
   * link list and fill it with the new data.
   */

  $('#refresh').on('click', function() {
    $.get(topUrl, function(data) {
      topLinks = topLinks(data);
      renderList(topLinks);
    });
  });
    
});