class SwitchMonitor {

    static create(options) {
        if (window.parent.window.SignalkClient) {
            return(new SwitchMonitor(window.parent.window.SignalkClient, options));
        }

        if (options) {
            if ((options.server) && (options.port)) {
                return(new SwitchMonitor(new SignalkClient(options.server, options.port), options));
            } else {
                throw "SignalkController.create: required option attribute is missing (server and/or port)";
            }
        }

        return(null);
    }

    constructor(signalkClient, options) {
        if ((options) && (options.debug)) console.log("SwitchMonitor(%s,%s)...", signalkClient, JSON.stringify(options));

        if (!signalkClient) throw "SignalkController: SignalkClient must be specified";
        if (options.container) options.container = (typeof options.container === 'string')?document.querySelector(options.container):options.container;
        if (!options.container) options.container = document.body;
        if (!options.debug) options.debug = false;

        this.signalkClient = signalkClient;
        this.options = options;
        this.switchbanks = { "misc": [] };

        signalkClient.waitForConnection().then(_ => {
            signalkClient.getEndpoints(endpoints => {
                var switchKeys = new Set();
                endpoints.filter(e => e.startsWith('electrical.switches.bank.')).forEach(e => {
                    var match = e.match(/^electrical\.switches\.bank\.(.*)\..*$/);
                    if ((match) && (match.length == 2)) switchKeys.add(match[1]);
                });
                [...switchKeys].forEach(key => {
                    var sbmatch = key.match(/^(.+)\.(.+)$/);
                    if ((sbmatch) && (sbmatch.length == 3)) {
                        if (!this.switchbanks.hasOwnProperty('' + sbmatch[1])) this.switchbanks['' + sbmatch[1]] = [];
                        this.switchbanks['' + sbmatch[1]].push(key);
                    } else {
                        this.switchbanks['misc'].push(key);
                    }
                });

                Object.keys(this.switchbanks).forEach(switchbank => {
                    this.options.container.appendChild(this.makeSwitchBank(switchbank, this.switchbanks[switchbank]));
                });
            });
        });

    }

    /**
     * Channel classes:
     * artefact - removed from channels for which meta path information is present
     */ 
    makeSwitchBank(instance, channels) {
        //instance = (Number.isNaN(parseInt(instance, 10)))?instance:parseInt(instance, 10);
        var switchbankContainer = PageUtils.createElement('div', null, 'switchbank-container' + ((instance == 'misc')?'':'hidden'), null, null);
        var switchbankTable = PageUtils.createElement('div', null, 'table switchbank-table', null, switchbankContainer);
        var switchbankTableRow = PageUtils.createElement('div', null, 'switchbank-table-row', null, switchbankTable);
        var switchbankTableHeader = PageUtils.createElement('div', null, 'table-cell switchbank-table-header', document.createTextNode(instance.toUpperCase()), switchbankTableRow);
        var switchbankTableChannelContainer = PageUtils.createElement('div', null, 'table-cell switchbank-table-channel-container', null, switchbankTableRow); 
        var switchbankChannelTable = PageUtils.createElement('div', null, 'table switchbank-channel-table', null, switchbankTableChannelContainer);
        var switchbankChannelTableRow = PageUtils.createElement('div', null, 'table-row switchbank-channel-table-row', null, switchbankChannelTable);
        channels.forEach(key => {
            var path = "electrical.switches.bank." + key;
            var switchbankChannelCell = PageUtils.createElement('div', 'CH' + key, 'table-cell switchbank-channel-cell artifact', null, switchbankChannelTableRow);
            switchbankChannelCell.addEventListener('click', function(e) { this.operateSwitch(e.currentTarget.id.substr(2), e.currentTarget.classList.contains('on')); }.bind(this));
            var channelId = (key.includes('.'))?key.slice(key.lastIndexOf('.') + 1):key;
            var switchbankChannelCellKey = PageUtils.createElement('span', null, 'key hidden', document.createTextNode(channelId), switchbankChannelCell);  
            var switchbankChannelCellName = PageUtils.createElement('span', null, 'name', document.createTextNode(channelId), switchbankChannelCell);  
            if (Number.isNaN(parseInt(instance, 10))) switchbankChannelCell.classList.remove('artifact');

            this.signalkClient.getValue(path + '.state.meta', function(sbc, v) {
                sbc.classList.remove('artifact'); switchbankContainer.classList.remove('hidden');
                if (v.type) sbc.classList.add(v.type);
                if (v.displayName) {
                    sbc.querySelector('.name').innerHTML = v.displayName;
                    sbc.querySelector('.key').classList.remove('hidden');
                }
            }.bind(this, switchbankChannelCell), (v) => v);
            

            this.signalkClient.registerCallback(path + '.state', function(sbc,v) {
                var millis = Date.UTC() - Date.parse(v.timestamp);
                if (millis > 150000) sbc.classList.add('expired'); else sbc.classList.remove('expired');
                if (v.value) { sbc.classList.add('on'); sbc.classList.remove('off'); } else { sbc.classList.add('off'); sbc.classList.remove('on'); }
            }.bind(this, switchbankChannelCell), (v) => v);

        });
        return(switchbankContainer);
    }

    operateSwitch(key, state) {
        var path = "electrical.switches.bank." + key + ".state";
        var value = (!state)?3:2;
        this.signalkClient.putValue(path, value);
        /*
        var socket = new WebSocket("ws://192.168.1.1:6543");
        socket.onopen = function() {
            socket.send("letmein@switch." + key + ":" + ((state)?"OFF":"ON"));
            socket.close();
        };
        socket.onerror = function(err) {
            console.log(err);
        };
        */
    }
}
