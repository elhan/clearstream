$(function () {
  
  var indexUrl = document.URL;
  var topUrl = indexUrl.concat('top');
  var newLinks = [];
  var oldLinks = [];
  
  //connect sockets
  var socket = io.connect(window.location.hostname);
  
  //on refresh, scroll to top
  $(window).bind('unload', function(){ 
    $('body').scrollTop(0);
  });
  
  
  /**
   * Update newLinks every time the socket emits data, and
   * calculate the sum of differences between the new list
   * and the list currently displayed by the client.
   */
   
  socket.on('data', function(data) {
    newLinks = data;
    var dif = listDifference();
    //if clause is needed because there will always be 1 new item, since
    //the list is constantly updated
    if(dif > 1){
      $('#sum').text(dif+" new links");
      $('#newLinks').slideDown();
      setTimeout(function(){$('#text-space').css('padding-top', '170px');}, 200);
    }
  });
  
  
  /**
   * Render the list when the data is first emited.
   */
   
  socket.on('initialize', function(data) {
    newLinks = data;
    oldLinks = data;
    $.each(data, function(){
      $('#links').append(linkStr(this));
    });
  });
  
  
  /**
   * Return the number of links that exist in the newList,
   * but not in the old list.
   */
   
  var listDifference = function() {
    return _.difference(_.pluck(_.pluck(newLinks, "article"), "title"), _.pluck(_.pluck(oldLinks, "article"), "title")).length;
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
  
  var render = function() {
    //update link lists
    oldLinks.length = 0;
    _.each(newLinks, function(link){
      oldLinks.push(link);
    });
    
    //render the new list
    $('ol').empty();
    $.each(oldLinks, function(){
      $('#links').append(linkStr(this));
    });
    
    //hide new links counter
    $('#sum').text('');
    $('#newLinks').slideUp();
    setTimeout(function(){$('#text-space').css('padding-top', '140px');}, 200);
    
    setTimeout(function(){$('body').scrollTop(0);}, 200);
  };
  
  
  /**
   * Handle the refresh button behaviour. When refresh is pressed request the 
   * current list. The response data is the new topLinks list. Clear the
   * link list and fill it with the new data.
   */

  $('#newLinks').on('click', function() {
    render();
  });
  
});