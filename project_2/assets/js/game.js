/* global PIXI createjs */

// credits for use in the credit screen
const CREDITS = `
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
`;

const instructions = `
    In this game there is a bookshelf of books. In order to win you have to
    make it through all 7 levels by reading the books in the correct order.
    If you read the correct book you'll see a green checkmark, otherwise it's a red x.
    Good luck!
`;

// display setup
const gameport = document.getElementById('gameport');
const renderer = PIXI.autoDetectRenderer(640, 400, {
    backgroundColor: 0x000
});
gameport.appendChild(renderer.view);
const stage = new PIXI.Container();

// title screen declaration
const titleScreen = new PIXI.Container();
let titleScreenBackground;
const titleScreenTextSettings = {
    font: '20px monospace',
    fill: 0xcfb53b
};
const titleScreenPlayButton = new PIXI.Text('Play', titleScreenTextSettings);
const titleScreenCreditsButton = new PIXI.Text('Credits', titleScreenTextSettings);
const titleScreenSettingsButton = new PIXI.Text('Settings', titleScreenTextSettings);
const titleScreenInstructionsButton = new PIXI.Text('Instructions', titleScreenTextSettings);
let inGame = false;
let gamePaused = false;

// settings screen declaration
const settingsScreen = new PIXI.Container();
let settingsScreenBackground;
const settingsScreenTextSettings = {
    font: '16px monospace',
    fill: 0xFFFFFF
};
const settingsScreenExitButton = new PIXI.Text('Back to Menu', settingsScreenTextSettings);
const settingsMusicButton = new PIXI.Text('Toggle music', settingsScreenTextSettings);
const settingsHintButton = new PIXI.Text('Toggle in-game history hints',
    settingsScreenTextSettings
);

// game screen declaration
const gameScreen = new PIXI.Container();
let attempt = [];
const previousAttempt = new PIXI.Text(`Previous attempt: ${attempt.toString()}`,
    settingsScreenTextSettings
);
const currentAttempt = new PIXI.Text(`Current attempt: ${attempt.toString()}`,
    settingsScreenTextSettings
);
const pauseText = new PIXI.Text('esc: pause\na: toggle music\nh: toggle hints', {
    font: '12px monospace',
    fill: 0xFFFFFF,
    align: 'right'
});
const openingBookAnimationFrames = [
    'book-1.png',
    'book-2.png',
    'book-3.png',
    'book-4.png'
];
const closingBookAnimationFrames = [
    'book-4.png',
    'book-3.png',
    'book-2.png',
    'book-1.png'
];
let bgMusic;
let powerup;
let hit;
let good;
let winner;
let hints = false;
let slam;
let bad;
let bookShelf = [];
let solution = [];
let gameBackground;
let gameDoor;
let level = 1;
let opening = false;
let closing = false;
let openingIndex = -1;
let closingIndex = -1;
let openingFrame = 0;
let openingTime = 0;
let closingFrame = 0;
let closingTime = 0;

// credits screen declaration
const creditsScreen = new PIXI.Container();
const creditsScreenTextSettings = {
    font: '18px monospace',
    fill: 0xFFFFFF,
    align: 'center'
};
const creditsScreenCredits = new PIXI.Text(CREDITS, creditsScreenTextSettings);

// instructions screen declaration
const instructionScreen = new PIXI.Container();
const instructionScreenExitButton = new PIXI.Text('Back to Menu', settingsScreenTextSettings);
const tutorialText = new PIXI.Text(instructions, {
    font: '12px monospace',
    fill: 0xFFFFFF,
    align: 'center'
});
let instructionsOverlay;
let badTutorial;
let goodTutorial;

// end screen declaration
const endScreen = new PIXI.Container();
const endText = new PIXI.Text('You Won!', {
    font: '24px monospace',
    fill: 0xFFFFFF,
    align: 'center'
});
const closeBook = (index) => {
    closing = true;
    closingIndex = index;
    createjs.Tween.get(bookShelf[index].scale).to({
        x: 1,
        y: 1
    }, 1000);
    createjs.Tween.get(bookShelf[index].position)
    .to({
        x: 65 * index,
        y: 240
    }, 1000)
    .call(() => {
        closing = false;
        closingIndex = -1;
        closingTime = 0;
        closingFrame = 0;
        checkWinner(); //eslint-disable-line
    });
};

const openBook = (index) => {
    opening = true;
    openingIndex = index;
    currentAttempt.text = `Current attempt: ${attempt.toString()}`;
    createjs.Tween.get(bookShelf[index].position).to({
        x: 320,
        y: 100
    }, 1000);
    createjs.Tween.get(bookShelf[index].scale).to({
        x: 3,
        y: 3
    }, 1000)
    .call(() => {
        if (solution[attempt.length - 1] === index) {
            powerup.play();
            bookShelf[index].addChild(good);
        } else {
            bookShelf[index].addChild(bad);
            hit.play();
        }
    })
    .wait(500)
    .call(() => {
        if (solution[attempt.length - 1] === index) {
            bookShelf[index].removeChild(good);
        } else {
            bookShelf[index].removeChild(bad);
        }
        opening = false;
        openingIndex = -1;
        openingFrame = 0;
        openingTime = 0;
        closeBook(index);
    });
};

const handleBoardClick = (node) => {
    if (node.opened === false && openingIndex === -1 && closingIndex === -1) {
        if (attempt.includes(bookShelf.indexOf(node)) === false) {
            bookShelf[bookShelf.indexOf(node)].opened = true;
            attempt.push(bookShelf.indexOf(node));
            openBook(bookShelf.indexOf(node));
        }
    }
    return 1;
};

const toggleMusic = () => {
    if (bgMusic.playing === true) {
        bgMusic.stop();
    } else {
        bgMusic.play();
    }
};

const toggleHints = () => {
    if (hints) {
        hints = false;
        hit.play();
    } else {
        hints = true;
        powerup.play();
    }
};

const randomSort = (a, b) => (parseInt(Math.random() * 10) % 2); //eslint-disable-line

const buildGameBoard = () => {
    for (let i = 0; i < level; i++) {
        solution.push(i);
    }
    solution.sort(randomSort);
    pauseText.anchor.set(1, 0);
    pauseText.position.set(630, 10);
    previousAttempt.anchor.set(0, 0);
    previousAttempt.position.set(10, 10);
    currentAttempt.anchor.set(0, 0);
    currentAttempt.position.set(10, 30);
    gameScreen.addChild(currentAttempt);
    gameScreen.addChild(pauseText);
    if (hints) {
        gameScreen.addChild(previousAttempt);
    }
    for (let i = 0; i < level; i++) {
        const sprite = new PIXI.Sprite(PIXI.Texture.fromFrame('book.png'));
        sprite.opened = false;
        sprite.closed = false;
        sprite.position.set(sprite.width * i, 240);
        sprite.interactive = true;
        sprite.on('click', () => handleBoardClick(sprite));
        bookShelf.push(sprite);
        gameScreen.addChildAt(sprite, 2);
    }
};

const gameOver = () => {
    winner.play();
    inGame = false;
    createjs.Tween.get(gameScreen.position).to({
        x: -268,
        y: -88
    }, 2000)
    .call(() => {
        createjs.Tween.get(gameDoor.position).to({
            x: gameDoor.x - 150,
            y: gameDoor.y
        }, 2000)
        .call(() => {
            createjs.Tween.get(gameScreen.position).to({
                x: gameScreen.x * 20,
                y: gameScreen.y * 25
            }, 2000);
            createjs.Tween.get(gameScreen.scale).to({
                x: 10,
                y: 10
            }, 2000)
            .call(() => {
                stage.removeChild(gameScreen);
                stage.addChild(endScreen);
            })
            .wait(3000)
            .call(() => {
                stage.addChild(titleScreen);
                createjs.Tween.get(titleScreen.position).to({
                    x: 0,
                    y: 0
                }, 1000, createjs.Ease.bounceOut)
                .call(() => slam.play())
                .call(() => {
                    bookShelf = [];
                    solution = [];
                    level = 1;
                    opening = false;
                    closing = false;
                    openingIndex = -1;
                    closingIndex = -1;
                    openingFrame = 0;
                    openingTime = 0;
                    closingFrame = 0;
                    closingTime = 0;
                    gameDoor.anchor.set(0.5, 0.5);
                    gameDoor.position.set(575, 285);
                    gameScreen.scale.set(1, 1);
                    gameScreen.position.set(0, 0);
                    stage.removeChild(endScreen);
                });
            });
        });
    });
};

const checkWinner = () => {
    for (let i = 0; i < attempt.length; i++) {
        if (attempt[i] !== solution[i]) {
            previousAttempt.text = `Previous attempt: ${attempt.toString()}`;
            currentAttempt.text = 'Current attempt:';
            attempt = [];
            for (let j = 0; j < bookShelf.length; j++) {
                bookShelf[j].opened = false;
            }
            return false;
        }
    }
    if (attempt.length !== solution.length) {
        return false;
    }
    currentAttempt.text = 'Current attempt:';
    previousAttempt.text = 'Previous attempt:';
    for (let i = 0; i < bookShelf.length; i++) {
        gameScreen.removeChild(bookShelf[i]);
    }
    attempt = [];
    solution = [];
    bookShelf = [];
    level++;
    if (level < 8) {
        buildGameBoard();
    } else {
        gameOver();
    }
    return true;
};

const titleScreenMenuHandler = (e) => {
    switch (e.target._text) {
    case 'Play': {
        if (!inGame) {
            inGame = true;
            buildGameBoard();
            stage.addChildAt(gameScreen, 0);
        }
        createjs.Tween.get(titleScreen.position).to({
            x: 0,
            y: 400
        }, 1000, createjs.Ease.bounceOut)
        .call(() => slam.play())
        .call(() => stage.removeChild(titleScreen));
        break;
    }
    case 'Settings': {
        settingsScreen.position.set(0, 0);
        stage.addChildAt(settingsScreen, inGame ? 1 : 0);
        createjs.Tween.get(titleScreen.position).to({
            x: 0,
            y: -400
        }, 1000, createjs.Ease.bounceOut)
        .call(() => slam.play());
        break;
    }
    case 'Credits': {
        creditsScreenCredits.position.set(320, 400 + creditsScreenCredits.height);
        creditsScreen.position.set(0, 0);
        stage.addChildAt(creditsScreen, inGame ? 1 : 0);
        createjs.Tween.get(titleScreen.position).to({
            x: 640,
            y: 0
        }, 1000, createjs.Ease.bounceOut)
        .call(() => slam.play());
        createjs.Tween.get(creditsScreenCredits.position).to({
            x: 320,
            y: 0
        }, 10000)
        .call(() => {
            createjs.Tween.get(titleScreen.position).to({
                x: 0,
                y: 0
            }, 1000, createjs.Ease.bounceOut)
            .call(() => slam.play())
            .call(() => stage.removeChild(creditsScreen));
        });
        break;
    }
    case 'Instructions': {
        stage.addChildAt(instructionScreen, inGame ? 1 : 0);
        createjs.Tween.get(titleScreen.position).to({
            x: -640,
            y: 0
        }, 1000, createjs.Ease.bounceOut)
        .call(() => slam.play());
        break;
    }
    default: break;
    }
};

const instructionScreenMenuHandler = (e) => {
    switch (e.target._text) {
    case 'Back to Menu': {
        createjs.Tween.get(titleScreen.position).to({
            x: 0,
            y: 0
        }, 1000, createjs.Ease.bounceOut)
        .call(() => slam.play())
        .call(() => stage.removeChild(instructionScreen));
        break;
    }
    default: break;
    }
};

const settingsScreenMenuHandler = (e) => {
    switch (e.target._text) {
    case 'Back to Menu': {
        createjs.Tween.get(titleScreen.position).to({
            x: 0,
            y: 0
        }, 1000, createjs.Ease.bounceOut)
        .call(() => slam.play())
        .call(() => stage.removeChild(settingsScreen));
        break;
    }
    default: break;
    }
};


const animate = () => {
    requestAnimationFrame(animate);
    if (opening === true && openingIndex !== -1 && openingTime++ % 15 === 0 && openingFrame <= 3) {
        bookShelf[openingIndex].texture = PIXI.Texture.fromFrame(
            openingBookAnimationFrames[openingFrame++]
        );
    }
    if (closing === true && closingIndex !== -1 && closingTime++ % 15 === 0 && closingFrame <= 3) {
        bookShelf[closingIndex].texture = PIXI.Texture.fromFrame(
            closingBookAnimationFrames[closingFrame++]
        );
    }
    if (hints && !gameScreen.children.includes(previousAttempt)) {
        gameScreen.addChild(previousAttempt);
    } else if (!hints && gameScreen.children.includes(previousAttempt)) {
        gameScreen.removeChild(previousAttempt);
    }
    renderer.render(stage);
};

const setup = () => {
    titleScreenBackground = new PIXI.Sprite(PIXI.loader.resources.titleScreen.texture);
    titleScreenPlayButton.position.set(10, 10);
    titleScreenInstructionsButton.position.set(10, 45);
    titleScreenSettingsButton.position.set(10, 80);
    titleScreenCreditsButton.position.set(10, 115);
    titleScreenPlayButton.interactive = true;
    titleScreenSettingsButton.interactive = true;
    titleScreenCreditsButton.interactive = true;
    titleScreenInstructionsButton.interactive = true;
    titleScreenBackground.addChild(titleScreenPlayButton);
    titleScreenBackground.addChild(titleScreenInstructionsButton);
    titleScreenBackground.addChild(titleScreenSettingsButton);
    titleScreenBackground.addChild(titleScreenCreditsButton);
    titleScreenPlayButton.on('click', titleScreenMenuHandler);
    titleScreenInstructionsButton.on('click', titleScreenMenuHandler);
    titleScreenSettingsButton.on('click', titleScreenMenuHandler);
    titleScreenCreditsButton.on('click', titleScreenMenuHandler);
    titleScreen.addChild(titleScreenBackground);
    stage.addChild(titleScreen);

    settingsScreenBackground = new PIXI.Sprite(PIXI.loader.resources.settingsScreen.texture);
    settingsMusicButton.anchor.set(0.5, 0.5);
    settingsScreenExitButton.anchor.set(1, 0);
    settingsHintButton.anchor.set(0.5, 0.5);
    settingsScreenExitButton.position.set(630, 10);
    settingsHintButton.position.set(320, 250);
    settingsMusicButton.position.set(320, 200);
    settingsScreenExitButton.interactive = true;
    settingsMusicButton.interactive = true;
    settingsHintButton.interactive = true;
    settingsScreenExitButton.on('click', settingsScreenMenuHandler);
    settingsMusicButton.on('click', toggleMusic);
    settingsHintButton.on('click', toggleHints);
    settingsScreenBackground.addChild(settingsScreenExitButton);
    settingsScreenBackground.addChild(settingsMusicButton);
    settingsScreenBackground.addChild(settingsHintButton);
    settingsScreen.addChild(settingsScreenBackground);

    creditsScreenCredits.anchor.set(0.5, 1);
    creditsScreen.addChild(creditsScreenCredits);

    instructionsOverlay = new PIXI.Sprite(PIXI.loader.resources.instructionsOverlay.texture);
    goodTutorial = new PIXI.Sprite(PIXI.loader.resources.goodTutorial.texture);
    badTutorial = new PIXI.Sprite(PIXI.loader.resources.badTutorial.texture);
    instructionScreenExitButton.anchor.set(0, 0);
    instructionScreenExitButton.position.set(10, 10);
    instructionScreenExitButton.interactive = true;
    goodTutorial.anchor.set(1, 0.5);
    badTutorial.anchor.set(0, 0.5);
    goodTutorial.position.set(320, 200);
    badTutorial.position.set(320, 200);
    tutorialText.anchor.set(0.5, 1);
    tutorialText.position.set(320, 400);
    instructionsOverlay.addChild(goodTutorial);
    instructionsOverlay.addChild(badTutorial);
    instructionsOverlay.addChild(tutorialText);
    instructionScreenExitButton.on('click', instructionScreenMenuHandler);
    instructionsOverlay.addChild(instructionScreenExitButton);
    instructionScreen.addChild(instructionsOverlay);

    gameBackground = new PIXI.Sprite(PIXI.loader.resources.gameBackground.texture);
    gameDoor = new PIXI.Sprite(PIXI.Texture.fromFrame('door.png'));
    gameDoor.anchor.set(0.5, 0.5);
    gameDoor.position.set(575, 285);
    gameScreen.addChild(gameDoor);
    gameScreen.addChild(gameBackground);
    good = new PIXI.Sprite(PIXI.Texture.fromFrame('good.png'));
    bad = new PIXI.Sprite(PIXI.Texture.fromFrame('bad.png'));

    endText.anchor.set(0.5, 0.5);
    endText.position.set(320, 200);
    endScreen.addChild(endText);

    bgMusic = PIXI.audioManager.getAudio('bgSong');
    bgMusic.loop = true;
    bgMusic.play();

    powerup = PIXI.audioManager.getAudio('powerup');
    hit = PIXI.audioManager.getAudio('hit');
    slam = PIXI.audioManager.getAudio('slam');
    winner = PIXI.audioManager.getAudio('winner');

    animate();
};

const load = () => { //eslint-disable-line
    const loader = PIXI.loader;
    loader.add('titleScreen', './assets/img/titleScreen.png')
          .add('settingsScreen', './assets/img/settingsScreen.png')
          .add('instructionsOverlay', './assets/img/instructionsOverlay.png')
          .add('gameBackground', './assets/img/room.png')
          .add('sprites', './assets/img/sprites.json')
          .add('bgSong', './assets/mp3/bg.mp3')
          .add('powerup', './assets/mp3/powerup.mp3')
          .add('hit', './assets/mp3/hit.mp3')
          .add('slam', './assets/mp3/slam.mp3')
          .add('winner', './assets/mp3/winner.mp3')
          .add('goodTutorial', './assets/img/good-tut.png')
          .add('badTutorial', './assets/img/bad-tut.png')
          .load(setup);
};

addEventListener('keyup', (e) => {
    switch (e.keyCode) {
    case 27: {
        if (inGame && !gamePaused) {
            stage.addChild(titleScreen);
            createjs.Tween.get(titleScreen.position).to({
                x: 0,
                y: 0
            }, 1000)
            .call(() => { gamePaused = true; });
        } else if (inGame && gamePaused) {
            createjs.Tween.get(titleScreen.position).to({
                x: 0,
                y: 400
            }, 1000)
            .call(() => stage.removeChild(titleScreen))
            .call(() => { gamePaused = false; });
        }
        break;
    }
    case 65: {
        toggleMusic();
        break;
    }
    case 72: {
        toggleHints();
        break;
    }
    default: break;
    }
});
