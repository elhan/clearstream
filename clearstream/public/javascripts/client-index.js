$(function () {
  
  var indexUrl = document.URL;
  var topUrl = indexUrl.concat('top');
   
  //on refresh, scroll to top
  $(window).bind('unload', function(){ 
    $('body').scrollTop(0);
  });
  
  //start polling for new links
  fetchNew();
  
  
  /**
   * Handles polling functionality to fetch "new" links
   */
   function fetchNew() {
     $.get(topUrl, function(res) {
       var links = topLinks(res.data);
       $('#sum').text(newLinks(links));
       setTimeout(fetchNew, 5000);
     });
   }
  
   
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
   * Handle showmore functionality
   */
  
  $(window).scroll(function() {
    if($(window).scrollTop() + $(window).height() == $(document).height()) {
      $.get(topUrl, function(res) {
        var links = sortLinks(res.data);
        renderAll(links);
      });
    }
  });
  
  
  /**
   * Sorts and reduces the initial list to only the top N elements
   */
  
  var topLinks = function(data) {
    var top = [];
    top = _.sortBy(data, function(link){return link.freq;});
    top = top.reverse();
    top = _.first(top, 20);
    top = _.sortBy(top, function(link){return link.freq;});
    top = top.reverse();
    return top;
  };
  
  
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
   * Renders the top links list
   */
  
  var renderTop = function(links) {
    $('#list-wrapper').fadeOut();
    $('ol').empty();
    $.each(links, function(){
      $('#links').append(linkStr(this));
    });
    $('#list-wrapper').fadeIn();
  };
  
  
  /**
   * Renders the entire list
   */
  
  var renderAll = function(links) {
    $('ol').empty();
    $.each(links, function(){
      $('#links').append(linkStr(this));
    });
  };
  
  
  /**
   * Handle the refresh button behaviour. When refresh is pressed request the 
   * current list. The response data is the new topLinks list. Clear the
   * link list and fill it with the new data.
   */

  $('#newLinks').on('click', function() {
    $.get(topUrl, function(res) {
      var links = topLinks(res.data);
      renderTop(links);
      //smooth the effect and make all changes appear at once
      setTimeout(function(){$('body').scrollTop(0);}, 300);
    });
  });
    
});