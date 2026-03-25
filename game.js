// Neon Bounce Dash — Clean Phaser 3 Implementation

class BootScene extends Phaser.Scene {
    constructor() { super('BootScene'); }

    create() {
        const w = this.scale.width;
        const h = this.scale.height;

        this.add.rectangle(w/2, h/2, w, h, 0x0a0015);

        this.add.text(w/2, h * 0.3, 'NEON\nBOUNCE DASH', {
            fontSize: '42px',
            fontFamily: 'Arial Black, Arial',
            fontStyle: 'bold',
            color: '#00ffff',
            align: 'center',
            stroke: '#003344',
            strokeThickness: 4
        }).setOrigin(0.5);

        this.add.text(w/2, h * 0.55, 'Tap to bounce!\nAvoid the obstacles!', {
            fontSize: '20px',
            fontFamily: 'Arial',
            color: '#aaaacc',
            align: 'center'
        }).setOrigin(0.5);

        const btn = this.add.text(w/2, h * 0.75, '[ TAP TO PLAY ]', {
            fontSize: '24px',
            fontFamily: 'Arial Black',
            color: '#ff00ff',
            stroke: '#330033',
            strokeThickness: 3
        }).setOrigin(0.5).setInteractive();

        this.tweens.add({
            targets: btn,
            alpha: 0.3,
            duration: 600,
            yoyo: true,
            repeat: -1
        });

        this.input.once('pointerdown', () => this.scene.start('GameScene'));
        this.input.keyboard.once('keydown', () => this.scene.start('GameScene'));
    }
}

class GameScene extends Phaser.Scene {
    constructor() { super('GameScene'); }

    create() {
        this.score = 0;
        this.gameOver = false;
        this.speed = 220;
        this.gapSize = 180;
        this.obstacleInterval = 1800;
        this.lastObstacle = 0;

        const w = this.scale.width;
        const h = this.scale.height;

        // Background
        this.add.rectangle(w/2, h/2, w, h, 0x0a0015);

        // Grid lines
        const grid = this.add.graphics();
        grid.lineStyle(1, 0x220044, 0.25);
        for (let y = 0; y < h; y += 50) grid.lineBetween(0, y, w, y);
        for (let x = 0; x < w; x += 50) grid.lineBetween(x, 0, x, h);

        // Ground & ceiling
        this.add.rectangle(w/2, 15, w, 30, 0x440088);
        this.add.rectangle(w/2, h - 15, w, 30, 0x440088);

        // Ball
        this.ball = this.add.circle(w * 0.25, h/2, 14, 0x00ffff);
        this.ballVelocity = 0;
        this.gravity = 1800;
        this.jumpForce = -520;

        // Glow effect
        this.ballGlow = this.add.circle(w * 0.25, h/2, 22, 0x00ffff, 0.15);

        // Score text
        this.scoreTxt = this.add.text(w/2, 30, '0', {
            fontSize: '36px',
            fontFamily: 'Arial Black',
            color: '#ffffff',
            stroke: '#000000',
            strokeThickness: 3
        }).setOrigin(0.5, 0);

        // Obstacles group
        this.obstacles = [];

        // Input
        this.input.on('pointerdown', () => this.jump());
        this.input.keyboard.on('keydown-SPACE', () => this.jump());
        this.input.keyboard.on('keydown-UP', () => this.jump());

        // Particle trail (simple)
        this.trail = [];
    }

    jump() {
        if (this.gameOver) return;
        this.ballVelocity = this.jumpForce;
    }

    spawnObstacle() {
        const w = this.scale.width;
        const h = this.scale.height;
        const playH = h - 60; // excludes ceiling/floor
        const gapY = 60 + Math.random() * (playH - this.gapSize - 60);

        const color = 0xff00ff;
        const topH = gapY - 30;
        const botH = playH - (gapY + this.gapSize) + 30;

        const top = this.add.rectangle(w + 30, 30 + topH/2, 50, topH, color);
        const bot = this.add.rectangle(w + 30, gapY + this.gapSize + botH/2, 50, botH, color);

        // Score zone
        const zone = this.add.rectangle(w + 30, h/2, 10, h, 0x000000, 0);
        zone.scored = false;

        this.obstacles.push({ top, bot, zone, x: w + 30, passed: false });
    }

    updateObstacles(delta) {
        const ballX = this.scale.width * 0.25;

        for (let i = this.obstacles.length - 1; i >= 0; i--) {
            const obs = this.obstacles[i];
            obs.x -= this.speed * (delta / 1000);
            obs.top.setX(obs.x);
            obs.bot.setX(obs.x);

            // Score when ball passes obstacle
            if (!obs.passed && obs.x < ballX) {
                obs.passed = true;
                this.score++;
                this.scoreTxt.setText(this.score.toString());
                // Speed up
                this.speed = Math.min(400, 220 + this.score * 5);
                this.obstacleInterval = Math.max(1000, 1800 - this.score * 20);
                this.gapSize = Math.max(110, 180 - this.score * 2);
            }

            // Remove off-screen
            if (obs.x < -60) {
                obs.top.destroy();
                obs.bot.destroy();
                this.obstacles.splice(i, 1);
            }
        }
    }

    checkCollisions() {
        const ballX = this.ball.x;
        const ballY = this.ball.y;
        const r = 14;
        const w = this.scale.width;
        const h = this.scale.height;

        // Ceiling / floor
        if (ballY - r < 30 || ballY + r > h - 30) return true;

        // Obstacles
        for (const obs of this.obstacles) {
            const dx = Math.abs(ballX - obs.x);
            if (dx < 25 + r) {
                const topBot = obs.top.y + obs.top.height / 2;
                const botTop = obs.bot.y - obs.bot.height / 2;
                if (ballY - r < topBot || ballY + r > botTop) return true;
            }
        }
        return false;
    }

    update(time, delta) {
        if (this.gameOver) return;

        // Physics
        this.ballVelocity += this.gravity * (delta / 1000);
        this.ball.y += this.ballVelocity * (delta / 1000);
        this.ballGlow.setPosition(this.ball.x, this.ball.y);

        // Tilt ball
        const tilt = Phaser.Math.Clamp(this.ballVelocity / 800, -0.6, 0.6);
        this.ball.setScale(1 - Math.abs(tilt) * 0.2, 1 + Math.abs(tilt) * 0.3);

        // Trail
        this.trail.push(this.add.circle(this.ball.x - 8, this.ball.y, 5, 0x00ffff, 0.3));
        if (this.trail.length > 6) {
            this.trail[0].destroy();
            this.trail.shift();
        }

        // Spawn obstacles
        this.lastObstacle += delta;
        if (this.lastObstacle >= this.obstacleInterval) {
            this.spawnObstacle();
            this.lastObstacle = 0;
        }

        this.updateObstacles(delta);

        // Collision
        if (this.checkCollisions()) {
            this.endGame();
        }
    }

    endGame() {
        this.gameOver = true;
        this.ball.setFillStyle(0xff0000);

        // Flash
        this.cameras.main.flash(200, 255, 0, 0);

        this.time.delayedCall(800, () => {
            const best = parseInt(localStorage.getItem('neon-bounce-best') || '0');
            if (this.score > best) localStorage.setItem('neon-bounce-best', this.score);
            this.scene.start('GameOverScene', { score: this.score });
        });
    }
}

class GameOverScene extends Phaser.Scene {
    constructor() { super('GameOverScene'); }

    init(data) {
        this.finalScore = data.score || 0;
    }

    create() {
        const w = this.scale.width;
        const h = this.scale.height;
        const best = parseInt(localStorage.getItem('neon-bounce-best') || '0');

        this.add.rectangle(w/2, h/2, w, h, 0x0a0015);

        this.add.text(w/2, h * 0.2, 'GAME OVER', {
            fontSize: '44px',
            fontFamily: 'Arial Black',
            color: '#ff0066',
            stroke: '#330011',
            strokeThickness: 4
        }).setOrigin(0.5);

        this.add.text(w/2, h * 0.38, 'SCORE', {
            fontSize: '20px', fontFamily: 'Arial', color: '#888899'
        }).setOrigin(0.5);

        this.add.text(w/2, h * 0.46, this.finalScore.toString(), {
            fontSize: '64px', fontFamily: 'Arial Black',
            color: '#00ffff', stroke: '#003344', strokeThickness: 4
        }).setOrigin(0.5);

        this.add.text(w/2, h * 0.58, `BEST: ${best}`, {
            fontSize: '22px', fontFamily: 'Arial', color: '#ff00ff'
        }).setOrigin(0.5);

        if (this.finalScore >= best && this.finalScore > 0) {
            this.add.text(w/2, h * 0.65, '★ NEW BEST! ★', {
                fontSize: '22px', fontFamily: 'Arial Black', color: '#ffdd00'
            }).setOrigin(0.5);
        }

        const btn = this.add.text(w/2, h * 0.8, '[ PLAY AGAIN ]', {
            fontSize: '26px', fontFamily: 'Arial Black',
            color: '#00ffcc', stroke: '#003322', strokeThickness: 3
        }).setOrigin(0.5).setInteractive();

        this.tweens.add({ targets: btn, alpha: 0.4, duration: 500, yoyo: true, repeat: -1 });

        btn.on('pointerdown', () => this.scene.start('GameScene'));
        this.input.keyboard.once('keydown', () => this.scene.start('GameScene'));
    }
}

// INIT
window.addEventListener('load', () => {
    const game = new Phaser.Game({
        type: Phaser.AUTO,
        width: Math.min(480, window.innerWidth),
        height: window.innerHeight,
        backgroundColor: '#0a0015',
        parent: 'game-container',
        scene: [BootScene, GameScene, GameOverScene],
        scale: {
            mode: Phaser.Scale.FIT,
            autoCenter: Phaser.Scale.CENTER_BOTH
        }
    });
});
