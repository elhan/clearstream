$(function () {
  
  var indexUrl = document.URL;
  var topUrl = indexUrl.concat('top');
   
  //on refresh, scroll to top
  $(window).bind('unload', function(){ 
    $('body').scrollTop(0);
  });
  
   
   /**
    * Calculates the difference between two lists, and handle 
    * the rendering of the'new links' counter.
    */
   function newLinks(links) {
     var oldLinks = [];
     var newLinks = [];
     
     //get all the titles in the old links and push them into oldLinks
     $( ".link-title" ).each(function( index ) {
       oldLinks.push($(this).text());
     });
     
     //get all titles in the new links and push them in newLinks
     _.each(links, function(link){
       newLinks.push(link.article.title);
     });
     console.log('new:  ' + newLinks);
     console.log('old:  ' + oldLinks);
     console.log('difference:  ' + _.difference(newLinks, oldLinks));
     return _.difference(newLinks, oldLinks).length;
   }
  
  
  /**
   * Sorts the links by score
   */
  
  var sortLinks = function(data) {
    var all = [];
    all = _.sortBy(data, function(link){return link.freq;});
    all = all.reverse();
    return all;
  };
  
  
  /**
   * From a link object, creates a string for each list element
   */
  
  var linkStr = function(link) {
    var str = '<li class="link"">' +
      '<span class="link-title"><a href="' + 
      link.url.href +'" target="_blank">' + 
      link.article.title + '</a></span>' +
      '<p class="link-info"><span class="link-footer-text">last mentioned on</span><span class="link-footer-value">' + 
      moment(link.created_at).format('MMM Do, HH:mm:ss') + '</span><span class="separator">|</span>' + 
      '<span class="link-footer-text">mentions:</span><span class="link-footer-value">' +
      link.freq + '</span>' +
      '<span class="separator">|</span>' +
      '<span class="kippt"><a href="https://kippt.com/extensions/new/?url=' +
      link.url.href + '&title=' + link.article.title + '" target="_blank">' +
      'Save to Kippt</a></span>' +
      '</span><span class="separator">|</span><span class="link-hostname">' +
      link.url.hostname + '</span>' +
      '</p></li>';
    return str;
  };
  
  
  /**
   * Request the current list, clears old entries
   * and renders the new list.
   */
  
  var render = function(links) {
    $.get(topUrl, function(res) {
      var links = sortLinks(res.data);
      $('ol').empty();
      $.each(links, function(){
        $('#links').append(linkStr(this));
      });
      //smooth the effect and make all changes appear at once
      //setTimeout(function(){$('body').scrollTop(0);}, 300);
    });
  };
  
  
  /**
   * Handle the refresh button behaviour. When refresh is pressed request the 
   * current list. The response data is the new topLinks list. Clear the
   * link list and fill it with the new data.
   */

  $('#newLinks').on('click', function() {
    render();
  });
  
  render();
    
});