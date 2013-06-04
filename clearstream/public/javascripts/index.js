$(function() {

    var socket = io.connect(window.location.hostname);
    console.log(window.location.hostname);
    
    socket.on('data', function(data) {
    	console.log(data);
    	window.location.reload();
/*        for (var link in data) {
            $('li[data-keyword="' + key + '"]').each(function() {
                $(this).css('background-color', 'rgb(' + Math.round(val * 255) +',0,0)');
                $(this).attr('title', "frequency:  "+frequency);
            });
        } */
        //$('#last-update').text(new Date().toTimeString());
    });
    
    
})