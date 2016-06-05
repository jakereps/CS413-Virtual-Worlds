/* global PIXI */
// set up the game canvas
const gameport = document.getElementById('gameport');
const renderer = PIXI.autoDetectRenderer(640, 400);
gameport.appendChild(renderer.view);

// declare the variables that need global scope
let bird;
let farBack;
let midBack;
let ground;
let index = 0;
let time = 0;
let score = 0;

// declare the constants that need global scope
const stage = new PIXI.Container();
const background = new PIXI.Container();
const foreground = new PIXI.Container();
const overlay = new PIXI.Container();

// add the three 'scenes' to the parent node
stage.addChild(background);
stage.addChild(foreground);
stage.addChild(overlay);

// initialize the scoreboard text
const scoreText = new PIXI.Text('Flight Time', {
    font: '18px Arial',
    fill: 0xFFFFFF,
    align: 'center'
});
scoreText.position.set(615, 0);
scoreText.anchor.x = 1;

// initialize the loading text
const status = new PIXI.Text('0% loaded', {
    font: '18px Arial',
    fill: 0xFFFFFF,
    align: 'center'
});
status.anchor.x = 0.5;
status.anchor.y = 0.5;
status.position.set(320, 300);
overlay.addChild(status);

// frame names for the bird animation spritesheet
const frames = [
    'bird-one.png',
    'bird-two.png',
    'bird-three.png'
];

// loading indicator funcitonality
const updateStatus = (l) => {
    status.text = `${l.progress}% loaded`;
};

// animate function called 60x/s
const animate = () => {
    // if you aren't laying on the ground keep going, and update the score every 60 frames
    // otherwise you lose, so move the score text to the center to let you know the final
    if (bird.position.y < 368) {
        requestAnimationFrame(animate);
        if (time % 60 === 0) {
            score += 1;
            scoreText.text = `Flight Time: ${score}s`;
        }
    } else {
        document.title = 'LOSER!';
        scoreText.anchor.x = 0.5;
        scoreText.anchor.y = 0.5;
        scoreText.position.set(320, 200);
        scoreText.text = `FINAL FLIGHT TIME\n${score} seconds`;
    }

    // every 1/4 second update the bird frame, unless you're falling down
    // then your wings shouldn't flap, because you're not flapping them...
    // increase your descent rate by 0.5 as well... gravity and such
    if (time % 15 === 0) {
        bird.texture = bird.vy < 2 ?
            PIXI.Texture.fromFrame(frames[index++ % 3]) :
            PIXI.Texture.fromFrame(frames[1]);
        bird.vy += 0.5;
    }

    // move your bird down the length of your velocity (increases in the above statement)
    bird.position.y += bird.vy;

    // every half second move the ocean one direction, flip it every time.
    if (time % 30 === 0) {
        midBack.tilePosition.x += 5 * midBack.vx;
        midBack.vx *= -1;
    }

    // increment your time and render the stage
    time += 1;
    renderer.render(stage);
};

// build the game using the loaded assets
const build = () => {
    // remove the loading status
    overlay.removeChild(status);

    // initialize your far background image
    farBack = new PIXI.Sprite(PIXI.loader.resources.far_back.texture);

    // initialize the mid background, ocean, and position it
    midBack = new PIXI.extras.TilingSprite(PIXI.loader.resources.mid_ground.texture, 3840, 100);
    midBack.tilePosition.set(0, 0);
    midBack.anchor.y = 1;
    midBack.position.y = 375;
    midBack.vx = 1;

    // initialize the ground and set it's position
    ground = new PIXI.extras.TilingSprite(PIXI.loader.resources.ground.texture, 3200, 50);
    ground.anchor.y = 1;
    ground.position.y = 400;
    ground.tilePosition.set(0, 0);

    // initialize your bird from the frames in the sheet and position it, as well as
    // initialize its velocity to be used in the movement
    bird = new PIXI.Sprite(PIXI.Texture.fromFrame(frames[index++]));
    bird.anchor.x = 0.5;
    bird.anchor.y = 0.5;
    bird.position.x = 150;
    bird.position.y = 200;
    bird.vy = 1;

    // add all of your containers to their correct parents
    background.addChild(farBack);
    background.addChild(midBack);
    overlay.addChild(scoreText);
    foreground.addChild(ground);
    foreground.addChild(bird);

    const getReady = new PIXI.Text('GET READY!', {
        font: '48px Arial',
        fill: 0xFFFFFF,
        align: 'center'
    });
    getReady.anchor.set(0.5, 0.5);
    getReady.position.set(320, 200);
    overlay.addChild(getReady);

    // render the stage
    renderer.render(stage);

    // launch the animation after a random 2-7 second delay to make things interesting
    setTimeout(() => {
        overlay.removeChild(getReady);
        animate();
    }, Math.random() * (7000 - 2000) + 2000);
};

// functions for controlling your player, some just modify the bird
// others modify the background items as well to give an infinite scroll feel
const moveUp = () => {
    bird.vy = 1;
    bird.position.y -= Math.min(20, bird.position.y - 5);
};
const moveRight = () => {
    bird.scale.x = 1;
    bird.position.x += Math.min(10, 608 - bird.position.x);
    midBack.tilePosition.x -= 2.5;
    ground.tilePosition.x -= 10;
};
const moveLeft = () => {
    bird.scale.x = -1;
    bird.position.x -= Math.min(10, bird.position.x - 32);
    midBack.tilePosition.x += 2.5;
    ground.tilePosition.x += 10;
};

// add a keyup listener to not let someone hold down the key
addEventListener('keyup', (e) => {
    switch (e.keyCode) {
    // A key press, or Left arrow
    case 65:
    case 37: {
        moveLeft();
        e.preventDefault();
        break;
    }
    // W key press, or Up arrow
    case 87:
    case 38: {
        moveUp();
        e.preventDefault();
        break;
    }
    // D key press, or Right arrow
    case 68:
    case 39: {
        moveRight();
        e.preventDefault();
        break;
    }
    default: break;
    }
}, false);

/* The function the body calls onload to preload assets before calling run */
const preload = () => { // eslint-disable-line no-unused-vars
    // initialize the loader
    const loader = PIXI.loader;

    // add the assets you want to load
    loader.add('bird', './assets/img/bird.json');
    loader.add('far_back', './assets/img/far_back.png');
    loader.add('mid_ground', './assets/img/mid_ground.png');
    loader.add('ground', './assets/img/ground.png');

    // add a listener that will update the status (loading percentage)
    loader.on('progress', updateStatus);

    // add a listener that will start the game once all assets are loaded
    loader.once('complete', build);

    // start the loader
    loader.load();
};
