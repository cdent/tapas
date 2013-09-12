$(function() {
    var host = window.tiddlyweb.status.server_host.host;
    var windowActive = true;
    var socketuri = 'http://' + host + ':8080';

    var setupTapas = function() {

        $(window).focus(function() {
            $('title').text('tapas');
            windowActive = true;
        });
        $(window).blur(function() { windowActive = false; });
        $(document).bind('tiddlersUpdate', function() {
            if (!windowActive) {
                var count = parseInt($('title').text().replace(/\s*tapas$/, '')
                    || "0", 10);
                $('title').text(++count + ' tapas');
            }
        });


        $.ajaxSetup({
            beforeSend: function(xhr) {
                            xhr.setRequestHeader("X-ControlView", "false");
                        }
        });

        var calculateSize = function() {
            var empx = $('#sizer').width();
            var height = $(window).height();
            var limit = Math.floor(height/(empx * 7) - 1);
            return limit;
        };

        var getFriends = function(user) {
            $.ajax({
                dataType: 'json',
                url: '/search?q=bag:' + user + '_public' +
                 '%20tag:follow%20_limit:100',
                success: function(tiddlers) {
                    var friends = [];
                    $.each(tiddlers, function(index, tiddler) {
                        friends.push(tiddler.title.replace(/^@/, ''));
                    });
                    friendSearchUrl(friends);
                }
            });
        };

        var friendSearchUrl = function(friends) {
            var search = friends.join('%20OR%20modifier:');
            var url = '/search?q=modifier:' + search;
            friendSearchSubs(friends, url);
        };

        var friendSearchSubs = function(friends, searchUrl) {
            var subs = [];
            $.each(friends, function(index, friend) {
                subs.push('modifier/' + friend);
            });
            var fbox = new Tiddlers($('#fbox'),
                socketuri,
                searchUrl,
                subs,
                {sizer: calculateSize});
            fbox.start();
        };

        var fboxSetup = function(user) {
            getFriends(user);
        };

        // meat goes here
        var init = function(status) {
            if (typeof(io) === 'undefined') {
                $('#message').text('Unable to access socket server, functionality limited');
            }
            var username = status.username;
            var upbox = new Tiddlers($('#upbox'),
                    socketuri,
                    '/search?q=',
                    ['*'],
                    {sizer: calculateSize});
            upbox.start();
            if (username !== 'GUEST') {
                var atbox = new Tiddlers($('#atbox'),
                        socketuri,
                        '/search?q=tag:@' + username,
                        ['tags/@' + username],
                        {sizer: calculateSize});
                atbox.start();
                fboxSetup(username);
            }
        };


        // use the data from status.js
        init(tiddlyweb.status);
    };

    // Replaces a hard-coded server script and
    // allows tapas to connect to socket.io regardless of what host it is on
    $.getScript(socketuri + "/socket.io/socket.io.js", setupTapas);

});
