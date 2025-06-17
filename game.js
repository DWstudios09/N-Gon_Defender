class Game {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.canvas.width = 800;
        this.canvas.height = 600;
        
        // Bildverwaltung
        this.images = {
            towers: {},
            enemies: {},
            effects: {},
            ui: {},
            background: {},
            deathAnimations: {}
        };
        
        // Lade alle Bilder
        this.loadImages();
        
        // Hintergrundmusik
        this.backgroundMusic = document.getElementById('backgroundMusic');
        this.backgroundMusic.volume = 0.3;
        
        // Sound-Effekte mit Pooling
        this.soundPool = {
            basic: [],
            slow: [],
            upgrade: [],
            sniper: [],
            splash: [],
            death: [],
            reachEnd: [],
            place: {} 
        };
        
        // Erstelle Sound-Pools (3 Instanzen pro Sound)
        const soundTypes = ['Edge Cutter', 'Angle Breaker', 'Vertex Shredder', 'Symmetry Crusher', 'Polygon Eraser', 'Core Synth'];
        soundTypes.forEach(type => {
            for (let i = 0; i < 3; i++) {
                const sound = new Audio(`sounds/${type.replace(' ', '_')}.mp3`);
                sound.volume = 0.2;
                this.soundPool[type] = [];
                this.soundPool[type].push(sound);
                
                // Erstelle Platzierungs-Sound
                const placeSound = new Audio(`sounds/${type.replace(' ', '_')}_place.mp3`);
                placeSound.volume = 0.9;
                this.soundPool.place[type] = [];
                this.soundPool.place[type].push(placeSound);
            }
        });
        
        // Erstelle Todessound-Pool
        for (let i = 0; i < 3; i++) {
            const deathSound = new Audio('sounds/enemy_death.mp3');
            deathSound.volume = 0.3;
            this.soundPool.death.push(deathSound);
        }
        
        // Erstelle Ziel-Erreichungs-Sound-Pool
        for (let i = 0; i < 3; i++) {
            const reachEndSound = new Audio('sounds/reach_end.mp3');
            reachEndSound.volume = 0.4;
            this.soundPool.reachEnd.push(reachEndSound);
        }
        
        // Raster-System
        this.gridSize = 40; // Größe eines Rasterfeldes
        this.gridWidth = Math.floor(this.canvas.width / this.gridSize);
        this.gridHeight = Math.floor(this.canvas.height / this.gridSize);
        this.grid = Array(this.gridHeight).fill().map(() => Array(this.gridWidth).fill(0)); // 0 = leer, 1 = Turm
        
        this.gold = 100;
        this.lives = 100;
        this.selectedTower = null;
        this.towers = [];
        this.enemies = [];
        this.projectiles = [];
        this.path = this.createPath();
        
        // Wellen-System
        this.currentWave = 0;
        this.enemiesInWave = 0;
        this.enemiesSpawned = 0;
        this.waveInProgress = false;
        this.spawnTimer = 0;
        this.gameOver = false;
        this.gameStarted = false;
        this.gamePaused = false;
        
        this.towerTypes = {
            'Edge Cutter': { cost: 50, range: 100, damage: 6, cooldown: 30, color: 'red' },
            'Angle Breaker': { cost: 75, range: 80, damage: 1, cooldown: 50, color: 'blue', slowEffect: 0.5, slowDuration: 90 },
            'Vertex Shredder': { cost: 150, range: 120, damage: 8, cooldown: 20, color: 'green' },
            'Symmetry Crusher': { cost: 200, range: 200, damage: 15, cooldown: 45, color: 'purple' },
            'Polygon Eraser': { cost: 500, range: 80, damage: 22, cooldown: 70, color: 'orange', splashRadius: 50 },
            'Core Synth': { cost: 750, range: 1000, damage: 50, cooldown: 90, color: 'cyan' }
        };
        
        this.enemyTypes = {
            normal: { health: 12, speed: 1.4, color: 'red', gold: 5, damage: 2 },
            fast: { health: 6, speed: 2.0, color: 'yellow', gold: 7, damage: 2 },
            tank: { health: 30, speed: 1.0, color: 'blue', gold: 8, damage: 3 },
            boss: { health: 50, speed: 0.8, color: 'purple', gold: 10, damage: 5 },
            elite: { health: 1000, speed: 1.1, color: 'gold', gold: 15, damage: 10 }
        };
        
        this.deathAnimations = [];
        
        // Upgrade-System
        this.upgradeCost = 500;
        this.upgradeRangeIncrease = 40; // Ein Raster = 40 Pixel
        this.upgradeSystemUnlocked = false;
        this.selectedTowerForUpgrade = null;
        this.damageUpgradeUnlocked = false;
        
        this.setupEventListeners();
    }

    async loadImages() {
        // Türme
        const towerTypes = ['Edge_Cutter', 'Angle_Breaker', 'Vertex_Shredder', 'Symmetry_Crusher', 'Polygon_Eraser', 'Core_Synth'];
        for (const type of towerTypes) {
            this.images.towers[type] = {
                idle: new Image(),
                attack: new Image()
            };
            this.images.towers[type].idle.src = `images/${type}_idle.png`;
            this.images.towers[type].attack.src = `images/${type}_attack.png`;
        }

        // Gegner
        const enemyTypes = ['normal', 'fast', 'tank', 'boss', 'elite'];
        for (const type of enemyTypes) {
            this.images.enemies[type] = new Image();
            this.images.enemies[type].src = `images/${type}.png`;
        }

        // Effekte
        this.images.effects = {
            explosion: new Image(),
            projectiles: {}
        };
        this.images.effects.explosion.src = 'images/explosion.png';
        
        // Projektil-Bilder für jeden Turm laden
        for (const type of towerTypes) {
            this.images.effects.projectiles[type] = new Image();
            this.images.effects.projectiles[type].src = `images/${type}_projectile.png`;
        }

        // Hintergrund
        this.images.background.path = new Image();
        this.images.background.path.src = 'images/path.png';
        this.images.background.grid = new Image();
        this.images.background.grid.src = 'images/grid.png';

        // UI Elemente
        this.images.ui.heart = new Image();
        this.images.ui.heart.src = 'images/heart.png';
        this.images.ui.coin = new Image();
        this.images.ui.coin.src = 'images/coin.png';

        // Todesanimationen laden
        for (const type of enemyTypes) {
            this.images.deathAnimations[type] = new Image();
            this.images.deathAnimations[type].src = `images/${type}_death.png`;
        }
    }

    createPath() {
        // Verschiedene Zick-Zack Pfadmuster
        const pathPatterns = [
            // Muster 1: Standard Zick-Zack
            [
                {x: -1, y: 7}, {x: 0, y: 7}, {x: 5, y: 7}, {x: 5, y: 3},
                {x: 10, y: 3}, {x: 10, y: 11}, {x: 15, y: 11}, {x: 15, y: 7}, {x: 20, y: 7}
            ],
            // Muster 2: Zick-Zack nach unten
            [
                {x: -1, y: 7}, {x: 0, y: 7}, {x: 5, y: 7}, {x: 5, y: 11},
                {x: 10, y: 11}, {x: 10, y: 3}, {x: 15, y: 3}, {x: 15, y: 7}, {x: 20, y: 7}
            ],
            // Muster 3: Enger Zick-Zack
            [
                {x: -1, y: 7}, {x: 0, y: 7}, {x: 3, y: 7}, {x: 3, y: 4},
                {x: 6, y: 4}, {x: 6, y: 10}, {x: 9, y: 10}, {x: 9, y: 4},
                {x: 12, y: 4}, {x: 12, y: 10}, {x: 15, y: 10}, {x: 15, y: 7}, {x: 20, y: 7}
            ],
            // Muster 4: Weiter Zick-Zack
            [
                {x: -1, y: 7}, {x: 0, y: 7}, {x: 4, y: 7}, {x: 4, y: 3},
                {x: 8, y: 3}, {x: 8, y: 11}, {x: 12, y: 11}, {x: 12, y: 3},
                {x: 16, y: 3}, {x: 16, y: 11}, {x: 20, y: 11}
            ],
            // Muster 5: Mittlerer Zick-Zack
            [
                {x: -1, y: 7}, {x: 0, y: 7}, {x: 4, y: 7}, {x: 4, y: 4},
                {x: 8, y: 4}, {x: 8, y: 10}, {x: 12, y: 10}, {x: 12, y: 4},
                {x: 16, y: 4}, {x: 16, y: 10}, {x: 20, y: 10}
            ]
        ];

        // Wähle zufällig ein Pfadmuster aus
        const pathPoints = pathPatterns[Math.floor(Math.random() * pathPatterns.length)];

        // Reset Raster
        this.grid = Array(this.gridHeight).fill().map(() => Array(this.gridWidth).fill(0));

        // Markiere Pfad im Raster
        for (let i = 0; i < pathPoints.length - 1; i++) {
            const start = pathPoints[i];
            const end = pathPoints[i + 1];
            
            // Zeichne horizontale oder vertikale Linie
            if (start.x === end.x) {
                const minY = Math.min(start.y, end.y);
                const maxY = Math.max(start.y, end.y);
                for (let y = minY; y <= maxY; y++) {
                    if (y >= 0 && y < this.gridHeight && start.x >= 0 && start.x < this.gridWidth) {
                        this.grid[y][start.x] = 2; // 2 = Pfad
                    }
                }
            } else {
                const minX = Math.min(start.x, end.x);
                const maxX = Math.max(start.x, end.x);
                for (let x = minX; x <= maxX; x++) {
                    if (start.y >= 0 && start.y < this.gridHeight && x >= 0 && x < this.gridWidth) {
                        this.grid[start.y][x] = 2; // 2 = Pfad
                    }
                }
            }
        }

        // Konvertiere Rasterkoordinaten in Pixelkoordinaten
        return pathPoints.map(point => ({
            x: point.x * this.gridSize + this.gridSize / 2,
            y: point.y * this.gridSize + this.gridSize / 2
        }));
    }

    isPath(x, y) {
        const gridX = Math.floor(x / this.gridSize);
        const gridY = Math.floor(y / this.gridSize);
        return this.grid[gridY] && this.grid[gridY][gridX] === 2;
    }

    isOccupied(x, y) {
        const gridX = Math.floor(x / this.gridSize);
        const gridY = Math.floor(y / this.gridSize);
        return this.grid[gridY] && this.grid[gridY][gridX] === 1;
    }

    setupEventListeners() {
        // Start-Button Event Listener
        document.getElementById('startGameBtn').addEventListener('click', () => {
            document.getElementById('startScreen').style.display = 'none';
            document.getElementById('gameContainer').style.display = 'flex';
            this.gameStarted = true;
            this.startBackgroundMusic();
            this.startNextWave();
            this.gameLoop();
        });

        // Nächste Welle Button Event Listener
        document.getElementById('nextWaveBtn').addEventListener('click', () => {
            this.startNextWave();
            document.getElementById('nextWaveBtn').style.display = 'none';
        });

        // Turm-Auswahl Event Listener
        document.querySelectorAll('.tower-btn').forEach(button => {
            button.addEventListener('click', () => {
                const towerType = button.getAttribute('data-tower');
                // Wenn der gleiche Turm nochmal geklickt wird, wähle ihn ab
                if (this.selectedTower === towerType) {
                    this.selectedTower = null;
                    button.classList.remove('selected');
                } else {
                    this.selectedTower = towerType;
                    // Aktualisiere Button-Styles
                    document.querySelectorAll('.tower-btn').forEach(btn => {
                        btn.classList.remove('selected');
                    });
                    button.classList.add('selected');
                }
            });
        });

        // Upgrade-Buttons Event Listener
        document.getElementById('upgradeRangeBtn').addEventListener('click', () => {
            if (this.selectedTowerForUpgrade && this.gold >= this.upgradeCost) {
                this.upgradeTower(this.selectedTowerForUpgrade);
                document.getElementById('upgradeRangeBtn').style.display = 'none';
            }
        });

        document.getElementById('upgradeDamageBtn').addEventListener('click', () => {
            if (this.selectedTowerForUpgrade && this.damageUpgradeUnlocked && this.gold >= this.towerTypes[this.selectedTowerForUpgrade.type].cost) {
                this.upgradeTowerDamage(this.selectedTowerForUpgrade);
                document.getElementById('upgradeDamageBtn').style.display = 'none';
            }
        });

        // Canvas Click Event Listener
        this.canvas.addEventListener('click', (event) => {
            if (!this.gameStarted || this.gameOver) return;
            
            const rect = this.canvas.getBoundingClientRect();
            const x = event.clientX - rect.left;
            const y = event.clientY - rect.top;
            
            if (this.selectedTower) {
                this.placeTower(x, y);
            } else if (this.upgradeSystemUnlocked) {
                // Prüfe, ob ein Turm zum Upgraden ausgewählt wurde
                const clickedTower = this.towers.find(tower => {
                    const dx = tower.x - x;
                    const dy = tower.y - y;
                    return Math.sqrt(dx * dx + dy * dy) < this.gridSize / 2;
                });

                if (clickedTower) {
                    this.selectedTowerForUpgrade = clickedTower;
                    document.getElementById('upgradeRangeBtn').style.display = 'block';
                    if (this.damageUpgradeUnlocked) {
                        document.getElementById('upgradeDamageBtn').style.display = 'block';
                    }
                } else {
                    this.selectedTowerForUpgrade = null;
                    document.getElementById('upgradeRangeBtn').style.display = 'none';
                    document.getElementById('upgradeDamageBtn').style.display = 'none';
                }
            } else {
                // Wenn kein Turm ausgewählt ist, setze selectedTower auf null
                this.selectedTower = null;
                // Entferne die selected-Klasse von allen Buttons
                document.querySelectorAll('.tower-btn').forEach(btn => {
                    btn.classList.remove('selected');
                });
            }
        });

        // Buttons initial ausblenden
        document.querySelector('[data-tower="Angle Breaker"]').style.display = 'none';
        document.querySelector('[data-tower="Vertex Shredder"]').style.display = 'none';
        document.querySelector('[data-tower="Symmetry Crusher"]').style.display = 'none';
        document.querySelector('[data-tower="Polygon Eraser"]').style.display = 'none';

        // Hilfe-Button Event Listener
        document.getElementById('helpBtn').addEventListener('click', () => {
            if (this.gameStarted && !this.gameOver) {
                this.pauseGame();
                document.getElementById('helpScreen').style.display = 'flex';
            }
        });

        // Zurück-Button Event Listener
        document.getElementById('backToGameBtn').addEventListener('click', () => {
            document.getElementById('helpScreen').style.display = 'none';
            this.resumeGame();
        });
    }

    placeTower(x, y) {
        const gridX = Math.floor(x / this.gridSize);
        const gridY = Math.floor(y / this.gridSize);
        
        if (this.grid[gridY] && this.grid[gridY][gridX] === 0) {
            const towerType = this.towerTypes[this.selectedTower];
            
            if (this.gold >= towerType.cost) {
                this.grid[gridY][gridX] = 1;
                
                const pixelX = gridX * this.gridSize + this.gridSize / 2;
                const pixelY = gridY * this.gridSize + this.gridSize / 2;
                
                this.towers.push({
                    x: pixelX,
                    y: pixelY,
                    type: this.selectedTower,
                    range: towerType.range,
                    damage: towerType.damage,
                    cooldown: 0,
                    maxCooldown: towerType.cooldown,
                    splashRadius: towerType.splashRadius
                });
                
                this.gold -= towerType.cost;
                // Spiele den Platzierungs-Sound ab
                const placeSound = this.soundPool.place[this.selectedTower][0];
                if (placeSound) {
                    placeSound.currentTime = 0;
                    placeSound.play();
                }
                this.selectedTower = null;
            }
        }
    }

    startNextWave() {
        this.currentWave++;
        this.enemiesInWave = 10 + this.currentWave * 2;
        this.enemiesSpawned = 0;
        this.waveInProgress = true;
        this.spawnTimer = 0;
        document.getElementById('nextWaveBtn').style.display = 'none';

        // Türme freischalten je nach Welle
        document.querySelector('[data-tower="Angle Breaker"]').style.display = this.currentWave >= 5 ? 'block' : 'none';
        document.querySelector('[data-tower="Vertex Shredder"]').style.display = this.currentWave >= 10 ? 'block' : 'none';
        document.querySelector('[data-tower="Symmetry Crusher"]').style.display = this.currentWave >= 15 ? 'block' : 'none';
        document.querySelector('[data-tower="Polygon Eraser"]').style.display = this.currentWave >= 20 ? 'block' : 'none';
        document.querySelector('[data-tower="Core Synth"]').style.display = this.currentWave >= 30 ? 'block' : 'none';

        // Upgrade-System freischalten
        if (this.currentWave >= 40 && !this.upgradeSystemUnlocked) {
            this.upgradeSystemUnlocked = true;
            document.getElementById('upgradeSystem').style.display = 'block';
        }

        // Schadens-Upgrade freischalten
        if (this.currentWave >= 50 && !this.damageUpgradeUnlocked) {
            this.damageUpgradeUnlocked = true;
        }
    }

    spawnEnemy() {
        if (this.gameOver) {
            return;
        }
        if (this.enemiesSpawned < this.enemiesInWave) {
            this.spawnTimer++;
            if (this.spawnTimer >= 30) {
                this.spawnTimer = 0;
                this.enemiesSpawned++;
                
                // Bestimme den Gegnertyp basierend auf der Welle
                let enemyType;
                if (this.currentWave % 5 === 0) {
                    // Jede 5. Welle ist eine Boss-Welle
                    enemyType = 'boss';
                } else if (this.currentWave >= 50) {
                    // Ab Welle 50 können Elite-Gegner spawnen
                    const rand = Math.random();
                    if (rand < 0.3) enemyType = 'elite';
                    else if (rand < 0.5) enemyType = 'normal';
                    else if (rand < 0.7) enemyType = 'fast';
                    else enemyType = 'tank';
                } else {
                    // Normale Wellen
                    const rand = Math.random();
                    if (this.currentWave >= 3) {
                        if (rand < 0.4) enemyType = 'normal';
                        else if (rand < 0.7) enemyType = 'fast';
                        else enemyType = 'tank';
                    } else {
                        enemyType = 'normal';
                    }
                }
                
                const type = this.enemyTypes[enemyType];
                // Basis-Gesundheitserhöhung pro Welle
                const baseHealthIncrease = (this.currentWave - 1) * 8;
                // Zusätzliche 25% Erhöhung alle 10 Wellen
                const waveMultiplier = Math.floor(this.currentWave / 10) * 0.25;
                const health = Math.floor((type.health + baseHealthIncrease) * (1 + waveMultiplier));

                // Berechne die Geschwindigkeitsanpassung basierend auf der Wellennummer
                let speedMultiplier = 1.0;
                if (this.currentWave >= 30) {
                    // Berechne, wie viele 10er-Schritte seit Welle 30 vergangen sind
                    const speedIncreaseSteps = Math.floor((this.currentWave - 30) / 10);
                    // Erhöhe die Geschwindigkeit um x% pro Schritt
                    speedMultiplier = 1.0 + (speedIncreaseSteps * 0.1);
                }

                this.enemies.push({
                    x: this.path[0].x,
                    y: this.path[0].y,
                    health: health,
                    maxHealth: health,
                    speed: type.speed * speedMultiplier,
                    baseSpeed: type.speed * speedMultiplier,
                    type: enemyType,
                    color: type.color,
                    gold: type.gold,
                    damage: type.damage,
                    slowTimer: 0,
                    pathIndex: 0,
                    showDamage: false,
                    damageText: 0
                });
            }
        } else if (this.enemies.length === 0 && this.waveInProgress) {
            document.getElementById('nextWaveBtn').style.display = 'block';
        }
    }

    updateEnemies() {
        for (let i = this.enemies.length - 1; i >= 0; i--) {
            const enemy = this.enemies[i];
            
            // Verlangsamung aktualisieren
            if (enemy.slowTimer > 0) {
                enemy.slowTimer--;
                if (enemy.slowTimer === 0) {
                    enemy.speed = enemy.baseSpeed;
                }
            }
            
            // Bewegung
            const targetPoint = this.path[enemy.pathIndex];
            const dx = targetPoint.x - enemy.x;
            const dy = targetPoint.y - enemy.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance < enemy.speed) {
                enemy.pathIndex++;
                if (enemy.pathIndex >= this.path.length) {
                    // Schaden basierend auf Gegnertyp
                    const damage = this.enemyTypes[enemy.type].damage;
                    this.lives = Math.max(0, this.lives - damage);
                    
                    // Spiele Sound ab, wenn Gegner das Ziel erreicht
                    this.playSound('reachEnd');
                    
                    this.enemies.splice(i, 1);
                    
                    if (this.lives <= 0) {
                        this.handleGameOver();
                        return;
                    }
                    continue;
                }
            } else {
                // Spezielle Behandlung für Boss-Gegner
                if (enemy.type === 'boss') {
                    // Normalisiere die Bewegungsrichtung
                    const normalizedDx = dx / distance;
                    const normalizedDy = dy / distance;
                    
                    // Berechne die aktuelle Geschwindigkeit
                    const currentSpeed = enemy.slowTimer > 0 ? enemy.speed : enemy.baseSpeed;
                    
                    // Wende die Geschwindigkeit auf beide Richtungen an
                    const moveX = normalizedDx * currentSpeed;
                    const moveY = normalizedDy * currentSpeed;
                    
                    // Bewege den Gegner
                    enemy.x += moveX;
                    enemy.y += moveY;
                } else {
                    // Normale Bewegung für andere Gegner
                    enemy.x += (dx / distance) * enemy.speed;
                    enemy.y += (dy / distance) * enemy.speed;
                }
            }

            // Prüfe ob der Gegner besiegt wurde
            if (enemy.health <= 0) {
                this.handleEnemyDeath(enemy);
                this.enemies.splice(i, 1);
            }
        }
    }

    updateTowers() {
        this.towers.forEach(tower => {
            if (tower.cooldown > 0) {
                tower.cooldown--;
            } else {
                const target = this.findTarget(tower);
                if (target) {
                    this.shoot(tower, target);
                    tower.cooldown = tower.maxCooldown;
                }
            }
        });
    }

    playSound(type) {
        // Finde einen verfügbaren Sound aus dem Pool
        const pool = this.soundPool[type];
        if (!pool) return;

        // Zähle aktive Sounds
        const activeSounds = pool.filter(sound => !sound.paused);
        
        // Wenn zu viele Sounds aktiv sind, reduziere die Lautstärke
        if (activeSounds.length > 0) {
            const volume = Math.max(0.1, 0.5 / (activeSounds.length + 1));
            activeSounds.forEach(sound => {
                sound.volume = volume;
            });
        }

        // Finde einen nicht spielenden Sound
        const availableSound = pool.find(sound => sound.paused);
        if (availableSound) {
            availableSound.currentTime = 0;
            availableSound.volume = 0.5; // Reset volume for new sound
            availableSound.play();
        }
    }

    shoot(tower, target) {
        // Spiele den entsprechenden Sound ab
        this.playSound(tower.type);

        if (tower.type === 'Angle Breaker') {
            // Verlangsame den Gegner
            const slowEffect = this.towerTypes['Angle Breaker'].slowEffect;
            const slowDuration = this.towerTypes['Angle Breaker'].slowDuration;
            
            target.speed = target.baseSpeed * slowEffect;
            target.slowTimer = slowDuration;
            
            // Visueller Effekt für Verlangsamung
            target.showDamage = true;
            target.damageText = "SLOW";
            setTimeout(() => {
                target.showDamage = false;
            }, 1000);
        } else if (tower.type === 'Polygon Eraser') {
            this.enemies.forEach(enemy => {
                const dx = enemy.x - target.x;
                const dy = enemy.y - target.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                if (distance <= tower.splashRadius) {
                    enemy.health -= tower.damage;
                    enemy.showDamage = true;
                    enemy.damageText = tower.damage;
                    setTimeout(() => {
                        enemy.showDamage = false;
                    }, 1000);
                }
            });
        } else {
            target.health -= tower.damage;
            target.showDamage = true;
            target.damageText = tower.damage;
            setTimeout(() => {
                target.showDamage = false;
            }, 1000);
        }

        this.projectiles.push({
            x: tower.x,
            y: tower.y,
            targetX: target.x,
            targetY: target.y,
            speed: 10,
            type: tower.type
        });
    }

    updateProjectiles() {
        for (let i = this.projectiles.length - 1; i >= 0; i--) {
            const projectile = this.projectiles[i];
            
            if (projectile.type === 'explosion') {
                projectile.frame++;
                projectile.scale = 1 + (projectile.frame / projectile.maxFrames);
                if (projectile.frame >= projectile.maxFrames) {
                    this.projectiles.splice(i, 1);
                }
                continue;
            }

            const dx = projectile.targetX - projectile.x;
            const dy = projectile.targetY - projectile.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance < projectile.speed) {
                this.projectiles.splice(i, 1);
            } else {
                projectile.x += (dx / distance) * projectile.speed;
                projectile.y += (dy / distance) * projectile.speed;
            }
        }
    }

    findTarget(tower) {
        return this.enemies.find(enemy => {
            const dx = enemy.x - tower.x;
            const dy = enemy.y - tower.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            return distance <= tower.range;
        });
    }

    attack(damage, enemy) {
        enemy.health -= damage;
        
        // Schadens-Animation
        enemy.showDamage = true;
        enemy.damageText = `-${damage}`;
        enemy.damageTimer = 30; // 0.5 Sekunden Anzeigezeit

        if (enemy.health <= 0) {
            const index = this.enemies.indexOf(enemy);
            if (index > -1) {
                this.enemies.splice(index, 1);
                this.gold += 10;
            }
        }
    }

    restartGame() {
        // Reset aller Spielvariablen
        this.gold = 100;
        this.lives = 100;
        this.selectedTower = null;
        this.towers = [];
        this.enemies = [];
        this.projectiles = [];
        this.currentWave = 0;
        this.enemiesInWave = 0;
        this.enemiesSpawned = 0;
        this.waveInProgress = false;
        this.spawnTimer = 0;
        this.gameOver = false;
        this.gameStarted = true;

        // Reset Raster
        this.grid = Array(this.gridHeight).fill().map(() => Array(this.gridWidth).fill(0));
        this.path = this.createPath();

        // UI aktualisieren
        document.getElementById('nextWaveBtn').style.display = 'none';
        document.getElementById('gameOverScreen').style.display = 'none';
        document.getElementById('gameContainer').style.display = 'flex';
        this.canvas.style.pointerEvents = 'auto';

        // Neue Welle starten
        this.startNextWave();
        this.gameLoop();
    }

    draw() {
        // Canvas leeren
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Hintergrund zeichnen
        this.drawBackground();
        
        // Pfad zeichnen
        this.drawPath();
        
        // Türme zeichnen
        this.drawTowers();
        
        // Projektile zeichnen
        this.drawProjectiles();
        
        // Gegner zeichnen
        this.drawEnemies();
        
        // Todesanimationen zeichnen
        this.drawDeathAnimations();
        
        // UI zeichnen
        this.drawUI();
    }

    drawBackground() {
        // Raster zeichnen
        for (let x = 0; x < this.canvas.width; x += this.gridSize) {
            for (let y = 0; y < this.canvas.height; y += this.gridSize) {
                this.ctx.drawImage(this.images.background.grid, x, y, this.gridSize, this.gridSize);
            }
        }
    }

    drawPath() {
        // Pfad zeichnen (immer 40x40 pro Feld)
        for (let y = 0; y < this.gridHeight; y++) {
            for (let x = 0; x < this.gridWidth; x++) {
                if (this.grid[y][x] === 2) {
                    this.ctx.drawImage(this.images.background.path, x * this.gridSize, y * this.gridSize, this.gridSize, this.gridSize);
                }
            }
        }
    }

    drawTowers() {
        this.towers.forEach(tower => {
            const towerImage = tower.cooldown > 0 ? 
                this.images.towers[tower.type.replace(' ', '_')].attack :
                this.images.towers[tower.type.replace(' ', '_')].idle;
            
            // Zentriert und skaliert auf 40x40
            this.ctx.drawImage(towerImage, tower.x - this.gridSize/2, tower.y - this.gridSize/2, this.gridSize, this.gridSize);
            
            // Zeichne Range-Kreis
            if (this.selectedTower === tower.type || this.selectedTowerForUpgrade === tower) {
                this.ctx.beginPath();
                this.ctx.arc(tower.x, tower.y, tower.range, 0, Math.PI * 2);
                this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
                this.ctx.stroke();
            }

            // Upgrade-Effekte zeichnen
            if (tower.showUpgradeEffect) {
                this.ctx.beginPath();
                this.ctx.arc(tower.x, tower.y, this.gridSize, 0, Math.PI * 2);
                this.ctx.strokeStyle = 'rgba(0, 255, 0, 0.5)';
                this.ctx.lineWidth = 3;
                this.ctx.stroke();
                this.ctx.lineWidth = 1;
            }

            if (tower.showDamageUpgradeEffect) {
                this.ctx.beginPath();
                this.ctx.arc(tower.x, tower.y, this.gridSize * 1.2, 0, Math.PI * 2);
                this.ctx.strokeStyle = 'rgba(255, 0, 0, 0.5)';
                this.ctx.lineWidth = 3;
                this.ctx.stroke();
                this.ctx.lineWidth = 1;
            }
        });
    }

    drawProjectiles() {
        this.projectiles.forEach(projectile => {
            if (projectile.type === 'explosion') {
                const progress = projectile.frame / projectile.maxFrames;
                const alpha = 1 - progress;
                
                this.ctx.save();
                this.ctx.globalAlpha = alpha;
                this.ctx.drawImage(
                    this.images.effects.explosion,
                    projectile.x - (this.gridSize * projectile.scale) / 2,
                    projectile.y - (this.gridSize * projectile.scale) / 2,
                    this.gridSize * projectile.scale,
                    this.gridSize * projectile.scale
                );
                this.ctx.restore();
            } else {
                const towerType = projectile.type.replace(' ', '_');
                this.ctx.drawImage(
                    this.images.effects.projectiles[towerType],
                    projectile.x - this.gridSize/4,
                    projectile.y - this.gridSize/4,
                    this.gridSize/2,
                    this.gridSize/2
                );
            }
        });
    }

    drawEnemies() {
        this.enemies.forEach(enemy => {
            // Gegner zentriert und skaliert auf 40x40
            this.ctx.drawImage(this.images.enemies[enemy.type], 
                enemy.x - this.gridSize/2, enemy.y - this.gridSize/2, this.gridSize, this.gridSize);

            // Gesundheitsleiste zeichnen (immer 4px unter dem oberen Rand des Gegners)
            const healthBarWidth = 20;
            const healthBarHeight = 3;
            const healthPercentage = enemy.health / enemy.maxHealth;
            const barY = enemy.y - this.gridSize/2 + 4;
            this.ctx.fillStyle = 'red';
            this.ctx.fillRect(enemy.x - healthBarWidth/2, barY, healthBarWidth, healthBarHeight);
            this.ctx.fillStyle = 'green';
            this.ctx.fillRect(enemy.x - healthBarWidth/2, barY, healthBarWidth * healthPercentage, healthBarHeight);

            // "SLOW" Text zeichnen
            if (enemy.slowTimer > 0) {
                const originalTextAlign = this.ctx.textAlign;
                const originalFont = this.ctx.font;
                this.ctx.fillStyle = 'white';
                this.ctx.font = '12px Arial';
                this.ctx.textAlign = 'center';
                this.ctx.fillText('SLOW', enemy.x, barY - 6);
                this.ctx.textAlign = originalTextAlign;
                this.ctx.font = originalFont;
            }
        });
    }

    drawDeathAnimations() {
        this.deathAnimations.forEach(animation => {
            const progress = animation.frame / animation.maxFrames;
            const scale = 1 - progress; // Animation wird kleiner
            const alpha = 1 - progress; // Animation wird transparenter
            
            this.ctx.save();
            this.ctx.globalAlpha = alpha;
            this.ctx.drawImage(
                this.images.deathAnimations[animation.type],
                animation.x - (this.gridSize * scale) / 2,
                animation.y - (this.gridSize * scale) / 2,
                this.gridSize * scale,
                this.gridSize * scale
            );
            this.ctx.restore();
        });
    }

    drawUI() {
        // Welle anzeigen
        this.ctx.fillStyle = 'white';
        this.ctx.font = '16px Arial';
        this.ctx.fillText(`Wave: ${this.currentWave}`, 20, 35);

        // Leben mit Herz-Icon anzeigen
        const heartSize = 20;
        this.ctx.drawImage(this.images.ui.heart, 20, 50, heartSize, heartSize);
        this.ctx.fillText(`${this.lives}`, 50, 70);

        // Gold mit Münz-Icon anzeigen
        const coinSize = 20;
        this.ctx.drawImage(this.images.ui.coin, 20, 90, coinSize, coinSize);
        this.ctx.fillText(`${this.gold}`, 50, 110);

        // Turm-Schaden anzeigen (ab Welle 50)
        if (this.currentWave >= 50 && this.selectedTowerForUpgrade) {
            this.ctx.fillStyle = 'white';
            this.ctx.font = '12px Arial';
            this.ctx.textAlign = 'right';
            this.ctx.fillText(`Damage: ${this.selectedTowerForUpgrade.damage}`, this.canvas.width - 20, 35);
            this.ctx.textAlign = 'left';
        }
    }

    gameLoop() {
        if (!this.gameStarted || this.gameOver || this.gamePaused) {
            requestAnimationFrame(() => this.gameLoop());
            return;
        }
        
        this.spawnEnemy();
        this.updateEnemies();
        this.updateTowers();
        this.updateProjectiles();
        this.updateDeathAnimations();
        this.draw();
        
        requestAnimationFrame(() => this.gameLoop());
    }

    handleEnemyDeath(enemy) {
        // Füge Todesanimation hinzu
        this.deathAnimations.push({
            x: enemy.x,
            y: enemy.y,
            type: enemy.type,
            frame: 0,
            maxFrames: 30
        });

        // Füge Explosion hinzu
        this.projectiles.push({
            x: enemy.x,
            y: enemy.y,
            type: 'explosion',
            frame: 0,
            maxFrames: 15,
            scale: 1.0
        });

        // Spiele Todessound ab
        this.playSound('death');

        this.gold += enemy.gold;
    }

    updateDeathAnimations() {
        for (let i = this.deathAnimations.length - 1; i >= 0; i--) {
            const animation = this.deathAnimations[i];
            animation.frame++;
            
            if (animation.frame >= animation.maxFrames) {
                this.deathAnimations.splice(i, 1);
            }
        }
    }

    handleGameOver() {
        this.gameOver = true;
        this.waveInProgress = false;
        this.enemies = []; // Entfernt alle verbleibenden Gegner
        
        // UI Updates
        document.getElementById('gameOverScreen').style.display = 'flex';
        document.getElementById('waveReached').textContent = this.currentWave;
        document.getElementById('nextWaveBtn').style.display = 'none';
        document.getElementById('gameContainer').style.display = 'none';
        
        // Verhindert weitere Interaktionen
        this.canvas.style.pointerEvents = 'none';
    }

    startBackgroundMusic() {
        if (!this.backgroundMusic) return;
        
        this.backgroundMusic.currentTime = 0;
        this.backgroundMusic.play();
    }

    start() {
        this.gameStarted = true;
        this.gameOver = false;
        this.startBackgroundMusic();
        this.spawnEnemy();
    }

    checkGameOver() {
        if (this.lives <= 0) {
            this.gameOver = true;
            this.backgroundMusic.pause();
            this.backgroundMusic.currentTime = 0;
            this.showGameOverScreen();
        }
    }

    pauseGame() {
        this.gamePaused = true;
    }

    resumeGame() {
        this.gamePaused = false;
    }

    upgradeTower(tower) {
        if (this.gold >= this.upgradeCost) {
            tower.range += this.upgradeRangeIncrease;
            this.gold -= this.upgradeCost;
            
            // Visueller Effekt für das Upgrade
            tower.showUpgradeEffect = true;
            setTimeout(() => {
                tower.showUpgradeEffect = false;
            }, 1000);
        }
    }

    upgradeTowerDamage(tower) {
        const towerType = this.towerTypes[tower.type];
        if (this.gold >= towerType.cost) {
            tower.damage += towerType.damage;
            this.gold -= towerType.cost;
            
            // Visueller Effekt für das Upgrade
            tower.showDamageUpgradeEffect = true;
            setTimeout(() => {
                tower.showDamageUpgradeEffect = false;
            }, 1000);
        }
    }
}

// Spiel starten
window.onload = () => {
    new Game();
}; 