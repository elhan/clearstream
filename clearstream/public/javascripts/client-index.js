$(function () {
  
  var links = [];
  var indexUrl = 'http://localhost:3000';
  var topUrl = indexUrl.concat('/top');
  
  $(window).scroll(function() {
    if($(window).scrollTop() + $(window).height() == $(document).height()) {
      $.get(topUrl, function(res) {
        var links = res.data;
        renderAll(links);
      });
    }
  });
  
  
  /**
   * Sorts and reduces the initial list to only the top N elements
   */
  
  var topLinks = function(data) {
    var top = [];
    top = _.sortBy(data, function(link){return link.score;});
    top = top.reverse();
    top = _.first(top, 20);
    top = _.sortBy(top, function(link){return link.freq;});
    top = top.reverse();
    return top;
  };
  
  
  /**
   * From a link object, creates a string for each list element
   */
  
  var linkStr = function(link) {
    var str = '<li class="link"">' +
      '<span id="link-title"><a href="' + 
      link.url.href +'" target="_blank">' + 
      link.article.title + '</a></span>' +
      '<p id="link-info"><span class="link-footer-text">last mentioned on</span><span class="link-footer-value">' + 
      moment(link.created_at).format('MMM Do, HH:mm:ss') + '</span><span class="separator">|</span>' + 
      '<span class="link-footer-text">mentions:</span><span class="link-footer-value">' +
      link.freq + '</span>' +
      '</span><span class="separator">|</span><span id="link-hostname">' +
      link.url.hostname + '</span></p></li>';
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
   * Shows the entire list
   */
  
  var renderAll = function(links) {
    var all = [];
    all = _.sortBy(links, function(link){return link.score;});
    all = all.reverse();
    $('ol').empty();
    $.each(all, function(){
      $('#links').append(linkStr(this));
    });
  };
  
  
  /**
   * Handle the refresh button behaviour. When refresh is pressed request the 
   * current list. The response data is the new topLinks list. Clear the
   * link list and fill it with the new data.
   */

  $('#refresh').on('click', function() {
    $.get(topUrl, function(res) {
      var links = topLinks(res.data);
      renderTop(links);
      //smooth the effect and make all changes appear at once
      setTimeout(function(){$('body').scrollTop(0);}, 300);
    });
  });
    
});