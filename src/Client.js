// import P2P from 'socket.io-p2p';
// import io from 'socket.io-client';
import Peer from 'simple-peer';
import { EventEmitter } from 'events';


const $p2p = document.getElementById('p2p');
const $text = $p2p.querySelector('textarea');

const encodeUpdate = ({ position, velocity, rotation }) => {
  const data = [ position.x, position.y, position.z, velocity.x, velocity.y, velocity.z, rotation.x, rotation.y ];
  return data.join(',');
};

const decodeUpdate = (dataString) => {
  const data = dataString.split(',');

  if (data.length !== 8) return null;

  for (let i = 0; i < data.length; i++) {
    const num = Number.parseFloat(data[i]);
    if (Number.isNaN(num)) return null;
    else data[i] = num;
  }

  const update = {
    position: { x: data[0], y: data[1], z: data[2] },
    velocity: { x: data[3], y: data[4], z: data[5] },
    rotation: { x: data[6], y: data[7] },
  };

  return update;
};

export default class Client extends EventEmitter {

  constructor(player) {
    super();

    this.player = player;

    this.updateSpeed = 32;
  }

  init() {
    this.initiator = false;

    $p2p.addEventListener('submit', this.onSubmit);
  }

  onSubmit = (e) => {
    e.preventDefault();
    const val = $text.value.trim();
    
    if (!val) this.initiator = true;

    this.createPeer();
    
    if (val) this.p.signal({
      type: 'offer',
      sdp: window.atob(val),
    });
  }

  // init() {
  //   const socket = io();

  //   this.p2p = new P2P(socket, {
  //     peerOpts: {
  //       // trickle: false,
  //     },
  //     // autoUpgrade: false,
  //   }, () => { // finished connected
  //     // this.p2p.emit('peer-obj', `Hello there. I am ${this.p2p.peerId}`);
  //   });
    
  //   this.p2p.on('ready', () => {
  //     this.p2p.usePeerConnection = true;
  //     this.p2p.emit('peer-obj', { peerId: this.p2p.peerId });
  //   });
    
  //   // this event will be triggered over the socket transport
  //   // until `usePeerConnection` is set to `true`
  //   this.p2p.on('peer-msg', (data) => {
  //     const decoded = decodeUpdate(data);
  //     console.log(decoded);
  //     if (decoded) this.receiveUpdate(decoded);
  //   });
  // }

  // sendUpdate(data) {
  //   this.p2p.emit('peer-msg', encodeUpdate(data));
  // }

  createPeer() {

    $p2p.removeEventListener('submit', this.onSubmit);
    
    this.p = new Peer({
      initiator: this.initiator,
    });

    this.p.on('error', (err) => {
      console.error('P2P Error', err);
      this.emit('error', err);
    });

    this.p.on('signal', (data) => {
      if (data.type === 'offer' || data.type === 'answer') {
        $text.value = window.btoa(data.sdp);
      }
    });

    if (this.initiator) {
      const onSubmit = (e) => {
        $p2p.removeEventListener('submit', onSubmit);
        e.preventDefault();
        this.p.signal({
          type: 'answer',
          sdp: window.atob($text.value.trim()),
        });
      };
      $p2p.addEventListener('submit', onSubmit);
    }

    this.p.on('connect', () => {
      $text.value = '';
      console.log('CONNECT', !!this.initiator);
      this.emit('connect');
      this.sendInterval = window.setInterval(() => {
        this.p.send(encodeUpdate(this.player));
      }, this.updateSpeed);
    });

    this.p.on('data', (data) => {
      this.emit('update', decodeUpdate(data.toString()));
    });
  }

  dispose() {
    if (this.sendInterval) {
      window.clearInterval(this.sendInterval);
      this.sendInterval = null;
    }

    $text.value = '';

    this.removeAllListeners();

    if (this.p) this.p.destroy();
  }

}
