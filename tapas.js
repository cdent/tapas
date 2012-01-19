$.ajaxSetup({
    beforeSend: function(xhr) {
                    xhr.setRequestHeader("X-ControlView", "false");
                }
});

var calculateSize = function() {
    var empx = $('#sizer').width();
    var height = $(window).height();
    var limit = Math.floor(height/(empx * 7) - 1)
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
}

var friendSearchSubs = function(friends, searchUrl) {
    var subs = [];
    $.each(friends, function(index, friend) {
        subs.push('modifier/' + friend);
    });
    var fbox = new Tiddlers($('#fbox'),
        searchUrl,
        subs);
    fbox.init();
};

var fboxSetup = function(user) {
    getFriends(user);
}

var dateString = function(date) {
    return new Date(Date.UTC(
        parseInt(date.substr(0, 4), 10),
        parseInt(date.substr(4, 2), 10) - 1,
        parseInt(date.substr(6, 2), 10),
        parseInt(date.substr(8, 2), 10),
        parseInt(date.substr(10, 2), 10),
        parseInt(date.substr(12, 2) || "0", 10),
        parseInt(date.substr(14, 3) || "0", 10)
        )).toISOString();
};

var urlFromUser = function(username) {
    return 'http://' + username + '.tiddlyspace.com';
};

var urlFromBag = function(bag) {
    var index = bag.indexOf('_public');
    var space = '';
    if (index >= 0) {
        space = bag.substr(0, index) + '.';
    }
    return 'http://' + space + 'tiddlyspace.com';
};

var Tiddlers = function(el, sourceuri, updater) {
    this.el = el;
    this.source = sourceuri + ';sort=modified';
    this.updater = updater;
    if (typeof(io) !== 'undefined') {
        this.socket = io.connect('http://tiddlyspace.com:8081',
                {'force new connection': true});
    }
};

$.extend(Tiddlers.prototype, {
    queue: [],
    push: function(tiddler) {
        this.queue.push(tiddler);
        this.updateUI();
    },

    updateUI: function() {
        var tiddler = this.queue.shift();
        var href = tiddler.uri;
        var tiddlerDate = dateString(tiddler.modified);

        var link = $('<a>').attr({'href': href,
            target: '_blank'}).text(tiddler.title);

        var abbr = $('<abbr>').attr({'class': 'timeago',
            title: tiddlerDate}).text(tiddlerDate);
        // set timeago explicitly as it is not "live" ready
        abbr.timeago();

        var modurl = urlFromUser(tiddler.modifier);
        var modlink = $('<a>').attr({'href': modurl});
        var modIcon = $('<img>').attr({'class': 'modicon',
            src: modurl + '/SiteIcon',
            alt: tiddler.modifier});
        modlink.append(modIcon);

        var spaceurl = urlFromBag(tiddler.bag);
        var spacelink = $('<a>').attr({'href': spaceurl});
        var spaceIcon = $('<img>').attr({'class': 'spaceicon',
            src: spaceurl + '/SiteIcon',
            alt: tiddler.bag});
        spacelink.append(spaceIcon);

        var li = $('<li>')
            .append(link)
            .append(abbr)
            .prepend(spacelink)
            .prepend(modlink);

        //li.click(function() {window.location.href = href});
        this.el.prepend(li);
        var children = this.el.children();
        while (children.length > calculateSize()) {
            children.last().remove();
            children = this.el.children();
        }
    },

    getTiddler: function(uri) {
        var self = this;
        $.ajax({
            dataType: 'json',
            url: uri,
            success: function(tiddler) {
                self.push(tiddler);
            }
        });
    },

    init: function() {
        var self = this;
        $.ajax({
            dataType: 'json',
            url: this.source,
            success: function(tiddlers) {
                $.each(tiddlers, function(index, tiddler) {
                    self.push(tiddler);
                });
            }
        });
        if (this.socket) {
            $.each(this.updater, function(index, sub) {
                self.socket.emit('subscribe', sub);
            });
            this.socket.on('tiddler', function(data) {
                self.getTiddler(data);
            });
        }
    },

});

// meat goes here
var init = function(status) {
    if (typeof(io) === 'undefined') {
        $('#message')
            .text('Unable to access socket server, functionality limited');
    } 
    var username = status.username;
    var atbox = new Tiddlers($('#atbox'),
            '/search?q=tag:@' + username,
            ['tags/@' + username]);
    var upbox = new Tiddlers($('#upbox'),
            '/search?q=',
            ['*']);
    atbox.init();
    upbox.init();
    fboxSetup(username);
};


//init
$.ajax({
    url: "/status",
    dataType: "json",
    success: function(data) {
        init(data); 
    },
    error: function(xhr, status, error) {
        $('#message').text('Unable to determine username');
    },
});
