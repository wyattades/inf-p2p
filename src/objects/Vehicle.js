import * as THREE from 'three';

import physics, { Body, RAPIER } from 'src/physics';

// - Global variables -
// const DISABLE_DEACTIVATION = 4;

// Graphics variables
// let container, stats, speedometer;
// let camera, controls;
// let terrainMesh, texture;
// const clock = new THREE.Clock();
// let materialDynamic, materialStatic, materialInteractive;

// Physics variables
// let collisionConfiguration;
// let dispatcher;
// let broadphase;
// let solver;
// let physicsWorld;

// let time = 0;
// const objectTimePeriod = 3;
// const timeNextSpawn = time + objectTimePeriod;
// const maxNumObjects = 30;

const FRONT_LEFT = 0;
const FRONT_RIGHT = 1;
const BACK_LEFT = 2;
const BACK_RIGHT = 3;

// - Functions -

// function onWindowResize() {
//   camera.aspect = window.innerWidth / window.innerHeight;
//   camera.updateProjectionMatrix();

//   renderer.setSize(window.innerWidth, window.innerHeight);
// }

// function initGraphics() {
// container = document.getElementById('container');
// speedometer = document.getElementById('speedometer');

// scene = new THREE.Scene();

// camera = new THREE.PerspectiveCamera(
//   60,
//   window.innerWidth / window.innerHeight,
//   0.2,
//   2000,
// );
// camera.position.x = -4.84;
// camera.position.y = 4.39;
// camera.position.z = -35.11;
// camera.lookAt(new THREE.Vector3(0.33, -0.4, 0.85));
// controls = new OrbitControls(camera);

// renderer = new THREE.WebGLRenderer({ antialias: true });
// renderer.setClearColor(0xbfd1e5);
// renderer.setPixelRatio(window.devicePixelRatio);
// renderer.setSize(window.innerWidth, window.innerHeight);

// const ambientLight = new THREE.AmbientLight(0x404040);
// scene.add(ambientLight);

// const dirLight = new THREE.DirectionalLight(0xffffff, 1);
// dirLight.position.set(10, 10, 5);
// scene.add(dirLight);

// materialDynamic = new THREE.MeshPhongMaterial({ color: 0xfca400 });
// materialStatic = new THREE.MeshPhongMaterial({ color: 0x999999 });
// materialInteractive = new THREE.MeshPhongMaterial({ color: 0x990000 });

// container.innerHTML = '';

// container.appendChild(renderer.domElement);

// stats = new Stats();
// stats.domElement.style.position = 'absolute';
// stats.domElement.style.top = '0px';
// container.appendChild(stats.domElement);

// window.addEventListener('resize', onWindowResize, false);

// }

// function initPhysics() {
//   // Physics configuration
//   const collisionConfiguration = new Ammo.btDefaultCollisionConfiguration();
//   const dispatcher = new Ammo.btCollisionDispatcher(collisionConfiguration);
//   const broadphase = new Ammo.btDbvtBroadphase();
//   const solver = new Ammo.btSequentialImpulseConstraintSolver();
//   physicsWorld = new Ammo.btDiscreteDynamicsWorld(
//     dispatcher,
//     broadphase,
//     solver,
//     collisionConfiguration,
//   );
//   physicsWorld.setGravity(new Ammo.btVector3(0, -9.82, 0));
// }

export default class Vehicle {
  material = new THREE.MeshPhongMaterial({
    color: 0x995500,
  });
  wheelMaterial = new THREE.MeshPhongMaterial({
    color: 0x221100,
  });
  // physicsWorld = getWorld();

  engineForce = 0;
  vehicleSteering = 0;
  breakingForce = 0;

  /**
   * @param {import('src/Game').default} game
   */
  constructor(game, position) {
    this.game = game;
    this.scene = game.scene;

    this.game.controls.setKeyBind('acceleration', 'ArrowUp');
    this.game.controls.setKeyBind('braking', 'ArrowDown');
    this.game.controls.setKeyBind('turnLeft', 'ArrowLeft');
    this.game.controls.setKeyBind('turnRight', 'ArrowRight');

    this.createVehicle(position);
  }

  get matrixWorld() {
    return this.chassisMesh.matrixWorld;
  }

  setPos(x, y, z) {
    // this.body.setLinearVelocity(new Ammo.btVector3(0, 0, 0));
    // this.body.setAngularVelocity(new Ammo.btVector3(0, 0, 0));

    // const transform = this.vehicleBody.getChassisWorldTransform();
    // const origin = transform.getOrigin();
    // const rotation = transform.getRotation();

    // rotation.setValue(0, 0, 0, 1);
    // transform.setRotation(rotation);

    if (x == null) x = this.position.x;
    if (y == null) y = this.position.y;
    if (z == null) z = this.position.z;

    // origin.setValue(x, y, z);
    this.position.set(x, y, z);
  }

  flip() {
    this.setPos(this.position.x, this.position.y + 5, this.position.z);
  }

  createVehicle(pos) {
    // Vehicle constants:

    const chassisWidth = 4;
    const chassisHeight = 1.5;
    const chassisLength = 7;
    const massVehicle = 800;

    const wheelAxisPositionBack = -2;
    const wheelRadiusBack = 0.8;
    const wheelWidthBack = 0.4;
    const wheelHalfTrackBack = chassisWidth / 2 + wheelWidthBack / 2;
    const wheelAxisHeightBack = -0.8;

    const wheelAxisPositionFront = 2.5;
    const wheelRadiusFront = wheelRadiusBack;
    const wheelWidthFront = wheelWidthBack;
    const wheelHalfTrackFront = wheelHalfTrackBack;
    const wheelAxisHeightFront = wheelAxisHeightBack;

    const friction = 1000;
    const suspensionStiffness = 20.0;
    const suspensionDamping = 2.3;
    const suspensionCompression = 4.4;
    const suspensionRestLength = 0.6;
    const rollInfluence = 0.2;

    // Chassis:

    const chassisMesh = (this.chassisMesh = new THREE.Mesh(
      new THREE.BoxGeometry(
        chassisWidth,
        chassisHeight,
        chassisLength,
        1,
        1,
        1,
      ),
      this.material,
    ));
    this.position = chassisMesh.position;
    this.position.set(20, 30, 20);
    this.rotation = chassisMesh.rotation;

    const chassisBody = (this.chassisBody = new Body(
      chassisMesh,
      physics.world,
    ));
    chassisBody.addCollider(
      RAPIER.ColliderDesc.cuboid(
        chassisWidth * 0.5,
        chassisHeight * 0.5,
        chassisLength * 0.5,
      ),
    );

    this.scene.add(chassisMesh);

    // const geometry = new Ammo.btBoxShape(
    //   new Ammo.btVector3(
    //     chassisWidth * 0.5,
    //     chassisHeight * 0.5,
    //     chassisLength * 0.5,
    //   ),
    // );
    // const transform = new Ammo.btTransform();
    // transform.setIdentity();
    // transform.setOrigin(new Ammo.btVector3(pos.x, pos.y, pos.z));
    // transform.setRotation(
    //   new Ammo.btQuaternion(
    //     ZERO_QUATERNION.x,
    //     ZERO_QUATERNION.y,
    //     ZERO_QUATERNION.z,
    //     ZERO_QUATERNION.w,
    //   ),
    // );
    // const motionState = new Ammo.btDefaultMotionState(transform);
    // const localInertia = new Ammo.btVector3(0, 0, 0);
    // geometry.calculateLocalInertia(massVehicle, localInertia);
    // const body = (this.body = new Ammo.btRigidBody(
    //   new Ammo.btRigidBodyConstructionInfo(
    //     massVehicle,
    //     motionState,
    //     geometry,
    //     localInertia,
    //   ),
    // ));

    // body.setActivationState(DISABLE_DEACTIVATION);
    // this.physicsWorld.addRigidBody(body);

    // // Raycast Vehicle

    // const tuning = new Ammo.btVehicleTuning();
    // const rayCaster = new Ammo.btDefaultVehicleRaycaster(this.physicsWorld);
    // this.vehicleBody = this.btVehicle = new Ammo.btRaycastVehicle(
    //   tuning,
    //   body,
    //   rayCaster,
    // );
    // this.vehicleBody.setCoordinateSystem(0, 1, 2);
    // this.physicsWorld.addAction(this.vehicleBody);

    // Wheels:

    this.wheelMeshes = [];
    this.wheelBodies = [];
    // const wheelDirectionCS0 = new THREE.Vector3(0, -1, 0);
    // const wheelAxleCS = new THREE.Vector3(-1, 0, 0);

    const addWheel = (index, radius, width, position) => {
      const geometry = new THREE.CylinderGeometry(radius, radius, width, 24, 1);

      const mesh = new THREE.Mesh(geometry, this.wheelMaterial);

      const stickHeight = width * 0.25;
      const stickMesh = new THREE.Mesh(
        new THREE.BoxGeometry(
          radius * 1.75,
          stickHeight,
          radius * 0.25,
          1,
          1,
          1,
        ),
        this.wheelMaterial,
      );
      stickMesh.position.y += width / 2 + stickHeight / 2;
      mesh.add(stickMesh);

      mesh.rotateZ(-Math.sign(position.x) * Math.PI * 0.5);

      mesh.position.copy(position).add(this.chassisMesh.position);

      this.scene.add(mesh);
      // this.chassisMesh.add(mesh);

      this.wheelMeshes[index] = mesh;

      const body = new Body(mesh, physics.world);
      body.addCollider(RAPIER.ColliderDesc.cylinder(width / 2, radius));

      this.wheelBodies[index] = body;

      physics.world.createJoint(
        RAPIER.JointParams.revolute(
          new THREE.Vector3(0, 0, 0),
          new THREE.Vector3(1, 0, 0),
          new THREE.Vector3(0, 0, 0),
          new THREE.Vector3(-1, 0, 0),
        ),
        this.chassisBody.rigidBody,
        body.rigidBody,
      );

      // const wheelInfo = this.vehicleBody.addWheel(
      //   position,
      //   wheelDirectionCS0,
      //   wheelAxleCS,
      //   suspensionRestLength,
      //   radius,
      //   tuning,
      //   isFront,
      // );

      // wheelInfo.set_m_suspensionStiffness(suspensionStiffness);
      // wheelInfo.set_m_wheelsDampingRelaxation(suspensionDamping);
      // wheelInfo.set_m_wheelsDampingCompression(suspensionCompression);
      // wheelInfo.set_m_frictionSlip(friction);
      // wheelInfo.set_m_rollInfluence(rollInfluence);
    };

    addWheel(
      FRONT_LEFT,
      wheelRadiusFront,
      wheelWidthFront,
      new THREE.Vector3(
        -wheelHalfTrackFront,
        wheelAxisHeightFront,
        wheelAxisPositionFront,
      ),
    );
    addWheel(
      FRONT_RIGHT,
      wheelRadiusFront,
      wheelWidthFront,
      new THREE.Vector3(
        wheelHalfTrackFront,
        wheelAxisHeightFront,
        wheelAxisPositionFront,
      ),
    );
    addWheel(
      BACK_LEFT,
      wheelRadiusBack,
      wheelWidthBack,
      new THREE.Vector3(
        -wheelHalfTrackBack,
        wheelAxisHeightBack,
        wheelAxisPositionBack,
      ),
    );
    addWheel(
      BACK_RIGHT,
      wheelRadiusBack,
      wheelWidthBack,
      new THREE.Vector3(
        wheelHalfTrackBack,
        wheelAxisHeightBack,
        wheelAxisPositionBack,
      ),
    );
  }

  // createObjects() {
  //   // this.createBox(this.startingPosition, ZERO_QUATERNION, 75, 1, 75, 0, 2);

  //   // const quaternion = new THREE.Quaternion(0, 0, 0, 1);
  //   // quaternion.setFromAxisAngle(new THREE.Vector3(1, 0, 0), -Math.PI / 18);
  //   // this.createBox(new THREE.Vector3(0, -1.5, 0), quaternion, 8, 4, 10, 0);

  //   // const size = 0.75;
  //   // const nw = 8;
  //   // const nh = 6;
  //   // for (let j = 0; j < nw; j++)
  //   //   for (let i = 0; i < nh; i++)
  //   //     this.createBox(
  //   //       new THREE.Vector3(size * j - (size * (nw - 1)) / 2, size * i, 10),
  //   //       ZERO_QUATERNION,
  //   //       size,
  //   //       size,
  //   //       size,
  //   //       10,
  //   //     );

  // }

  update(delta, time) {
    const steeringIncrement = 0.04;
    const steeringClamp = 0.6;
    const maxEngineForce = 2000;
    const maxBreakingForce = 100;

    this.engineForce = 0;
    this.breakingForce = 0;

    const speed = this.chassisBody.getSpeed();

    const keystate = this.game.controls.keystate;

    // speedometer.innerHTML = `${(speed < 0 ? '(R) ' : '') +
    //   Math.abs(speed).toFixed(1)} km/h`;

    if (keystate.acceleration) {
      if (speed < -1) this.breakingForce = maxBreakingForce;
      else this.engineForce = maxEngineForce;
    }
    if (keystate.braking) {
      if (speed > 1) this.breakingForce = maxBreakingForce;
      else this.engineForce = -maxEngineForce / 2;
    }
    if (keystate.turnLeft) {
      if (this.vehicleSteering < steeringClamp)
        this.vehicleSteering += steeringIncrement;
    } else if (keystate.turnRight) {
      if (this.vehicleSteering > -steeringClamp)
        this.vehicleSteering -= steeringIncrement;
    } else if (this.vehicleSteering < -steeringIncrement)
      this.vehicleSteering += steeringIncrement;
    else if (this.vehicleSteering > steeringIncrement)
      this.vehicleSteering -= steeringIncrement;
    else {
      this.vehicleSteering = 0;
    }

    this.chassisBody.copyToObj(this.chassisMesh);

    for (let i = 0; i < 4; i++)
      this.wheelBodies[i].copyToObj(this.wheelMeshes[i]);

    // this.vehicleBody.applyEngineForce(this.engineForce, BACK_LEFT);
    // this.vehicleBody.applyEngineForce(this.engineForce, BACK_RIGHT);

    // this.vehicleBody.setBrake(this.breakingForce / 2, FRONT_LEFT);
    // this.vehicleBody.setBrake(this.breakingForce / 2, FRONT_RIGHT);
    // this.vehicleBody.setBrake(this.breakingForce, BACK_LEFT);
    // this.vehicleBody.setBrake(this.breakingForce, BACK_RIGHT);

    // this.vehicleBody.setSteeringValue(this.vehicleSteering, FRONT_LEFT);
    // this.vehicleBody.setSteeringValue(this.vehicleSteering, FRONT_RIGHT);

    // let tm, p, q, i;
    // const n = this.vehicleBody.getNumWheels();
    // for (i = 0; i < n; i++) {
    //   this.vehicleBody.updateWheelTransform(i, true);
    //   tm = this.vehicleBody.getWheelTransformWS(i);
    //   p = tm.getOrigin();
    //   q = tm.getRotation();
    //   this.wheelMeshes[i].position.set(p.x(), p.y(), p.z());
    //   this.wheelMeshes[i].quaternion.set(q.x(), q.y(), q.z(), q.w());
    // }

    // tm = this.vehicleBody.getChassisWorldTransform();
    // p = tm.getOrigin();
    // q = tm.getRotation();
    // this.chassisMesh.position.set(p.x(), p.y(), p.z());
    // this.chassisMesh.quaternion.set(q.x(), q.y(), q.z(), q.w());
    // console.log(chassisMesh.position.toArray().map(x => x.toFixed(2)).join(', '));
    // for (const sync of this.syncList) sync(delta);
    // this.physicsWorld.stepSimulation(delta, 1);
    // controls.update(delta);
  }

  // render() {
  //   this.renderer.render(this.scene, camera);
  // }

  dispose() {
    this.body?.dispose();
    this.scene.remove(this.chassisMesh);
  }
}
