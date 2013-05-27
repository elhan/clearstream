$(function() {

    var socket = io.connect(window.location.hostname);
    console.log(window.location.hostname);
    
    socket.on('data', function(data) {
        var total = data.total;
        for (var key in data.keywords) {
        
            var val = data.keywords[key] / total;
            var frequency = data.keywords[key];
            
            if (isNaN(val)) {
                val = 0;
            }
            
            $('li[data-keyword="' + key + '"]').each(function() {
                $(this).css('background-color', 'rgb(' + Math.round(val * 255) +',0,0)');
                $(this).attr('title', "frequency:  "+frequency);
            });

        }
        $('#last-update').text(new Date().toTimeString());
    });
    
    
})