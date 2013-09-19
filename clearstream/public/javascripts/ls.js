var ls = (function () {
  
  //holds all links read for storing in localstorage
  var linksRead = {};
  linksRead.list = [];
  var storedLinks = JSON.parse(localStorage.linksRead);
  var storedList = storedLinks.list;
  var ls = {};
  
  
  ls.getList = function() {
    return storedList;
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
   * Clears links created more than a day ago from the local storage
   */ 
  function clear() {    
    if(storedLinks !== undefined && storedList.length > 0) {
      var now = moment();
      var creationDate = {};
    
      for(var i=0; i<storedList.length; i++) {
        if(storedList[i]) {
          creationDate = moment(storedList[i].created_at);
          if(now.diff(creationDate, 'days') > 1) storedList.splice(i, 1);
        }
      }
      //necesary
      localStorage.linksRead = JSON.stringify(storedLinks) ;
    }
  }
  
  
  /**
   * Returns true if a link is already stored in the local storage
   */
  ls.contains = function(url) {
    if(storedLinks !== undefined && storedList.length > 0) {
      try {
        var urlList = _.pluck(_.pluck(storedList, 'url'), 'href');
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
    console.log(storedList);
  }
  
  //clear old entries
  clear();
  
  return ls;
  
}());