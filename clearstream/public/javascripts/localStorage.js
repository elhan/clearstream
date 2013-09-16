var ls = (function () {
  
  //holds all links read for storing in localstorage
  var linksRead = {};
  linksRead.list = [];
  var storedLinks = JSON.parse(localStorage.linksRead);
  var list = storedLinks.list;
  var ls = {};
  
  
  ls.getList = function() {
    return list;
  }
  
  /**
   * Stores link objects in local storage for reading later
   */
  ls.store = function(url) { 
    if(url && !this.contains(url)) {
      var linkObject = _.find(oldLinks, function(link){ return link.url.href == url;});
      linksRead.list.push(linkObject);
      localStorage.linksRead = JSON.stringify(linksRead);
      console.log('stored: '+url);
      
    } else {
      console.log('link already stored!');
    }
  };
  
  
  /**
   * Loads all stored links into memory
   */ 
  ls.load = function() {
    if(list.length > 0) { 
      newLinks = list;
      //mark the objects in the list as old
      $.each(newLinks, function(i) {
        newLinks[i].isNewLink = false;
      });
    }
  }
  
  
  /**
   * Clears links created more than a day ago from the local storage
   */ 
  function clear() {    
    if(storedLinks !== undefined && list.length > 0) {
      var now = moment();
      var creationDate = {};
    
      for(var i=0; i<list.length; i++) {
        if(list[i]) {
          creationDate = moment(list[i].created_at);
          if(now.diff(creationDate, 'days') > 1) list.splice(i, 1);
        }
      }
    }
  }
  
  
  /**
   * Returns true if a link is already stored in the local storage
   */
  ls.contains = function(url) {
    if(storedLinks !== undefined && list.length > 0) {
      try {
        var urlList = _.pluck(_.pluck(list, 'url'), 'href');
      } catch(e) {
        console.log(e);
      }
    }  
    return _.contains(urlList, url);
  }
  
  
  /**
   * Prints the contents of the localstorage
   */
  ls.print = function() {
    console.log(list);
  }
  
  //clear old entries
  clear();
  
  return ls;
  
}());