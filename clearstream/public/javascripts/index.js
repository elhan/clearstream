
$(function () {
  
  var socket = io.connect(window.location.hostname);
  console.log(window.location.hostname);
  
  socket.on('data', function(data) {
    console.log(data);
  });
});