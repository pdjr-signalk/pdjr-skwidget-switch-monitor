class SwitchMonitorWidget {

  static install(signalkClient, container=window.document.body) {
    return(new SwitchMonitorWidget(signalkClient, container));
  }

  constructor(signalkClient, container) {
    this.signalkClient = signalkClient;
    this.switchmonitorwidget = null;
    this.switchbanks = { "misc": [] };

    var switchPaths = new Set();
    signalkClient.getAvailablePathsSync("^electrical\.switches\.bank\.(.+)\.(\\d+)\.state$").forEach(path => {
      path = path.substr(0, (path.length - 6));
      var meta = signalkClient.getValueSync(path + ".state.meta", (v) => v);
      if ((meta) && (meta.shortName)) {
        var sbmatch = path.match(/^.*\.(.+)\.(\d+)$/);
        if ((sbmatch) && (sbmatch.length == 3)) {
          var instance = "" + sbmatch[1];
          var index = parseInt(sbmatch[2]);
          if (!this.switchbanks.hasOwnProperty(instance)) this.switchbanks[instance] = [];
          this.switchbanks[instance].push({ path: path, meta: meta });
        } else {
          this.switchbanks['misc'].push({ path: path, meta: meta });
        }
      }
    });

    this.switchmonitorwidget = PageUtils.createElement('div', 'switchmonitorwidget', null, null, container);
    Object.keys(this.switchbanks).forEach(switchbank => {
      this.switchmonitorwidget.appendChild(this.makeSwitchBank(switchbank, this.switchbanks[switchbank]));
    });
  }

  makeSwitchBank(instance, channel) {
    //instance = (Number.isNaN(parseInt(instance, 10)))?instance:parseInt(instance, 10);
    var switchbankContainer = PageUtils.createElement('div', null, 'switchbank-container' + ((instance == 'misc')?'':'hidden'), null, null);
    var switchbankTable = PageUtils.createElement('div', null, 'table switchbank-table', null, switchbankContainer);
    var switchbankTableRow = PageUtils.createElement('div', null, 'switchbank-table-row', null, switchbankTable);
    var switchbankTableHeader = PageUtils.createElement('div', null, 'table-cell switchbank-table-header', document.createTextNode(instance.toUpperCase()), switchbankTableRow);
    var switchbankTableChannelContainer = PageUtils.createElement('div', null, 'table-cell switchbank-table-channel-container', null, switchbankTableRow); 
    var switchbankChannelTable = PageUtils.createElement('div', null, 'table switchbank-channel-table', null, switchbankTableChannelContainer);
    var switchbankChannelTableRow = PageUtils.createElement('div', null, 'table-row switchbank-channel-table-row', null, switchbankChannelTable);
    channel.forEach(channel => {
      var switchbankChannelCell = PageUtils.createElement('div', channel.path, 'table-cell switchbank-channel-cell artifact', null, switchbankChannelTableRow);
      switchbankChannelCell.addEventListener('click', function(e) { this.operateSwitch(e.currentTarget.id.substr(2), e.currentTarget.classList.contains('on')); }.bind(this));
      var channelId = (channel.path.includes('.'))?channel.path.slice(channel.path.lastIndexOf('.') + 1):channel.path;
      var switchbankChannelCellKey = PageUtils.createElement('span', null, 'key hidden', document.createTextNode(channelId), switchbankChannelCell);  
      var switchbankChannelCellName = PageUtils.createElement('span', null, 'name', document.createTextNode(channelId), switchbankChannelCell);  
      if (Number.isNaN(parseInt(instance, 10))) switchbankChannelCell.classList.remove('artifact');

      switchbankChannelCell.classList.remove('artifact'); switchbankContainer.classList.remove('hidden');
      if (channel.meta.type) switchbankChannelCell.classList.add(channel.meta.type);
      if (channel.meta.displayName) {
        switchbankChannelCell.querySelector('.name').innerHTML = channel.meta.displayName;
        switchbankChannelCell.querySelector('.key').classList.remove('hidden');
      }
            
      this.signalkClient.onValue(channel.path + ".state", function(sbc,v) {
        var millis = Date.UTC() - Date.parse(v.timestamp);
        var timeout = (channel.meta.timeout)?channel.meta.timeout:5000;
        if (millis > timeout) sbc.classList.add('expired'); else sbc.classList.remove('expired');
        if (v.value) { sbc.classList.add('on'); sbc.classList.remove('off'); } else { sbc.classList.add('off'); sbc.classList.remove('on'); }
      }.bind(this, switchbankChannelCell), (v) => v, false);

    });
    return(switchbankContainer);
  }

  operateSwitch(key, state) {
    var path = "electrical.switches.bank." + key + ".state";
    var value = (!state)?3:2;
    this.signalkClient.putValue(path, value);
  }

}
