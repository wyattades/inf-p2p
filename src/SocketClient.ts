import * as _ from 'lodash-es';
import { Options as SimplePeerOptions } from 'simple-peer';
import P2PT, { Peer as TPeer } from 'p2pt';
import { EventEmitter } from 'events';
import * as THREE from 'three';

import Player, { playerHeight } from 'src/objects/Player';
import { toNum } from 'src/utils/math';
import { loadModel } from 'src/utils/models';

type UpdatePayload = {
  position: { x: number; y: number; z: number };
  velocity: { x: number; y: number; z: number };
  quaternion: { x: number; y: number; z: number; w: number };
};

const encodeUpdate = (up: UpdatePayload) => {
  const data = [
    up.position.x,
    up.position.y,
    up.position.z,
    up.velocity.x,
    up.velocity.y,
    up.velocity.z,
    up.quaternion.x,
    up.quaternion.y,
    up.quaternion.z,
    up.quaternion.w,
  ];
  return data.join(',');
};

const allNonNull = <T>(array: T[]): array is NonNullable<T>[] =>
  array.every((a) => a != null);

const decodeUpdate = (dataString: string): UpdatePayload | null => {
  const data = dataString.split(',').map(toNum);

  if (data.length !== 10 || !allNonNull(data)) return null;

  const update = {
    position: { x: data[0], y: data[1], z: data[2] },
    velocity: { x: data[3], y: data[4], z: data[5] },
    quaternion: { x: data[6], y: data[7], z: data[8], w: data[9] },
  };

  return update;
};

export class SocketClient {
  events = new EventEmitter();
  millisPerSend = 100; // 32;
  // initiator: boolean | null = null;
  // peer: SimplePeerType | null = null;
  // text = '';
  p2pt: P2PT | null = null;

  announceId = 'inf-p2p:world1';

  constructor(
    readonly otherPlayerGroup: THREE.Group,
    private readonly player: Player,
  ) {}

  // otherPeers: TPeer[] = [];
  get otherPeers(): TPeer[] {
    const peerChannels = ((this.p2pt as any)?.peers || {}) as {
      [peerId: string]: { [channelId: string]: TPeer };
    };

    const ret: TPeer[] = [];
    for (const peerId in peerChannels) {
      const channels = peerChannels[peerId];
      for (const channeld in channels) {
        ret.push(channels[channeld]);
      }
    }
    return _.uniqBy(ret, (p) => p.id);
  }

  playerModel?: THREE.Object3D;
  loadPlayerModel = _.memoize(async () => {
    const model = await loadModel(() => import('src/models/person.json'));
    model.scale.setScalar(0.034);
    // model.rotateX(-Math.PI / 2);
    return model;
  });

  async init() {
    // this.initiator = null;

    this.playerModel = await this.loadPlayerModel();

    const p2pt = (this.p2pt = new P2PT(
      // https://github.com/ngosang/trackerslist/blob/master/trackers_all_ws.txt
      [
        'wss://tracker.btorrent.xyz:443/announce',
        // 'wss://tracker.sloppyta.co:443/announce',
        // 'wss://tracker.novage.com.ua:443/announce',
        // 'wss://tracker.files.fm:7073/announce',
        // 'wss://spacetradersapi-chatbox.herokuapp.com:443/announce',
        // 'wss://qot.abiir.top:443/announce',
      ],
      this.announceId,
    ));

    const simplePeerOptions = this.simplePeerOptions();
    // undocumented:
    const rtcConfig = p2pt as {
      _rtcConfig?: SimplePeerOptions['config'];
      _wrtc?: SimplePeerOptions['wrtc'];
    };
    rtcConfig._rtcConfig = simplePeerOptions.config;
    rtcConfig._wrtc = simplePeerOptions.wrtc;

    // this.requestPeersInterval = window.setInterval(() => {
    //   p2pt.requestMorePeers();
    // }, 5000);

    p2pt.on('peerconnect', (peer) => {
      console.log('P2PT peerconnect', peer.id);

      this.enableSending();
      this.createPlayers();
    });
    p2pt.on('peerclose', (peer) => {
      console.log('P2PT peerclose', peer.id);

      this.enableSending();
      this.createPlayers();
    });

    p2pt.on('msg', (peer, msg) => {
      const data = decodeUpdate(msg);
      // console.log('P2PT msg', peer.id, msg, !!data);
      if (!data) return;

      const otherPlayer = this.otherPlayers[peer.id];
      if (otherPlayer) {
        this.updateOtherPlayer(otherPlayer, data);
      }
    });

    p2pt.on('trackerconnect', (tracker) => {
      console.log('P2PT trackerconnect', tracker.announceUrl);
    });
    p2pt.on('trackerwarning', (err) => {
      console.error('P2PT trackerwarning', err);
    });

    p2pt.start();

    // this.createPeer();
  }

  // onSubmit = (val: string) => {
  //   this.initiator = !!val;

  //   const isPeer = !!this.peer;
  //   if (!isPeer) this.createPeer();

  //   if (this.initiator) {
  //     if (!isPeer) {
  //       this.peer!.signal({
  //         type: 'offer',
  //         sdp: window.atob(val),
  //       });
  //     } else {
  //       this.peer!.signal({
  //         type: 'answer',
  //         sdp: window.atob(val),
  //       });
  //     }
  //   }
  // };

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

  // textEl?: HTMLInputElement;
  // setText(val: string) {
  //   this.text = val;
  //   // set by React:
  //   if (this.textEl) this.textEl.value = val;
  // }

  simplePeerOptions(): SimplePeerOptions {
    const username = 'openrelayproject',
      credential = 'openrelayproject';

    return {
      config: {
        // https://www.metered.ca/tools/openrelay
        iceServers: [
          {
            urls: 'stun:openrelay.metered.ca:80',
          },
          {
            urls: 'turn:openrelay.metered.ca:80',
            username,
            credential,
          },
          {
            urls: 'turn:openrelay.metered.ca:443',
            username,
            credential,
          },
          {
            urls: 'turn:openrelay.metered.ca:443?transport=tcp',
            username,
            credential,
          },
        ],
      },
    };
  }

  // createPeer() {
  //   this.initiator = window.location.hash.replace('#', '') !== 'receive';

  //   console.log('P2P init:', this.initiator);

  //   this.peer = new SimplePeer({
  //     ...this.simplePeerOptions(),
  //     initiator: this.initiator,
  //   });

  //   // this.peer.signal({
  //   //   type: 'offer',
  //   //   sdp
  //   // })

  //   this.peer.on('error', (err) => {
  //     console.error('P2P Error', err);
  //     this.events.emit('error', err);
  //   });

  //   this.peer.on('signal', (data) => {
  //     console.log('P2P signal', data);
  //     if (data.type === 'offer') {
  //       //
  //     } else if (data.type === 'candidate') {
  //       //
  //     } else if (data.type === 'answer') {
  //       //
  //     }
  //     // if (data.type === 'offer' || data.type === 'answer') {
  //     //   this.setText(window.btoa(data.sdp || ''));
  //     // }
  //   });

  //   this.peer.on('connect', () => {
  //     // this.setText('');
  //     console.log('P2P connect', this.initiator);
  //     this.events.emit('connect');

  //     this.enableSending();
  //   });

  //   this.peer.on('data', (data) => {
  //     this.events.emit('update', decodeUpdate(data.toString()));
  //   });
  // }

  broadcast(message: string) {
    for (const peer of this.otherPeers) {
      this.p2pt?.send(peer, message);
    }
  }

  otherPlayers: { [peerId: string]: THREE.Object3D } = {};
  createPlayers() {
    const otherPeers = this.otherPeers.map((p) => p.id);
    const otherPlayers = Object.keys(this.otherPlayers);

    for (const newPeerId of _.difference(otherPeers, otherPlayers)) {
      const model = this.playerModel!.clone();
      model.userData.peerId = newPeerId;
      this.otherPlayers[newPeerId] = model;
      this.otherPlayerGroup.add(model);
    }
    for (const oldPeerId of _.difference(otherPlayers, otherPeers)) {
      const oldPlayer = this.otherPlayers[oldPeerId];
      if (oldPlayer) {
        oldPlayer.removeFromParent();
        // oldPlayer.dispose();
        delete this.otherPlayers[oldPeerId];
      }
    }
  }

  updateOtherPlayer(obj: THREE.Object3D, data: UpdatePayload) {
    obj.position.copy(data.position as THREE.Vector3);
    obj.position.y -= playerHeight / 2;

    // TODO: when player is looking straight up, rotation doesn't work
    obj.quaternion.copy(data.quaternion as THREE.Quaternion);
    obj.rotateX(-Math.PI / 2);
    obj.rotateZ(Math.PI);
    obj.rotation.set(-Math.PI / 2, 0, obj.rotation.z);

    // TODO: velocity
  }

  enableSending() {
    if (!!this.otherPeers.length === !!this.sendInterval) return;

    if (!this.sendInterval) {
      this.sendInterval = window.setInterval(() => {
        if (!this.player) return console.warn('sendInterval: Missing player!');
        this.broadcast(encodeUpdate(this.player));
      }, this.millisPerSend);
    } else {
      window.clearInterval(this.sendInterval);
      this.sendInterval = null;
    }
  }

  requestPeersInterval: number | null = null;
  sendInterval: number | null = null;
  dispose() {
    if (this.sendInterval) {
      window.clearInterval(this.sendInterval);
      this.sendInterval = null;
    }

    if (this.requestPeersInterval) {
      window.clearInterval(this.requestPeersInterval);
      this.requestPeersInterval = null;
    }

    // this.setText('');

    this.events.removeAllListeners();

    // if (this.peer) {
    //   this.peer.destroy();
    //   this.peer = null;
    // }

    if (this.p2pt) {
      this.p2pt.destroy();
      this.p2pt = null;
    }
  }
}
