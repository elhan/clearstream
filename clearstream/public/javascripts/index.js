$(function () {
  
  var socket = io.connect(window.location.hostname);
//  console.log(window.location.hostname);
//  
//  socket.on('data', function(data) {
//    console.log(data);
//    window.location.reload();
///*        for (var link in data) {
//          $('li[data-keyword="' + key + '"]').each(function() {
//              $(this).css('background-color', 'rgb(' + Math.round(val * 255) +',0,0)');
//              $(this).attr('title', "frequency:  "+frequency);
//          });
//      } */
//      //$('#last-update').text(new Date().toTimeString());
//  });
  
  
  // the link model.
  Link = Backbone.Model.extend({
    url: "",
    freq: 0,
    score: 0,
    created_at: 0
  });
  
  
  // a collection that holds links
  Links = Backbone.Collections.extend({
    initialize: function (models, options) {
      //Listen for new additions to the collection and call a view function if so
      this.bind("add", options.view.addLink);
    }
  });
  
  
  AppView = Backbone.View.extend({
    el: $("body"),
    /* Create a friends collection when the view is initialized.
     * Pass it a reference to this view to create a connection between the two
     */
    initialize: function () {
      this.links = new Links( null, { view: this });
    },
    events: {
      "click #add-friend":  "showPrompt",
    },
    showPrompt: function () {
      var friend_name = prompt("Who is your friend?");
      var friend_model = new Friend({ name: friend_name });
      //Add a new friend model to our friend collection
      this.friends.add( friend_model );
      },
      addFriendLi: function (model) {
        //The parameter passed is a reference to the model that was added
        $("#friends-list").append("<li>" + model.get('name') + "</li>");
        //Use .get to receive attributes of the model
      }
    });
    var appview = new AppView;
});