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
  
  
  //when a user scroll back to the top, remove shadow from the header
  $(window).scroll(function() {
    if($(window).scrollTop() == 0) {
      $('.description-title').css({'-webkit-box-shadow' : '', 'box-shadow' : '' });
    } else {
      $('.description-title').css({'-webkit-box-shadow' : 'rgba(0, 0, 0, 0.0980392) 0px 3px 3px -1px', 'box-shadow' : 'rgba(0, 0, 0, 0.0980392) 0px 3px 3px -1px'});
    }
  });
  
  /**
   * Update newLinks every time the socket emits data, and
   * calculate the sum of differences between the new list
   * and the list currently displayed by the client.
   */
   
  socket.on('data', function(data) {
    newLinks = data;
    var dif = listDifference().length;
    
    /*
     *  if clause is needed because there will always be 1 new item, since
     * the list is constantly updated
     */
    if(dif > 1){
      //handle the newLinks bar display
      $('#sum').text(dif);
      $('#newLinks-text').text("new links");
      $('#newLinks').fadeIn();
      //handle favicon display
      document.title = '('+dif+') '+'Clearstream';
    }
  });
  
  
  /**
   * Render the list when the data is first emited.
   */
   
  socket.on('initialize', function(data) {
    $('ol').empty();
    newLinks = data;
    oldLinks = sortLinks(data);
    $.each(oldLinks, function(){
      $('#links').append(linkStr(this));
    });
    
    //hover function goes here, since the links are only now rendered
    articleHover();
  });
  
  
  /**
   * Return the number of links that exist in the newList,
   * but not in the old list.
   */
   
  var listDifference = function() {
    return _.difference(_.pluck(_.pluck(newLinks, "article"), "title"), _.pluck(_.pluck(oldLinks, "article"), "title"));
  };
  
  
  /**
   * Sorts the links by frequency
   */
  
  var sortLinks = function(unsorted) {
    var sorted = [];
    sorted = _.sortBy(unsorted, function(link){return link.freq;});
    sorted = sorted.reverse();
    return sorted;
  };
  
  
  /**
   * From a link object, creates a string for each list element
   */
  
  var linkStr = function(link) {
    //default string for text row, if no image is available
    var rowString = '<div class="row-fluid">' + 
        '<div class="link-text">' + link.article.html + '</div></div></a></article></li>';
    
    if(link.img.length > 1) {
      rowString =  
        ['<div class="row-fluid"><div class="span4 link-img-div">',
         '<img class="link-img" src="', link.img,
         '" title="' + link.article.title + '"></div>',
         '<div class="link-text">' + link.article.html,
         '</div></div></a></article></li>'
        ].join('');
    }
    
    //add label and appropriate classs for links not seen before
    var title = '';
    if(link.isNewLink) {
      title =
        ['<a href="', link.url.href,
         '" target="_blank" class="link-title new">',
         link.article.title, '</a>',
         '<span class="label label-success">new</span>'
        ].join('');
 
    } else {
      title = 
        ['<a href="', link.url.href,
         '" target="_blank" class="link-title">',
         link.article.title + '</a>'
        ].join('');
    }
    
    var str = '<li class="link"><article>' +
        title +
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
        '</p>' +
        '<a href="' + link.url.href + '" target="_blank">' +
        rowString;
    
    return str;
  };
  
  
  /**
   * Request the current list, clears old entries
   * and renders the new list.
   */
  
  var render = function() {
    //remove 'new' labels
    $('.label').remove();
    
    //keep a list with links not seen before
    var tempList = _.difference(_.pluck(_.pluck(newLinks, 'url'), 'href'), _.pluck(_.pluck(oldLinks, 'url'), 'href'));
    
    //update link lists
    oldLinks.length = 0;
    _.each(newLinks, function(link){
      oldLinks.push(link);
    });
    
    oldLinks = sortLinks(oldLinks);
    
    //render the new list
    $('ol').empty();
    
    $.each(oldLinks, function() {    
      this.isNewLink = ( _.indexOf(tempList, this.url.href) !== -1 );
      $('#links').append(linkStr(this));
    });
    
    //hide new links counter & update title
    $('#sum').text('');
    $('#newLinks').fadeOut();
    document.title = 'Clearstream';
    
    articleHover();
    
    setTimeout(function(){
      $('body').scrollTop(0);
    }, 200);
    
    setTimeout(function(){
      $('.link-img-div').each(function(){
        if($(this).height() < 40) {
          $(this).remove();
        }
      });
    }, 2000);
  };
  
  
  /**
   * Redirect to twitter for login
   */
  
  $('#login').on('click', function() {
    $.get('/auth/twitter', function(res) {
      console.log(req);
      console.log(res);
    });
  });
  
  
  /**
   * Handle the refresh button behaviour. When refresh is pressed request the 
   * current list. The response data is the new topLinks list. Clear the
   * link list and fill it with the new data.
   */

  $('#newLinks').on('click', render); 
  
  
  /**
   * Hover functionality for articles
   */
  
  function articleHover() {
    $('.link').hover(function(){
      $this = $(this);
      if($this.find('.new')) {
        $this.find('.label').fadeOut(1500, function() { $(this).remove(); });
        $this.find('.link-title').removeClass('new');
      }  
      $this.find('.link-title').addClass('hover');
    },
    function(){
      $(this).find('.link-title').removeClass('hover');
    });
  }
  
  
  /**
   * Hover functionality for newLinks counter button
   */
  
  $('#newLinks').on('mouseenter', function() {
    $('#sum').css({'color' : 'rgb(136, 172, 219)'});
    $('#newLinks-text').css({'color' : 'rgb(136, 172, 219)', 'text-decoration' : 'underline'});
  }).on('mouseleave', function(){
    $('#sum').css({'color' : 'rgb(55,55,55)'});
    $('#newLinks-text').css({'color' : 'rgb(179, 179, 177)', 'text-decoration' : 'none'});
  });
  
});