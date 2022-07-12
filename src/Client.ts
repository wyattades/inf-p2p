// import P2P from 'socket.io-p2p';
// import io from 'socket.io-client';
import Peer, { Instance as SimplePeer } from 'simple-peer';
import { EventEmitter } from 'events';

import type Player from 'src/objects/Player';
import { toNum } from 'src/utils/math';

type UpdatePayload = {
  position: { x: number; y: number; z: number };
  velocity: { x: number; y: number; z: number };
  rotation: { x: number; y: number };
};

const encodeUpdate = ({ position, velocity, rotation }: UpdatePayload) => {
  const data = [
    position.x,
    position.y,
    position.z,
    velocity.x,
    velocity.y,
    velocity.z,
    rotation.x,
    rotation.y,
  ];
  return data.join(',');
};

const allNonNull = <T>(array: T[]): array is NonNullable<T>[] =>
  array.every((a) => a != null);

const decodeUpdate = (dataString: string): UpdatePayload | null => {
  const data = dataString.split(',').map(toNum);

  if (data.length !== 8 || !allNonNull(data)) return null;

  const update = {
    position: { x: data[0], y: data[1], z: data[2] },
    velocity: { x: data[3], y: data[4], z: data[5] },
    rotation: { x: data[6], y: data[7] },
  };

  return update;
};

export default class Client {
  events = new EventEmitter();
  updateSpeed = 32;
  initiator: boolean | null = null;
  peer: SimplePeer | null = null;
  text = '';

  constructor(private readonly player: Player) {}

  init() {
    this.initiator = null;
  }

  onSubmit = (val: string) => {
    this.initiator = !!val;

    const isPeer = !!this.peer;
    if (!isPeer) this.createPeer();

    if (this.initiator) {
      if (!isPeer) {
        this.peer!.signal({
          type: 'offer',
          sdp: window.atob(val),
        });
      } else {
        this.peer!.signal({
          type: 'answer',
          sdp: window.atob(val),
        });
      }
    }
  };

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

  textEl?: HTMLInputElement;
  setText(val: string) {
    this.text = val;
    // set by React:
    if (this.textEl) this.textEl.value = val;
  }

  createPeer() {
    this.peer = new Peer({
      initiator: this.initiator ?? undefined,
    });

    this.peer.on('error', (err) => {
      console.error('P2P Error', err);
      this.events.emit('error', err);
    });

    this.peer.on('signal', (data) => {
      if (data.type === 'offer' || data.type === 'answer') {
        this.setText(window.btoa(data.sdp || ''));
      }
    });

    this.peer.on('connect', () => {
      this.setText('');
      console.log('CONNECT', this.initiator);
      this.events.emit('connect');
      this.sendInterval = window.setInterval(() => {
        this.peer!.send(encodeUpdate(this.player));
      }, this.updateSpeed);
    });

    this.peer.on('data', (data) => {
      this.events.emit('update', decodeUpdate(data.toString()));
    });
  }

  sendInterval?: number | null;
  dispose() {
    if (this.sendInterval) {
      window.clearInterval(this.sendInterval);
      this.sendInterval = null;
    }

    this.setText('');

    this.events.removeAllListeners();

    if (this.peer) {
      this.peer.destroy();
      this.peer = null;
    }
  }
}
