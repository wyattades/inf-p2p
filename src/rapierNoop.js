class EventQueue {
  drainContactEvents() {}
  drainProximityEvents() {}
}

class RigidBody {
  handle = NaN;
  setTranslation() {
    return this;
  }
  applyForce() {
    return this;
  }
  linvel() {
    return { x: 0, y: 0, z: 0 };
  }
  setLinvel() {
    return this;
  }
  setAngvel() {
    return this;
  }
  setRotation() {
    return this;
  }
  translation() {
    return { x: 0, y: 0, z: 0 };
  }
}

class Collider {
  handle = NaN;
}

class World {
  createRigidBody() {
    return new RigidBody();
  }
  createCollider() {
    return new Collider();
  }
  removeRigidBody() {}
  step() {}
  free() {}
}

class RigidBodyDesc {
  setTranslation() {
    return this;
  }
}

class BodyStatus {}

class ColliderDesc {
  static capsule() {
    return new ColliderDesc();
  }
  static heightfield() {
    return new ColliderDesc();
  }
  setFriction() {
    return this;
  }
  setRestitution() {
    return this;
  }
}

export default {
  EventQueue,
  World,
  BodyStatus,
  ColliderDesc,
  RigidBodyDesc,
};
