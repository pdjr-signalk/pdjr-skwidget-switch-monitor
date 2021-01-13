class SwitchMonitorWidget {

  static install(signalkClient, container=window.document.body) {
    return(new SwitchMonitorWidget(signalkClient, container));
  }

  constructor(signalkClient, container) {
    this.signalkClient = signalkClient;
    this.switchmonitorwidget = null;
    this.switchbanks = { "misc": [] };

    var switchPaths = new Set();
    signalkClient.getAvailablePathsSync("^electrical\.switches\.bank\.(.+)\.(.+)\.state\.meta\.type$").forEach(path => {
      console.log("%s %s", path, path.substr(0, (path.length - 6)));
    });
    switchBankPaths.forEach(key => {
      var sbmatch = key.match(/^.*\.(.+)\.(\d+)\.state$/);
      if ((sbmatch) && (sbmatch.length == 3)) {
        console.log(sbmatch[1]);
        if (!this.switchbanks.hasOwnProperty('' + sbmatch[1])) this.switchbanks['' + sbmatch[1]] = [];
        this.switchbanks['' + sbmatch[1]].push(key);
      } else {
        this.switchbanks['misc'].push(key);
      }
    });

    this.switchmonitorwidget = PageUtils.createElement('div', 'switchmonitorwidget', null, null, container);
    Object.keys(this.switchbanks).forEach(switchbank => {
      this.switchmonitorwidget.appendChild(this.makeSwitchBank(switchbank, this.switchbanks[switchbank]));
    });
  }

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
  }

}
