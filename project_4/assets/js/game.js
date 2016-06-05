/* global PIXI TileUtilities createjs */

// create the credit reel content
const CREDITREEL = `
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

// set up the gameport settings, canvas, TileUtilities,
// and append the view to the document div with the id gameport
const tu = new TileUtilities(PIXI);
const GAME_SCALE = 1;
const GAME_WIDTH = 640;
const GAME_HEIGHT = 400;
const gameport = document.getElementById('gameport');
const renderer = PIXI.autoDetectRenderer(GAME_WIDTH, GAME_HEIGHT, {
    backgroundColor: 0x000
});
gameport.appendChild(renderer.view);

// gameplay setting
createjs.Ticker.framerate = 60;

// initialize all the necessary containers to be used
const stage = new PIXI.Container();
const titleScreen = new PIXI.Container();
const gameScreen = new PIXI.Container();
const creditScreen = new PIXI.Container();
const mask = new PIXI.Graphics();

// globally declare the variables that will be used throughout the game
// First the configurable constants
const DEFAULTDARKNESS = 0.3;
const moleArray = [];
const PLAYERVISIBILITY = 50;
const torchArray = [];
const titleText = new PIXI.Text('darkness', {
    font: '16px monospace',
    fill: 0xFFFFFF
});
const questionText = new PIXI.Text('where am i?', {
    font: '12px monospace',
    align: 'left',
    fill: 0xFFFFFF
});
const creditRoll = new PIXI.Text(CREDITREEL, {
    font: '12px monospace',
    fill: 0xFFFFFF,
    align: 'center'
});
const endText = new PIXI.Text('fin', {
    font: '14px monospace',
    fill: 0xFFFFFF,
    align: 'center'
});

// then the mutable/pending instantiation properites
let atTitle;
let backgroundMusic;
let count = 0;
let darknessFilter;
let dazed = false;
let firstPortal = true;
let firstTorch = true;
let firstTorchBurning = false;
let frameCount = 0;
let gameOverSound;
let groundArray;
let hitNoise;
let inGame = false;
let lives = 3;
let player;
let playerx;
let playery;
let portalA;
let portalB;
let portalC;
let portalD;
let portalE;
let portalF;
let portalG;
let portalH;
let portalI;
let portalFin;
let portalNoise;
let stepNoise;
let torches = 0;
let torchesLast = 0;
let torchSound;
let world;
let win;

// declare sprite frame lists
const moleFrames = [
    'mole1.png',
    'mole2.png'
];
const playerBackFrames = [
    'player4.png',
    'player5.png'
];
const playerFrontFrames = [
    'player.png',
    'player3.png'
];
const playerWalkingFrames = [
    'player1.png',
    'player2.png'
];
const titleTextFrames = [
    'darkness',
    '.darkness',
    '..darkness',
    '...darkness'
];
const torchFlames = [
    'torch1.png',
    'torch2.png',
    'torch3.png'
];

const gameOver = () => {
    removeEventListener('keydown', playerKeyHandler); //eslint-disable-line
    createjs.Tween.get(mask.scale)
    .call(() => {
        darknessFilter.brightness(20);
    })
    .to({
        x: 100,
        y: 100
    }, 2000)
    .call(() => {
        gameOverSound.play();
        createjs.Tween.get(backgroundMusic).to({ volume: 0 }, 3000);
        createjs.Tween.get(gameScreen).to({ alpha: 0 }, 3000)
        .call(() => {
            stage.removeChild(gameScreen);
            stage.x = 0;
            stage.y = 0;
            stage.addChild(creditScreen);
            createjs.Tween.get(creditRoll.position).to({
                y: -creditRoll.height
            }, 10000)
            .call(() => {
                createjs.Tween.get(endText).to({ alpha: 1 }, 3000)
                .call(() => {
                    endText.interactive = true;
                    endText.click = () => location.reload();
                });
            });
        });
    });
};

const youLose = () => {
    inGame = false;
    removeEventListener('keydown', playerKeyHandler); //eslint-disable-line
    createjs.Tween.get(mask.scale)
    .call(() => {
        questionText.scale.x = player.scale.x === 1 ? 1 : -1;
        questionText.text = 'i think i just lost...';
        questionText.alpha = 1;
    })
    .wait(2000)
    .call(() => {
        darknessFilter.brightness(0.1);
    })
    .to({
        x: 0,
        y: 0
    }, 2000)
    .call(() => darknessFilter.brightness(0))
    .call(() => {
        createjs.Tween.get(gameScreen).to({ alpha: 0 }, 3000)
        .call(() => {
            stage.removeChild(gameScreen);
            stage.x = 0;
            stage.y = 0;
            stage.addChild(creditScreen);
            createjs.Tween.get(creditRoll.position).to({
                y: -creditRoll.height
            }, 10000)
            .call(() => {
                createjs.Tween.get(endText).to({ alpha: 1 }, 3000)
                .call(() => {
                    endText.interactive = true;
                    endText.click = () => location.reload();
                });
            });
        });
    });
};

// follow the player around the game
const updateCamera = () => {
    stage.x = -player.x * GAME_SCALE + GAME_WIDTH / 2 - player.width / 2 * GAME_SCALE;
    stage.y = -player.y * GAME_SCALE + GAME_HEIGHT / 2 + player.height / 2 * GAME_SCALE;
    stage.x = -Math.max(0, Math.min(world.worldWidth * GAME_SCALE - GAME_WIDTH, -stage.x));
    stage.y = -Math.max(0, Math.min(world.worldHeight * GAME_SCALE - GAME_HEIGHT, -stage.y));
};

// check if you're in the box of the other thing, meaning you hit it
const squareCheck = (a, b) => {
    if (a.x >= b.x && a.x <= (b.x + 32) &&
            a.y >= b.y && a.y <= (b.y + 32)) {
        return true;
    }
    return false;
};

const portalCheck = (source, destination) => {
    if (squareCheck(player, source)) {
        if (source === win) { gameOver(); return; }
        createjs.Tween.removeTweens(mask.position);
        createjs.Tween.removeTweens(player.position);
        portalNoise.play();
        player.x = destination.x + 16;
        player.y = destination.y + 16;
        mask.position.x = player.position.x;
        mask.position.y = player.position.y;
        player.gx = (player.x - 16) / 32;
        player.gy = (player.y - 16) / 32;
        updateCamera();
        if (firstPortal) {
            questionText.text = 'woah...\ndid that thing just teleport me?';
            questionText.alpha = 1;
            createjs.Tween.get(questionText).to({ alpha: 0 }, 3000)
            .call(() => {
                questionText.text = 'it must be to disorient me\n' +
                    'make me lose track\n' +
                    'of my map location';
                questionText.alpha = 1;
                createjs.Tween.get(questionText).to({ alpha: 0 }, 10000);
            });
            firstPortal = false;
        }
    }
};


const checkMoles = () => {
    if (moleArray.length === 0) { return; }
    for (const mole of moleArray) {
        if (squareCheck(player, mole) && dazed === false) {
            if (lives-- === 0) { youLose(); return; }
            dazed = true;
            hitNoise.play();
            removeEventListener('keydown', playerKeyHandler); //eslint-disable-line
            createjs.Tween.get(player).to({ alpha: 0.5 }, 500)
            .call(() => { //eslint-disable-line
                createjs.Tween.get(player).to({ alpha: 1 }, 500)
                .call(() => {
                    createjs.Tween.get(player).to({ alpha: 0.5 }, 500)
                    .call(() => {
                        createjs.Tween.get(player).to({ alpha: 1 }, 500)
                        .call(() => {
                            addEventListener('keydown', playerKeyHandler); //eslint-disable-line
                        })
                        .wait(1000)
                        .call(() => (dazed = false));
                    });
                });
            });
        }
    }
};

// bounds checking function
const checkHits = () => {
    // check hits against all torches
    for (const torch of torchArray) {
        // make sure it hasn't been found already since the position stays
        if (squareCheck(player, torch) && !torch.found) {
            torch.found = true;
            torchSound.play();
            torches += 1;
            torch.visible = false;
            // give the hint if it's the first torch
            if (firstTorch) {
                questionText.text = 'what is this?';
                questionText.alpha = 1;
                createjs.Tween.get(questionText).to({ alpha: 0 }, 3000)
                .call(() => {
                    questionText.text = 'i can see a little better...';
                    questionText.alpha = 1;
                    createjs.Tween.get(questionText).to({ alpha: 0 }, 3000);
                });
                firstTorchBurning = true;
            }
            firstTorch = false;
        }
    }

    portalCheck(portalA, portalB);
    portalCheck(portalC, portalD);
    portalCheck(portalE, portalF);
    portalCheck(portalG, portalH);
    portalCheck(portalI, portalFin);
    portalCheck(win, undefined);
};

// burn the torch unless you're at 0
// catch and save any race conditions that set you below 0
const burnTorch = () => {
    if (torches === 0) { return; }
    if (torches < 0) { torches = 0; }
    // give a hint if it's their first torch.
    if (firstTorchBurning) {
        questionText.text = 'woah, i guess\nthey don\'t burn forever...';
        questionText.alpha = 1;
        createjs.Tween.get(questionText).to({ alpha: 0 }, 2000)
        .call(() => {
            questionText.text = 'better find another one...';
            questionText.alpha = 1;
            createjs.Tween.get(questionText).to({ alpha: 0 }, 2000);
        });
        firstTorchBurning = false;
    }
    torches -= 1;
};

const adjustLight = (newTorch) => {
    // grow or shrink your spotlight based on the torch change
    createjs.Tween.get(mask.scale, { override: true })
    .call(() => (
        DEFAULTDARKNESS + (0.1 * torches) < 0.65 ?
            darknessFilter.brightness(DEFAULTDARKNESS + (0.1 * torches)) :
            null
    ))
    .to({
        x: 1 + (torches * 0.33),
        y: 1 + (torches * 0.33)
    }, 1000);

    // only set the burn if it's a new torch, and not losing a torch
    if (newTorch) {
        setTimeout(burnTorch, 30000);
    }
};

const enemyMovement = () => {
    for (const mole of moleArray) {
        if (createjs.Tween.hasActiveTweens(mole.position)) { continue; }
        let dx = Math.floor(Math.random() * 2);
        let dy = 0;
        if (dx === 0) {
            dy = Math.floor(Math.random() * 2);
        }
        dx *= Math.floor(Math.random() * 2) === 1 ? 1 : -1;
        dy *= Math.floor(Math.random() * 2) === 1 ? 1 : -1;
        if (groundArray[(mole.gy + dy) * 100 + (mole.gx + dx)] !== 2) { continue; }
        createjs.Tween.get(mole.position)
        .call(() => {
            mole.scale.x = dx < 0 ? 1 : -1;
        })
        .wait(500)
        .to({
            x: mole.x + (dx * 32),
            y: mole.y + (dy * 32)
        }, 1000)
        .call(() => {
            mole.gx = (mole.x - 16) / 32;
            mole.gy = (mole.y - 16) / 32;
        });
    }
};

const animate = () => {
    // request the next frame
    requestAnimationFrame(animate);

    // update the camera
    if (player.x !== playerx || player.y !== playery) {
        updateCamera();
        playerx = player.x;
        playery = player.y;
    }

    if (inGame) {
        enemyMovement();
        checkMoles();
    }

    // if we are moving check if we are hitting anything
    if (createjs.Tween.hasActiveTweens(player.position)) {
        if (stepNoise !== undefined) { stepNoise.play(); }
        checkHits();
    } else {
        if (stepNoise !== undefined) { stepNoise.stop(); }
    }

    if (torches !== torchesLast) {
        adjustLight(torchesLast < torches);
        torchesLast = torches;
    }

    // if at the title screen increment the frames of the title ellipsis
    if (atTitle) {
        if (frameCount++ % 30 === 0) {
            titleText.text = titleTextFrames[count++ % 4];
        }
    }

    // render the current stage position of all elements
    renderer.render(stage);
};

const launchGame = () => {
    stage.addChildAt(gameScreen, 0);
    questionText.position.set(100, 16);
    player.addChild(questionText);
    createjs.Tween.get(titleScreen).to({ alpha: 0 }, 2000)
    .call(() => {
        createjs.Tween.get(questionText).to({ alpha: 0 }, 2000)
        .call(() => addEventListener('keydown', playerKeyHandler)); //eslint-disable-line
        backgroundMusic.play();
        inGame = true;
    });
};


const build = () => {
    // create the world object
    world = tu.makeTiledWorld('map_json', './assets/img/tileset.png');

    // get the floor data for bounds checking
    groundArray = world.getObject('ground').data;

    // build the credits now, so they can just roll later!
    creditRoll.anchor.set(0.5, 0);
    creditRoll.position.set(320, 400);
    endText.anchor.set(0.5, 0.5);
    endText.position.set(320, 200);
    endText.alpha = 0;
    creditScreen.addChild(endText);
    creditScreen.addChild(creditRoll);

    // create the player and set the properties
    player = new PIXI.extras.MovieClip.fromFrames(playerWalkingFrames); //eslint-disable-line
    player.animationSpeed = 0.1;
    player.anchor.set(0.5, 0.5);
    player.position.set((32 * 2) + 16, (32 * 2) + 16);
    player.gx = 2;
    player.gy = 2;

    // place all the torces and store them for hit checking later on
    for (const torch of world.getObjects('torch')) {
        const torchSprite = new PIXI.extras.MovieClip.fromFrames(torchFlames); //eslint-disable-line
        torchSprite.animationSpeed = 0.1;
        torchSprite.x = torch.x - 32; // for some reasons tiles weren't matching up with Tiled
        torchSprite.y = torch.y;
        torchSprite.play();
        world.getObject('objects').addChild(torchSprite);
        torchArray.push(torchSprite);
    }

    // place all the moles and store them for hit checking later on
    for (const mole of world.getObjects('mole')) {
        const moleSprite = new PIXI.extras.MovieClip.fromFrames(moleFrames); //eslint-disable-line
        moleSprite.animationSpeed = 0.1;
        moleSprite.anchor.set(0.5, 0.5);
        moleSprite.x = mole.x + 16;
        moleSprite.y = mole.y + 16;
        moleSprite.gx = (moleSprite.x - 16) / 32;
        moleSprite.gy = (moleSprite.y - 16) / 32;
        moleSprite.play();
        world.getObject('objects').addChild(moleSprite);
        moleArray.push(moleSprite);
    }

    // build and place all the map objects, then add them to the object layer
    portalA = new PIXI.Sprite(PIXI.Texture.fromFrame('portal.png'));
    portalB = new PIXI.Sprite(PIXI.Texture.fromFrame('portal.png'));
    portalC = new PIXI.Sprite(PIXI.Texture.fromFrame('portal.png'));
    portalD = new PIXI.Sprite(PIXI.Texture.fromFrame('portal.png'));
    portalE = new PIXI.Sprite(PIXI.Texture.fromFrame('portal.png'));
    portalF = new PIXI.Sprite(PIXI.Texture.fromFrame('portal.png'));
    portalG = new PIXI.Sprite(PIXI.Texture.fromFrame('portal.png'));
    portalH = new PIXI.Sprite(PIXI.Texture.fromFrame('portal.png'));
    portalI = new PIXI.Sprite(PIXI.Texture.fromFrame('portal.png'));
    portalFin = new PIXI.Sprite(PIXI.Texture.fromFrame('portal.png'));
    win = new PIXI.Sprite(PIXI.Texture.fromFrame('door.png'));
    portalA.position.x = world.getObject('portalA').x;
    portalA.position.y = world.getObject('portalA').y;
    portalB.position.x = world.getObject('portalB').x;
    portalB.position.y = world.getObject('portalB').y;
    portalC.position.x = world.getObject('portalC').x;
    portalC.position.y = world.getObject('portalC').y;
    portalD.position.x = world.getObject('portalD').x;
    portalD.position.y = world.getObject('portalD').y;
    portalE.position.x = world.getObject('portalE').x;
    portalE.position.y = world.getObject('portalE').y;
    portalF.position.x = world.getObject('portalF').x;
    portalF.position.y = world.getObject('portalF').y;
    portalG.position.x = world.getObject('portalG').x;
    portalG.position.y = world.getObject('portalG').y;
    portalH.position.x = world.getObject('portalH').x;
    portalH.position.y = world.getObject('portalH').y;
    portalI.position.x = world.getObject('portalI').x;
    portalI.position.y = world.getObject('portalI').y;
    portalFin.position.x = world.getObject('portalFin').x;
    portalFin.position.y = world.getObject('portalFin').y;
    win.position.x = world.getObject('win').x;
    win.position.y = world.getObject('win').y;
    world.getObject('objects').addChild(portalA);
    world.getObject('objects').addChild(portalB);
    world.getObject('objects').addChild(portalC);
    world.getObject('objects').addChild(portalD);
    world.getObject('objects').addChild(portalE);
    world.getObject('objects').addChild(portalF);
    world.getObject('objects').addChild(portalG);
    world.getObject('objects').addChild(portalH);
    world.getObject('objects').addChild(portalI);
    world.getObject('objects').addChild(portalFin);
    world.getObject('objects').addChild(win);

    // create the torchlight mask
    mask.position.x = player.position.x;
    mask.position.y = player.position.y;
    mask.isMask = true;
    mask.fillAlpha = 0.25;
    mask.beginFill();
    mask.drawCircle(0, 0, PLAYERVISIBILITY);
    mask.endFill();
    world.mask = mask;

    // set up and apply darkness filters
    darknessFilter = new PIXI.filters.ColorMatrixFilter();
    darknessFilter.brightness(DEFAULTDARKNESS);
    world.filters = [darknessFilter];
    player.filters = [darknessFilter];

    // get songs stored properly
    portalNoise = PIXI.audioManager.getAudio('portalNoise');
    portalNoise.volume = 0.3;
    backgroundMusic = PIXI.audioManager.getAudio('backgroundMusic');
    backgroundMusic.volume = 0.3;
    backgroundMusic.loop = true;
    torchSound = PIXI.audioManager.getAudio('torchSound');
    torchSound.volume = 0.75;
    stepNoise = PIXI.audioManager.getAudio('stepNoise');
    stepNoise.volume = 0.5;
    hitNoise = PIXI.audioManager.getAudio('hitNoise');
    hitNoise.volume = 0.1;
    gameOverSound = PIXI.audioManager.getAudio('gameOverSound');

    // add the entities to the gameScreen for adding to the stage
    gameScreen.addChild(world);
    gameScreen.addChild(player);
    gameScreen.addChild(mask);

    // game should be good. start a timer, and fade to it!
    setTimeout(() => {
        atTitle = false;
        launchGame();
    }, 5000);

    // launch the animate loop
    animate();
};

const move = (dx, dy) => {
    // check that where they want to move is a moveable tile, otherwise return
    if (groundArray[(player.gy + dy) * 100 + (player.gx + dx)] !== 2) {
        return;
    }

    // only do this stuff if the player isn't already moving
    if (!createjs.Tween.hasActiveTweens(player.position)) {
        // handle the direction the player is facing based on the direction they want to move
        if (dy === 1) {
            player.textures = playerFrontFrames.map(frame => new PIXI.Texture.fromFrame(frame)); //eslint-disable-line
        } else if (dy === -1) {
            player.textures = playerBackFrames.map(frame => new PIXI.Texture.fromFrame(frame)); //eslint-disable-line
        } else {
            player.textures = playerWalkingFrames.map(frame => new PIXI.Texture.fromFrame(frame)); //eslint-disable-line
        }
        // start the tween
        createjs.Tween.get(player.position)
        .call(() => {
            // if they are moving left or right, aim the player the correct direction
            if (dx < 0) {
                player.scale.x = -1;
            } else {
                player.scale.x = 1;
            }
            player.play();
        })
        .to({
            x: player.x + (dx * 32),
            y: player.y + (dy * 32)
        }, 500)
        .call(() => {
            player.gx = (player.x - 16) / 32;
            player.gy = (player.y - 16) / 32;
            player.stop();
        });
        // also move the spotlight with the player
        createjs.Tween.get(mask.position)
        .to({
            x: player.x + (dx * 32),
            y: player.y + (dy * 32)
        }, 500);
    }
};

// keypress handler
const playerKeyHandler = (e) => {
    switch (e.keyCode) {
    case 87: // up or W
    case 38: {
        e.preventDefault();
        move(0, -1);
        break;
    }
    case 83: // down or s
    case 40: {
        e.preventDefault();
        move(0, 1);
        break;
    }
    case 65:
    case 37: { // left or a
        e.preventDefault();
        move(-1, 0);
        break;
    }
    case 68:
    case 39: { // right or a
        e.preventDefault();
        move(1, 0);
        break;
    }
    default: break;
    }
};

// this is called from the index's body onload, so disable eslint's no-unused-vars
const load = () => { //eslint-disable-line
    // set titleText anchor and position, add it to the titleScreen
    titleText.anchor.set(1, 1);
    titleText.position.set(GAME_WIDTH - 10, GAME_HEIGHT - 10);
    titleScreen.addChild(titleText);

    // add all necessary generated screens to the stage
    stage.addChild(titleScreen);

    // toggle the atTitle to be true for the title animation rendering
    atTitle = true;

    // get the PIXI loader and add the required files to load noting which
    // function to call by placing it in the `load()` method at the end
    const loader = PIXI.loader;
    loader.add('map_json', './assets/img/map.json')
          .add('tilesheet', './assets/img/tileset.png')
          .add('sprites', './assets/img/sprites.json')
          .add('portalNoise', './assets/mp3/portal.mp3')
          .add('backgroundMusic', './assets/mp3/background.mp3')
          .add('torchSound', './assets/mp3/torch.mp3')
          .add('stepNoise', './assets/mp3/steps.mp3')
          .add('hitNoise', './assets/mp3/hit.mp3')
          .add('gameOverSound', './assets/mp3/gameOver.mp3')
          .load(build);
};
