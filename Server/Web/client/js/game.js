var n = NPos3d,
	s = new n.Scene({

	}),
	client = {
	    entityMap: {},
	    ui: [],
	    entityTypes: {},
		paused: false,
		loggingEnabled: false,
		isUsingRemoteServer: false
	},
	playerEntity;
client.station = "None";

var windowSearchParser = function() {
	var args = window.location.search.replace('?','').split('&'),
		i, len = args.length, pair;
	for(i = 0; i < len; i += 1){
		pair = args[i].split('=');
		client[pair[0]] = pair[1];
	}
};
windowSearchParser(); //once when this page loads

var gameId = client.Game;

var keyStateMap = {};
var keyHandlerMap = {
	//Space Bar
	"32down": function () {
		client.paused = !client.paused;
	},
	//F8
	"119down": function () {
		client.loggingEnabled = !client.loggingEnabled;
		console.log('client.loggingEnabled set to', client.loggingEnabled);
	}
};
var keyEventHandler = function (event) {
	//console.log(event);
	var whichKey = (event.keyCode || event.which),
		type = event.type === 'keydown' ? 'down' : 'up';

	//keyStateMap is used for realtime, every RENDER FRAME keyboard state checks
	if (type === 'up') {
		keyStateMap[whichKey] = true;
	} else {
		keyStateMap[whichKey] = false;
	}

	//keyHandlerMap is used for keyboard events
	if (keyHandlerMap[whichKey + type]) {
		keyHandlerMap[whichKey + type]();
	}
};
$(window).on('keydown keyup', keyEventHandler);
var audioLoaded = false;
var timeSinceLastFrame = 0;
var timeOfLastFrame = new Date().getTime();
var timeSinceLastUpdate = 0;
var timeOfLastUpdate = timeOfLastFrame;
var deltaSinceUpdate = 0;
var mouseDown = false;
var canvasClickAndTouchHandler = function (event) {
    event.preventDefault();
    if (event.type === 'mouseup' || event.type === 'touchend') {
        mouseDown = false;
    } else {
        mouseDown = true;
    }
    //console.log('mouseDown:', mouseDown);
};
$(document).on('mousedown mouseup touchstart touchend touchstop', canvasClickAndTouchHandler);
var normalizeAngle = function (angle) {
    while (angle >= tau) {
        angle -= tau;
    }
    while (angle < 0) {
        angle += tau;
    }
    return angle;
};
var animationController = {
    update: function () {
        var currentTime = new Date().getTime();
        timeSinceLastFrame = currentTime - timeOfLastFrame;
        timeOfLastFrame = currentTime;
        deltaSinceUpdate = (currentTime - timeOfLastUpdate) / 250;
        if (playerEntity !== undefined) {
            s.camera.pos[0] = playerEntity.pos[0];
            s.camera.pos[1] = playerEntity.pos[1];
            if (mouseDown) {
                playerEntity.rot[2] = normalizeAngle(Math.atan2(s.mpos.y, s.mpos.x));
                //                console.log(playerEntity.rot[2]);
                if (client.station === "Helm") {
                    sendMessage("SetDesiredHeading", "amount=" + playerEntity.rot[2]);
                }
            }
        }
    }
};
s.add(animationController);

var deltaInit = function (o, entityData) {
	o.pos[0] = entityData.Position.X;
	o.pos[1] = entityData.Position.Y;
	o.pos[2] = entityData.Position.Z;
    o.posLast = o.pos.slice();
    o.posNext = o.pos.slice();
    o.posDiff = o.pos.slice();
	o.rot[2] = entityData.Rotation;
    o.rotLast = o.rot[2];
    o.rotNext = o.rot[2];
    o.rotDiff = o.rot[2];
};
var deltaUpdate = function (o, entityData) {
    o.posLast[0] = o.posNext[0];
    o.posLast[1] = o.posNext[1];
    o.posLast[2] = o.posNext[2];
    o.posNext[0] = entityData.Position.X;
    o.posNext[1] = entityData.Position.Y;
    o.posNext[2] = entityData.Position.Z;
    o.posDiff[0] = o.posNext[0] - o.posLast[0];
    o.posDiff[1] = o.posNext[1] - o.posLast[1];
    o.posDiff[2] = o.posNext[2] - o.posLast[2];
    o.lastRot = o.rotNext;
    o.rotNext = entityData.Rotation;
    o.rotDiff = o.rotNext - o.lastRot;
};
var deltaInterpolate = function (o) {
    o.pos[0] = o.posLast[0] + (o.posDiff[0] * deltaSinceUpdate);
    o.pos[1] = o.posLast[1] + (o.posDiff[1] * deltaSinceUpdate);
    o.pos[2] = o.posLast[2] + (o.posDiff[2] * deltaSinceUpdate);
    o.rot[2] = o.lastRot + (o.rotDiff * deltaSinceUpdate);
};

client.entityTypes.Ship = function (args) {
    var t = this, type = 'Ship';
    if (t.type !== type) { throw type + ' constructor must be invoked using the `new` keyword.'; }
    args = args || {};
    n.blessWith3DBase(t, args);
    t.scale = [10, 10, 10];
	t.threeMesh = threeMakeShip();
    s.add(t);
    return t;
};

client.entityTypes.Ship.prototype = {
    type: 'Ship',
    color: '#ff0',
    shape: wireframes.spear,
    renderAlways: true,
    update: function () {
        var t = this;
        deltaInterpolate(t);
        t.render();
    },
    updateFromData: function (entityData) {
        var t = this;
        deltaUpdate(t, entityData);
    }
};


client.entityTypes.Starbase = function (args) {
    var t = this, type = 'Starbase';
    if (t.type !== type) { throw type + ' constructor must be invoked using the `new` keyword.'; }
    args = args || {};
    n.blessWith3DBase(t, args);
    t.scale = [10, 10, 10];
	t.threeMesh = threeMakeStarbase();
    s.add(t);
    return t;
};

client.entityTypes.Starbase.prototype = {
    type: 'Starbase',
    color: '#00f',
    shape: wireframes.starBase,
    renderAlways: true,
    update: function () {
        var t = this;
        deltaInterpolate(t);
        t.render();
    },
    updateFromData: function (entityData) {
        var t = this;
        deltaUpdate(t, entityData);
    }
};

client.entityTypes.Enemy = function (args) {
    var t = this, type = 'Enemy';
    if (t.type !== type) { throw type + ' constructor must be invoked using the `new` keyword.'; }
    args = args || {};
    n.blessWith3DBase(t, args);
    t.scale = [10, 10, 10];
	t.threeMesh = threeMakeEnemy();
    s.add(t);
    return t;
};

client.entityTypes.Enemy.prototype = {
    type: 'Enemy',
    color: '#f00',
    shape: wireframes.fishShip,
    renderAlways: true,
    update: function () {
        var t = this;
        deltaInterpolate(t);
        t.render();
    },
    updateFromData: function (entityData) {
        var t = this;
        deltaUpdate(t, entityData);
    }
};

client.entityTypes.Projectile = function (args) {
    var t = this, type = 'Projectile';
    if (t.type !== type) { throw type + ' constructor must be invoked using the `new` keyword.'; }
    args = args || {};
    n.blessWith3DBase(t, args);
    t.scale = [0.25, 0.25, 0.25];
    s.add(t);
    return t;
};

client.entityTypes.Projectile.prototype = {
    type: 'Projectile',
    color: '#f00',
    shape: wireframes.simpleShip,
    renderAlways: true,
    update: function () {
        var t = this;
        deltaInterpolate(t);
        t.render();
    },
    updateFromData: function (entityData) {
        var t = this;
        deltaUpdate(t, entityData);
    }
};

var setEntityAsPlayer = function (entity) {
    var playerHeadingWidget = new n.Ob3D({
        shape: new n.Geom.Circle({
            radius: 3
        }),
        renderAlways: true,
        pos: [15, 0, 0],
        color: '#9f0'
    });
    var playerHeadingRadius = new n.Ob3D({
        shape: new n.Geom.Circle({
            radius: 15
        }),
        renderAlways: true,
        color: '#ccc'
    });
    entity.color = '#0f0';
    playerEntity = entity;
    entity.add(playerHeadingRadius);
    entity.add(playerHeadingWidget);
};

var setGameStateFromServer = function (data) {
    if (data.GameId == gameId) {
        var entityDataIndex,
			numEntities = data.Entities.length,
			entityData,
			entity,
			entityIdString,
			currentTime = new Date().getTime(),
			entitiesUpdatedThisFrame = {};
        timeSinceLastUpdate = currentTime - timeOfLastUpdate;
        timeOfLastUpdate = currentTime;
        //console.log('game state update!');
        //Update entities we received data for this frame
        for (entityDataIndex = 0; entityDataIndex < numEntities; entityDataIndex += 1) {
            entityData = data.Entities[entityDataIndex];
            entityIdString = 'entity-' + entityData.Id;
            entity = client.entityMap[entityIdString];
            if (entity === undefined) {
                entity = client.entityMap[entityIdString] = new client.entityTypes[entityData.Type]();
				deltaInit(entity, entityData);
                console.log(entityData.Id === data.ShipId, entity.Id, data.ShipId);
                if (entityData.Id === data.ShipId) {
                    setEntityAsPlayer(entity);
                }
            }
            entity.updateFromData(entityData);
            entitiesUpdatedThisFrame[entityIdString] = true;
        }

		//REMOVE entities we DID NOT receive data for this frame
		for (entityIdString in client.entityMap) {
			//console.log('entitiesUpdatedThisFrame[entityIdString]',entitiesUpdatedThisFrame[entityIdString],client.entityMap);
			if (entitiesUpdatedThisFrame[entityIdString] === undefined) {
				client.entityMap[entityIdString].destroy();
				delete client.entityMap[entityIdString];
				//console.log('removing entity:' + entityIdString);
			}
		}

        // play sounds
        if (audioLoaded)
        {
            for (var sound in data.Sounds)
            {
                SFX[sound].play();
            }
        }
    }
};

var serverPath = client.isUsingRemoteServer ? 'http://legendstudio.com/' : '/';
var currentGame = 'Game-' + gameId + '/';
var loadScript = function (relativePath) {
    document.write('<script type="text/javascript" src="' + serverPath + relativePath + '"></script>');
};
loadScript('Scripts/jquery.signalR-1.0.0-rc2.js');
loadScript('signalr/hubs');
loadScript('Global.js');