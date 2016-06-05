/* global PIXI TileUtilities createjs */
const credits = `
    gameplay by:
    jorden kreps\n
    art by:
    jorden kreps\n
    music by:
    jorden kreps\n\n\n
    tech used:
    atom
    bfxr
    createJS
    ecmascript 2015
    eslint
    freac
    garageband
    gimp
    http-server
    livereload
    normalize.css
    pixi-audio
    pixi.js
    texturepacker
    tiled
`;
PIXI.SCALE_MODES.DEFAULT = PIXI.SCALE_MODES.NEAREST;
const GAME_SCALE = 1;
const GAME_WIDTH = 640;
const GAME_HEIGHT = 400;
const tu = new TileUtilities(PIXI);
const gameport = document.getElementById('gameport');
const renderer = PIXI.autoDetectRenderer(640, 400, { backgroundColor: 0x000 });
gameport.appendChild(renderer.view);

const stage = new PIXI.Container();
const gameOverScreen = new PIXI.Container();

let world;
let titleOverlay;
const gameOverlay = new PIXI.Container();

stage.scale.x = GAME_SCALE;
stage.scale.y = GAME_SCALE;
const playerWalkingFrames = [
    'p1.png',
    'p2.png'
];
const flameFrames = [
    'plane1.png',
    'plane2.png'
];
const fireFrames = [
    'fire1.png',
    'fire2.png'
];
let gameTime = 180;
let lastTime = 180;
const keyArray = [];
let alreadyChecking = false;
let oceanLayer;
let player;
let playerObject;
let objectLayer;
let planeObject;
let keyLocations;
let fireLocations;
let plane;
let lives = 3;
let score = 0;
let keySound;
let hurtSound;
let introSound;
let bgMusic;
let lastScore = 0;
let scoreBoard;
let newGame = true;
let healthBar;
const scoreBoardLabel = new PIXI.Text(`x ${score}/7`, {
    font: '16px monospace',
    fill: 0xFFFFFF,
    align: 'left'
});
const timer = new PIXI.Text(`${gameTime}s remain`, {
    font: '12px monospace',
    fill: 0xFFFFFF,
    align: 'right'
});
const gameOverText = new PIXI.Text('', {
    font: '64px monospace',
    fill: 0xFFFFFF,
    align: 'center'
});
const creditReel = new PIXI.Text(credits, {
    font: '12px monospace',
    fill: 0xFFFFFF,
    align: 'center'
});

const worldClickHandler = (event) => {
    player.play();
    const point = event.data.getLocalPosition(world);
    const dx = player.position.x - point.x;
    const dy = player.position.y - point.y;
    const rot = Math.atan2(dx, dy);
    player.rotation = - rot;
    const distance = Math.sqrt(Math.pow(dx, 2) + Math.pow(dy, 2));
    createjs.Tween.get(player.position, { override: true }).to(
        point, (distance / 64) * 1000
    )
    .call(() => { player.stop(); });
};

const gameOver = (win) => {
    if (win) {
        gameOverText.text = 'You Won!';
    } else {
        gameOverText.text = 'You Lost!';
    }
    stage.removeChildren();
    bgMusic.stop();
    introSound.play();
    introSound.volume = 0;
    hurtSound.volume = 0;
    gameOverText.anchor.set(0.5, 0.5);
    gameOverText.position.set(320, 200);
    creditReel.anchor.set(0.5, 0);
    creditReel.position.set(320, 400);
    gameOverScreen.addChild(gameOverText);
    gameOverScreen.addChild(creditReel);
    stage.addChild(gameOverScreen);
    createjs.Tween.get(gameOverText).to({ alpha: 0 }, 1000)
    .call(() => {
        createjs.Tween.get(creditReel.position).to({
            y: 0 - creditReel.height
        }, 10000)
        .call(() => {
            const fin = new PIXI.Text('fin', {
                font: '12px monospace',
                fill: 0xFFFFFF,
                align: 'center'
            });
            fin.anchor.set(0.5, 0.5);
            fin.position.set(320, 200);
            fin.alpha = 0;
            stage.interactive = true;
            stage.click = () => { location.reload(); };
            gameOverScreen.addChild(fin);
            createjs.Tween.get(fin).to({ alpha: 1 }, 1000);
        });
    }); //eslint-disable-line
};

const squareCheck = (a, b) => {
    if (a.x >= b.x && a.x <= (b.x + 32) &&
            a.y >= b.y && a.y <= (b.y + 32)) {
        return true;
    }
    return false;
};

const checkBounds = () => {
    for (const key of keyArray) {
        if (squareCheck(player, key) && !key.found) {
            key.found = true;
            keySound.play();
            score += 1;
            key.visible = false;
        }
    }

    const collision = tu.hitTestTile(player, oceanLayer, 2, world, 'some');
    if (collision.hit) {
        hurtSound.play();
        gameOverlay.removeChildren();
        if (--lives > 0) {
            buildGame(); //eslint-disable-line
        } else {
            gameOver(false);
        }
    }

    if (score === 7) {
        gameOver(true);
    }
};

const updateCamera = () => {
    world.x = -player.x * GAME_SCALE + GAME_WIDTH / 2 - player.width / 2 * GAME_SCALE;
    world.y = -player.y * GAME_SCALE + GAME_HEIGHT / 2 + player.height / 2 * GAME_SCALE;
    world.x = -Math.max(0, Math.min(world.worldWidth * GAME_SCALE - GAME_WIDTH, -world.x));
    world.y = -Math.max(0, Math.min(world.worldHeight * GAME_SCALE - GAME_HEIGHT, -world.y));
};

const animate = () => {
    requestAnimationFrame(animate);
    updateCamera();
    if (gameTime !== lastTime) {
        timer.text = `${gameTime}s remain`;
        lastTime = gameTime;
    }
    if (score !== lastScore) {
        scoreBoardLabel.text = `x ${score}/7`;
        lastScore = score;
    }
    if (createjs.Tween.hasActiveTweens(player.position)) {
        if (!alreadyChecking) {
            alreadyChecking = true;
            checkBounds();
            alreadyChecking = false;
        }
    }

    if (gameTime <= 0) {
        gameOver(false);
    }
    renderer.render(stage);
};

const live = () => {
    world.interactive = true;
    world.click = worldClickHandler;
};

const buildGame = () => {
    if (newGame) {
        titleOverlay = new PIXI.Sprite(PIXI.Texture.fromFrame('title.png'));
        titleOverlay.anchor.set(0.5, 0.5);
        titleOverlay.position.set(320, 200);
        gameOverlay.addChild(titleOverlay);
        keySound = PIXI.audioManager.getAudio('keySound');
        keySound.volume = 0.15;
        hurtSound = PIXI.audioManager.getAudio('hurtSound');
        hurtSound.volume = 0.15;
        introSound = PIXI.audioManager.getAudio('intro');
        introSound.volume = 0.25;
        bgMusic = PIXI.audioManager.getAudio('bg');
        bgMusic.volume = 0.15;
        bgMusic.loop = true;
    }
    healthBar = new PIXI.extras.TilingSprite(PIXI.Texture.fromFrame('heart.png'));
    scoreBoard = new PIXI.Sprite(PIXI.Texture.fromFrame('key.png'));
    scoreBoardLabel.position.set(42, 16);
    healthBar.width = lives * 32;
    healthBar.height = 32;
    healthBar.anchor.x = 1;
    healthBar.position.set(630, 10);
    scoreBoard.background = 0x000;
    scoreBoard.anchor.set(0, 0);
    scoreBoard.position.set(10, 10);
    timer.anchor.set(1, 1);
    timer.position.set(630, 390);
    gameOverlay.addChild(scoreBoardLabel);
    gameOverlay.addChild(healthBar);
    gameOverlay.addChild(scoreBoard);
    gameOverlay.addChild(timer);

    world = tu.makeTiledWorld('map_json', './assets/img/texturesheet.png');
    objectLayer = world.getObject('objects');
    if (newGame) {
        introSound.play();
        createjs.Tween.get(titleOverlay).to({
            alpha: 0
        }, 2000)
        .call(() => {
            live();
            bgMusic.play();
            gameOverlay.removeChild(titleOverlay);
            setInterval(() => { gameTime -= 1; }, 1000);
        });
    } else {
        live();
    }
    stage.addChild(world);
    stage.addChild(gameOverlay);
    playerObject = world.getObject('player');
    planeObject = world.getObject('plane');
    keyLocations = world.getObjects('keyLoc');
    fireLocations = world.getObjects('fireSpot');
    oceanLayer = world.getObject('background').data;

    player = new PIXI.extras.MovieClip.fromFrames(playerWalkingFrames); //eslint-disable-line
    player.animationSpeed = 0.1;
    player.collisionArea = {
        x: 6,
        y: 7,
        width: 20,
        height: 20
    };
    player.anchor.set(0.5, 0.5);
    player.x = playerObject.x;
    player.y = playerObject.y;

    for (const fire of fireLocations) {
        const fireSprite = new PIXI.extras.MovieClip.fromFrames(fireFrames); //eslint-disable-line
        fireSprite.x = fire.x;
        fireSprite.y = fire.y;
        fireSprite.animationSpeed = Math.random() * 0.15;
        fireSprite.play();
        objectLayer.addChild(fireSprite);
    }

    if (newGame) {
        for (let i = 0; i < keyLocations.length; i++) {
            const key = new PIXI.Sprite.fromFrame('key.png'); //eslint-disable-line
            key.x = keyLocations[i].x;
            key.y = keyLocations[i].y;
            key.found = false;
            keyArray.push(key);
            objectLayer.addChild(key);
        }
    } else {
        for (let i = 0; i < keyArray.length; i++) {
            if (!keyArray[i].found) {
                objectLayer.addChild(keyArray[i]);
            }
        }
    }

    plane = new PIXI.extras.MovieClip.fromFrames(flameFrames); //eslint-disable-line
    plane.x = planeObject.x;
    plane.y = planeObject.y;
    plane.animationSpeed = 0.15;
    plane.play();
    objectLayer.addChild(player);
    objectLayer.addChild(plane);

    newGame = false;
    animate();
};

const load = () => { //eslint-disable-line
    const loader = PIXI.loader;
    loader.add('map_json', './assets/img/map.json')
          .add('texture_sheet', './assets/img/texturesheet.png')
          .add('sprites', './assets/img/sprites.json')
          .add('keySound', './assets/mp3/key.mp3')
          .add('hurtSound', './assets/mp3/hurt.mp3')
          .add('intro', './assets/mp3/FOUND.mp3')
          .add('bg', './assets/mp3/bgMusic.mp3')
          .load(buildGame);
};
