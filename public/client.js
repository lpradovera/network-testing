var client;
var currentCall = null;
let _statsInterval = null;

var _timer = null;
var lastResult = null;

ready(function() {
  _timer = performance.now();
  listAvailableCodecs();
  patchRTCPeerCodecs();
  connect();
});

function getWantedCodecs() {
  const el = document.getElementById('codecs')
  const codecs = Array.from(el.selectedOptions).map(({ value }) => value)
  return {
    audio: codecs,
    video: ['video/VP8'],
  }
}

function listAvailableCodecs() {
  const { codecs: availSend } = RTCRtpSender.getCapabilities('audio');
  console.log('codecs', availSend);
  availSend.forEach(row => {
    const option = document.createElement('option');
    option.value = row.mimeType;
    option.text = row.mimeType;
    option.selected = true;
    document.getElementById('codecs').appendChild(option);
  });
}

function patchRTCPeerCodecs() {

  const mediaTypes = ['audio', 'video']

  const _createOffer = RTCPeerConnection.prototype.createOffer;
  const _createAnswer = RTCPeerConnection.prototype.createAnswer;

  function patch() {
    const wantedCodecs = getWantedCodecs()

    mediaTypes.forEach(media => {
      const transceiver = this.getTransceivers().find(t => {
        return t.sender.track.kind === media
      })
      if (transceiver) {
        const { codecs: availSend } = RTCRtpSender.getCapabilities(media);
        const { codecs: availRecv } = RTCRtpReceiver.getCapabilities(media);
        const newCodecs = []
        availSend.forEach(row => {
          if (wantedCodecs[media].includes(row.mimeType)) {
            newCodecs.push(row)
          }
        })
        availRecv.forEach(row => {
          if (wantedCodecs[media].includes(row.mimeType)) {
            newCodecs.push(row)
          }
        })
        console.log('availSend', availSend)
        console.log('availRecv', availRecv)
        console.log('Applying this codecs', JSON.stringify(newCodecs), 'for', media)
        transceiver.setCodecPreferences(newCodecs)
      } else {
        console.warn('No transceiver found for ', media)
      }
    })
  }


  RTCPeerConnection.prototype.createOffer = function(options) {
    try {
      console.log('This offer', this)
      patch.apply(this)
    } catch (error) {
      console.error('Error patching offer', error)
    }

    return _createOffer.apply(this, options);
  }

  RTCPeerConnection.prototype.createAnswer = function(options) {
    try {
      patch.apply(this)
    } catch (error) {
      console.error('Error patching answer', error)
    }

    return _createAnswer.apply(this, options);
  };
}

/**
  * Connect with Relay creating a client and attaching all the event handler.
*/

function connect() {
  client = new Relay({
    project: project,
    token: token
  });

  client.__logger.setLevel(client.__logger.levels.INFO)

  client.remoteElement = 'remoteVideo';
  client.localElement = 'localVideo';

  client.enableMicrophone();
  client.disableWebcam();

  client.on('signalwire.ready', function() {
    setStatus('Registered to SignalWire');
    show('callForm');
    reportTimerStat('client connect', performance.now() - _timer);
    if (forceTcp.checked == true) {
      manipulateIce();
    }
    _timer = null
  });

  // Update UI on socket close
  client.on('signalwire.socket.close', function() {
    setStatus('Ready');
    show('callbtn');
    hide('hangupbtn');
  });

  // Handle error...
  client.on('signalwire.error', function(error){
    console.error("SignalWire error:", error);
  });

  client.on('signalwire.notification', handleNotification);

  setStatus('Connecting...');
  client.connect();
}

function disconnect() {
  setStatus('Disconnecting...');
  client.disconnect();
}

/**
  * Handle notification from the client.
*/
function handleNotification(notification) {
  switch (notification.type) {
    case 'callUpdate':
      handleCallUpdate(notification.call);
      break;
    case 'userMediaError':
      // Permission denied or invalid audio/video params on `getUserMedia`
      console.error("SignalWire userMediaError:", notification);
      break;
  }
}

/**
  * Update the UI when the call's state change
*/
function handleCallUpdate(call) {
  currentCall = call;

  switch (call.state) {
    case 'new': // Setup the UI
      break;
    case 'trying': // You are trying to call someone and he's ringing now
      setStatus('Ringing...');
      break;
    case 'ringing': // Someone is calling you
      console.log('Inbound ringing...');
      console.log('using ICE servers', client.iceServers)
      currentCall.answer();
      break;
    case 'active': // Call has become active
      setStatus('Call is active');
      hide('callbtn');
      show('hangupbtn');
      toggleStats();
      reportTimerStat('call setup', performance.now() - _timer);
      _timer = null
      break;
    case 'hangup': // Call is over
      setStatus('Ready');
      show('callbtn');
      hide('hangupbtn');
      toggleStats();
      break;
    case 'destroy': // Call has been destroyed
      currentCall = null;
      break;
  }
}

/**
  * Make a new outbound call
*/
function makeCall() {
  clearElementbyId('stats');
  _timer = performance.now();
  var destination = document.getElementById('destination').value
  console.log('Calling ', destination);
  const params = {
    destinationNumber: destination,
    audio: true,
    video: false,
  };

  currentCall = client.newCall(params);
}

/**
  * Hangup the currentCall if present
*/
function hangUp() {
  if (currentCall) {
    currentCall.hangup();
  };
}

// these are support functions, not part of the main application

function show(selector) {
  var x = document.getElementById(selector);
  x.style.display = "block";
}

function hide(selector) {
  var x = document.getElementById(selector);
  x.style.display = "none";
}

function setStatus(text) {
  document.getElementById("status").innerHTML = text;
}

function getSelectValues(select) {
  var result = [];
  var options = select && select.options;
  var opt;

  for (var i=0, iLen=options.length; i<iLen; i++) {
    opt = options[i];

    if (opt.selected) {
      result.push(opt.value || opt.text);
    }
  }
  return result;
}

async function toggleStats() {
  if (_statsInterval) {
    return clearInterval(_statsInterval)
  }
  // Start the loop every 2 secs
  _statsInterval = window.setInterval(async () => {
    const stats = await currentCall.peer.instance.getStats(null)
    const keys = ['jitter', 'packetsLost', 'roundTripTime', 'timestamp' ];
    var result = {};
    result['outbound'] = 0;
    result['inbound'] = 0;
    stats.forEach(report => {
      if (report.type == 'remote-inbound-rtp') {
        
        keys.forEach(k => {
          // this packetsLost setting is for the remote stream, so this is how many are lost that we are sending
          result[k] = report[k];
        })
      }

      if (report.type === 'outbound-rtp') {
        if (report.isRemote) {
          return;
        }
        const now = report.timestamp;
        var bytes = report.bytesSent;
        var headerBytes = report.headerBytesSent;

        var packets = report.packetsSent;
        var lost = report.packetsLost;
        result.outboundPacketLoss = lost / packets * 100;
        if (lastResult && lastResult.has(report.id)) {
          // calculate bitrate
          const bitrate = 8 * (bytes - lastResult.get(report.id).bytesSent) /
            (now - lastResult.get(report.id).timestamp);
          const headerrate = 8 * (headerBytes - lastResult.get(report.id).headerBytesSent) /
            (now - lastResult.get(report.id).timestamp);
          result['outbound'] = bitrate + headerrate;
        }
      }

      if (report.type === 'inbound-rtp') {
        if (report.kind != 'audio') {
          return;
        }
        const now = report.timestamp;
        var bytes = report.bytesReceived;
        var headerBytes = report.headerBytesReceived;

        var packets = report.packetsReceived;
        var lost = report.packetsLost;
        result.packetLoss = (lost / packets * 100).toFixed(2);
        if (lastResult && lastResult.has(report.id)) {
          // calculate bitrate
          const bitrate = 8 * (bytes - lastResult.get(report.id).bytesReceived) /
            (now - lastResult.get(report.id).timestamp);
          const headerrate = 8 * (headerBytes - lastResult.get(report.id).headerBytesReceived) /
            (now - lastResult.get(report.id).timestamp);
          // some times just duplicates stuff
          if (bitrate + headerrate > 0) {
            result['inbound'] = bitrate + headerrate;
          }
        }
      }
    })
    lastResult = stats;
    console.log(result);
    statLine(result);
  }, 3000)
}

function statLine(stats) {
  var tr = document.createElement('tr');
  tr.innerHTML = `<td>${stats.timestamp}</td>
  <td>${stats.outbound.toFixed(2)} kbps</td>
  <td>${stats.inbound.toFixed(2)} kpbs</td>
  <td>${Math.round(stats.roundTripTime * 1000)} ms</td>
  <td>${stats.packetLoss}</td>
  <td>${Math.round(stats.jitter * 1000.0).toFixed(3)} ms</td>`;

  document.getElementById('stats').appendChild(tr);
}

function reportTimerStat(title, stat) {
  var elm = document.createElement('div');
  elm.className = "netStats";

  var bodyElm = document.createElement('div');
  bodyElm.innerHTML = "<b>" + title + "</b>: " + Math.round(stat) + ' ms';
  elm.appendChild(bodyElm);

  document.getElementById('timerstats').appendChild(elm);
}

function clearElementbyId(id) {
  document.getElementById(id).innerHTML = "";
}

function manipulateIce() {
  var serverList = client.iceServers;
  serverList[0].urls[0] = serverList[0].urls[0] + '?transport=tcp';
  client.iceServers = serverList;
  console.log('setting ICE servers', client.iceServers)
}

// jQuery document.ready equivalent
function ready(callback) {
  if (document.readyState != 'loading') {
    callback();
  } else if (document.addEventListener) {
    document.addEventListener('DOMContentLoaded', callback);
  } else {
    document.attachEvent('onreadystatechange', function() {
      if (document.readyState != 'loading') {
        callback();
      }
    });
  }
}