import * as THREE from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'

let scene, camera, renderer
let player
let player2
let shakeTime = 0
let stars
let radius = 0.3
let angle = 0.1
let Sun
let enemies = []
let enemyDirection = 1
let enemySpeed = 0.02
let enemyStepDown = 0.5
let level = 1
let boss = null
let bossHP = 20

let gameMode = "runner"

let bullets = []
const MAX_BULLETS = 3

let enemyBullets = []

let powerUps = []
let obstacles = []
let asteroids = []
let asteroids2 = []
let particles = []

let engineParticles = []

let gameStarted = false
let paused = false
let gameOver = false

let activeEffects = {
    shield: false,
    slow: false,
    double: false
}

let effectTimers = {
    shield: 0,
    slow: 0,
    double: 0
}
let effectIntervals = []
const textureLoader = new THREE.TextureLoader()

const icons = {
    shield: textureLoader.load('shield.png'),
    slow: textureLoader.load('slow.png'),
    double: textureLoader.load('double.png'),
    invert: textureLoader.load('invert.png'),
    speed: textureLoader.load('speed.png'),
    shake: textureLoader.load('shake.png')
}

let moveSpeedMultiplier = 0.8
let speedMultiplier = 0.5
let speed = 0.05
let score = 0

let playerRotateZ = 0
let playerRotateX = 0
let playerRotateZ1 = 0
let playerRotateX1 = 0
let player2RotateZ = 0
let player2RotateX = 0
let player2RotateZ1 = 0
let player2RotateX1 = 0

const audio = new Audio('starwars.mp3')
audio.volume = 0.05
const keys = {}

let lastTime = performance.now()
let frames = 0
let fps = 0

scene = new THREE.Scene()
camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000)
camera.position.z = 5

renderer = new THREE.WebGLRenderer()
renderer.setSize(window.innerWidth, window.innerHeight)
document.body.appendChild(renderer.domElement)

const ambientLight = new THREE.AmbientLight(0xffffff, 2)
scene.add(ambientLight)

const pointLight = new THREE.PointLight(0xffffff, 10000)
pointLight.position.set(-10, 15, -30)
scene.add(pointLight)

const loader = new GLTFLoader()
const startScreen = document.getElementById("startScreen")
const pauseScreen = document.getElementById("pauseScreen")
const scoreUI = document.getElementById('score')
const gameOverUI = document.getElementById('gameOver')
const fpsUI = document.getElementById('fps')
let bestScoreValue = parseInt(localStorage.getItem("bestScore")) || 0
document.getElementById('bestScore').innerText = "Best Score: " + bestScoreValue

loader.load('/spaceship.glb', (gltf) => {
    player = gltf.scene
    scene.add(player)
    player.scale.set(0.2, 0.2, 0.2)
    player.position.set(-1, 0, 0)
    player.rotation.set(0, 600, 0)
})

loader.load('/quaternius_cc0-spaceship-1367.glb', (gltf) => {
    player2 = gltf.scene
    scene.add(player2)
    player2.scale.set(0.2, 0.2, 0.2)
    player2.position.set(1, 0, 0)
    player2.rotation.set(0, 600, 0)
})

function updateLevel() {
    level = Math.floor(score / 100) + 1
    enemySpeed = 0.02 + level * 0.005
}

function enemyShoot(enemy) {
    const geo = new THREE.SphereGeometry(0.1)
    const mat = new THREE.MeshBasicMaterial({ color: 0xffff00 })
    const bullet = new THREE.Mesh(geo, mat)

    bullet.position.copy(enemy.position)
    bullet.velocity = new THREE.Vector3(0, 0, 0.2)

    scene.add(bullet)
    enemyBullets.push(bullet)
}

function updateEnemyBullets() {
    for (let i = enemyBullets.length - 1; i >= 0; i--) {
        const b = enemyBullets[i]
        b.position.add(b.velocity)

        if (checkCollision(b, player) || checkCollision(b, player2)) {
            handleGameOver()
        }
        if (b.position.z > 5) {
            scene.remove(b)
            enemyBullets.splice(i, 1)
        }
    }
}

function spawnBoss() {
    const geo = new THREE.BoxGeometry(2, 2, 2)
    const mat = new THREE.MeshStandardMaterial({ color: 0xff00ff })
    boss = new THREE.Mesh(geo, mat)

    boss.position.set(0, 3, -10)
    scene.add(boss)
}

function createEnemyGrid() {
    const rows = 3
    const cols = 6
    const spacing = 1.5

    for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
            const geo = new THREE.BoxGeometry(0.7, 0.7, 0.7)
            const mat = new THREE.MeshStandardMaterial({ color: 0x00ff00 })
            const enemy = new THREE.Mesh(geo, mat)

            enemy.position.x = (x - cols / 2) * spacing
            enemy.position.y = 3 - y * spacing
            enemy.position.z = -10
            enemy.type = Math.random() < 0.3 ? "fast" : "normal"
            if (enemy.type === "fast") {
                enemy.material.color.set(0xff0000)
                enemy.speedMultiplier = 2
            } else {
                enemy.speedMultiplier = 1
            }

            scene.add(enemy)
            enemies.push(enemy)
        }
    }
}

function createSun() {
    const geometry = new THREE.SphereGeometry(120, 20, 20)
    const material = new THREE.MeshBasicMaterial({
        color: 0xfffff0
    })

    Sun = new THREE.Mesh(geometry, material)

    Sun.position.set(0, 0, -1100)
    scene.add(Sun)
}
createSun()

function createStars() {
    const starsGeometry = new THREE.BufferGeometry()
    const starsCount = 1000
    const positions = []
    for (let i = 0; i < starsCount; i++) {
        positions.push((Math.random() - 0.5) * 900)
        positions.push((Math.random() - 0.5) * 900)
        positions.push((Math.random() - 0.5) * 900)
    }
    starsGeometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
    const starsMaterial = new THREE.PointsMaterial({
        color: 0xffffff,
        size: 0.5,
        transparent: true
    })
    stars = new THREE.Points(starsGeometry, starsMaterial)
    scene.add(stars)
}
createStars()

function createEngineEffect() {
    for (let p of [player, player2]) {
        if (!p) continue

        const geo = new THREE.SphereGeometry(0.1)
        const mat = new THREE.MeshBasicMaterial({
            color: 0x00aaff,
            transparent: true,
            opacity: 0.2
        })

        const particle = new THREE.Mesh(geo, mat)

        particle.position.copy(p.position)
        particle.position.z += 0.3

        particle.velocity = new THREE.Vector3(
            (Math.random() - 0.5) * 0.02,
            (Math.random() - 0.5) * 0.02,
            0.2 + Math.random() * 0.1
        )

        scene.add(particle)
        engineParticles.push(particle)
    }
}

function addScore(points) {
    score += points
    scoreUI.innerText = "Score: " + score

    if (score > bestScoreValue) {
        bestScoreValue = score
        bestScore.innerText = "Best Score: " + bestScoreValue
        localStorage.setItem("bestScore", bestScoreValue)
    }
}

function spawnBackEnemy() {
    const geo = new THREE.BoxGeometry(0.7, 0.7, 0.7)
    const mat = new THREE.MeshStandardMaterial({ color: 0xffff00 })

    const enemy = new THREE.Mesh(geo, mat)

    const bounds = getBounds()
    enemy.position.x = (Math.random() * 2 - 1) * bounds.x
    enemy.position.y = (Math.random() * 2 - 1) * bounds.y
    enemy.position.z = -30

    enemy.type = "back"
    enemy.speedZ = 0.1

    scene.add(enemy)
    enemies.push(enemy)
}

function updateEnemies() {
    if (enemies.length === 0) return

    let moveDown = false

    for (let enemy of enemies) {
        enemy.position.x += enemySpeed * enemyDirection * (enemy.speedMultiplier || 1)

        const bounds = getBounds()

        if (enemy.position.x > bounds.x || enemy.position.x < -bounds.x) {
            moveDown = true
        }
        if (enemy.type === "back") {
            enemy.position.z += enemy.speedZ

            if (enemy.position.z > 5) {
                scene.remove(enemy)
                enemies.splice(enemies.indexOf(enemy), 1)
                continue
            }
        }
        if (moveDown) {
            enemyDirection *= -1
            for (let enemy of enemies) {
                enemy.position.y -= enemyStepDown
            }
        }
        if (Math.random() < 0.002) enemyShoot(enemy)

        if (checkCollision(enemy, player) || checkCollision(enemy, player2)) {
            handleGameOver()
        }
    }
    if (boss && (checkCollision(boss, player) || checkCollision(boss, player2))) {
        handleGameOver()
    }

}

function updateEngineEffect() {
    for (let i = engineParticles.length - 1; i >= 0; i--) {
        const p = engineParticles[i]

        p.position.add(p.velocity)
        p.scale.multiplyScalar(0.95)
        p.material.opacity *= 0.95

        if (p.material.opacity < 0.05) {
            scene.remove(p)
            engineParticles.splice(i, 1)
        }
    }
}

function updateGameModeUI() {
    const modeUI = document.getElementById("gameMode")
    if (!modeUI) return

    modeUI.innerText = "Mode " + gameMode.toUpperCase()
}

document.addEventListener('keydown', (e) => {
    keys[e.key] = true
    if (e.key === 'Enter' && !gameStarted) {
        gameStarted = true
        startScreen.style.display = "none"
        createEnemyGrid()
    }
    if (e.key === 'p') {
        paused = !paused
        pauseScreen.style.display = paused ? "block" : "none"
    }
    if (e.key === 'r' && gameOver) {
        restartGame()
    }
    if (e.key === '1') {
        gameMode = "runner"
        updateGameModeUI()
    }
    if (e.key === '2') {
        gameMode = "invader"
        updateGameModeUI()
    }
})

document.addEventListener('keyup', (e) => {
    keys[e.key] = false
})

document.addEventListener('mousedown', (e) => {
    if (!gameStarted || paused || gameOver) return

    if (e.button === 0) {
        shoot(player)
    }

    if (e.button === 2) {
        shoot(player2)
    }
})

window.addEventListener("contextmenu", (e) => e.preventDefault())

function getBounds() {
    const distance = camera.position.z
    const vFOV = (camera.fov * Math.PI) / 180
    const height = 2 * Math.tan(vFOV / 2) * distance
    const width = height * camera.aspect
    return { x: width / 2 - 0.5, y: height / 2 - 0.5 }
}

function movePlayer() {
    if (!player || !player2) return
    const playerSpeed = 0.1 * moveSpeedMultiplier * (effectTimers.speed > 0 ? 1.5 : 1)

    if (keys["a"]) {
        player.position.x -= playerSpeed
        playerRotateZ1 = -radius
    } else playerRotateZ1 = 0

    if (keys["d"]) {
        player.position.x += playerSpeed
        playerRotateZ = radius
    } else playerRotateZ = 0

    if (keys["w"]) {
        player.position.y += playerSpeed
        playerRotateX1 = radius
    } else playerRotateX1 = 0

    if (keys["s"]) {
        player.position.y -= playerSpeed
        playerRotateX = -radius
    } else playerRotateX = 0

    if (keys["ArrowLeft"]) {
        player2.position.x -= playerSpeed
        player2RotateZ1 = -radius
    } else player2RotateZ1 = 0

    if (keys["ArrowRight"]) {
        player2.position.x += playerSpeed
        player2RotateZ = radius
    } else player2RotateZ = 0

    if (keys["ArrowUp"]) {
        player2.position.y += playerSpeed
        player2RotateX1 = radius
    } else player2RotateX1 = 0

    if (keys["ArrowDown"]) {
        player2.position.y -= playerSpeed
        player2RotateX = -radius
    } else player2RotateX = 0

    const bounds = getBounds()
    player.position.x = Math.max(-bounds.x, Math.min(bounds.x, player.position.x))
    player.position.y = Math.max(-bounds.y, Math.min(bounds.y, player.position.y))
    player.rotation.z += (playerRotateZ - player.rotation.z) * angle
    player.rotation.x += (playerRotateX - player.rotation.x) * angle
    player.rotation.z += (playerRotateZ1 - player.rotation.z) * angle
    player.rotation.x += (playerRotateX1 - player.rotation.x) * angle

    player2.position.x = Math.max(-bounds.x, Math.min(bounds.x, player2.position.x))
    player2.position.y = Math.max(-bounds.y, Math.min(bounds.y, player2.position.y))
    player2.rotation.z += (player2RotateZ - player2.rotation.z) * angle
    player2.rotation.x += (player2RotateX - player2.rotation.x) * angle
    player2.rotation.z += (player2RotateZ1 - player2.rotation.z) * angle
    player2.rotation.x += (player2RotateX1 - player2.rotation.x) * angle
}

function spawnPowerUp() {
    const geo = new THREE.TorusGeometry(0, 0)
    const mat = new THREE.MeshStandardMaterial({
        transparent: true,
        opacity: 0
    })
    const p = new THREE.Mesh(geo, mat)
    const bounds = getBounds()
    p.position.x = (Math.random() * 2 - 1) * bounds.x
    p.position.y = (Math.random() * 2 - 1) * bounds.y
    p.position.z = -30
    p.type = ["shield", "slow", "double"][Math.floor(Math.random() * 3)]
    const spriteMat = new THREE.SpriteMaterial({ map: icons[p.type] })
    const sprite = new THREE.Sprite(spriteMat)
    sprite.material.depthTest = true
    sprite.scale.set(2, 2, 2)
    sprite.position.set(0, 0, 1.1)

    p.add(sprite)
    scene.add(p)
    powerUps.push(p)
}

function updatePowerUps() {
    for (let i = powerUps.length - 1; i >= 0; i--) {
        const p = powerUps[i]
        p.position.z += speed
        if (checkCollision(player, p) || checkCollision(player2, p)) {
            activatePowerUp(p.type)
            scene.remove(p)
            powerUps.splice(i, 1)
        }
        if (p.position.z > 5) {
            scene.remove(p)
            powerUps.splice(i, 1)
        }
        updateOpacity(p)
    }
}

function activatePowerUp(type) {
    activeEffects[type] = true
    effectTimers[type] = 5
    updateEffectsHUD()
    const interval = setInterval(() => {
        effectTimers[type] -= 0.1
        if (effectTimers[type] <= 0) {
            activeEffects[type] = false
            effectTimers[type] = 0
            clearInterval(interval)
            const index = effectIntervals.indexOf(interval)
            if (index > -1) effectIntervals.splice(index, 1)
        }
        updateEffectsHUD()
    }, 100)
    effectIntervals.push(interval)
}

function spawnObstacle() {
    const geo = new THREE.TorusGeometry(0, 0)
    const mat = new THREE.MeshStandardMaterial({
        transparent: true,
        opacity: 0
    })
    const o = new THREE.Mesh(geo, mat)
    const bounds = getBounds()
    o.position.x = (Math.random() * 2 - 1) * bounds.x
    o.position.y = (Math.random() * 2 - 1) * bounds.y
    o.position.z = -30
    o.type = ["invert", "speed", "shake"][Math.floor(Math.random() * 3)]
    const spriteMat = new THREE.SpriteMaterial({ map: icons[o.type] })
    const sprite = new THREE.Sprite(spriteMat)
    sprite.material.depthTest = true
    sprite.scale.set(2, 2, 2)
    sprite.position.set(0, 0, 1.1)

    o.add(sprite)
    scene.add(o)
    obstacles.push(o)
}

function updateObstacles() {
    for (let i = obstacles.length - 1; i >= 0; i--) {
        const o = obstacles[i]
        o.position.z += speed
        if (checkCollision(player, o) || checkCollision(player2, o)) {
            activatePowerDown(o.type)
            scene.remove(o)
            obstacles.splice(i, 1)
        }
        if (o.position.z > 5) {
            scene.remove(o)
            obstacles.splice(i, 1)
        }
        updateOpacity(o)
    }
}

function activatePowerDown(type) {
    if (type === "speed") {
        speedMultiplier = 1.5
        effectTimers.speed = 5
    }
    if (type === "shake") {
        shakeTime = 3
        effectTimers.shake = 3
    }
    if (type === "invert") {
        moveSpeedMultiplier = -1
        effectTimers.invert = 5
    }

    updateEffectsHUD()

    const interval = setInterval(() => {
        effectTimers[type] -= 0.1

        if (effectTimers[type] <= 0) {

            if (type === "speed") speedMultiplier = 0.5
            if (type === "invert") moveSpeedMultiplier = 0.8
            if (type === "shake") shakeTime = 0

            effectTimers[type] = 0
            clearInterval(interval)

            const index = effectIntervals.indexOf(interval)
            if (index > -1) effectIntervals.splice(index, 1)
        }

        updateEffectsHUD()
    }, 100)

    effectIntervals.push(interval)
}

function updateEffectsHUD() {
    const hud = document.getElementById('effectsHUD')
    let text = ""
    for (const [key, value] of Object.entries(effectTimers)) {
        if (value > 0) text += `${key.toUpperCase()}: ${value.toFixed(1)}s<br>`
    }
    hud.innerHTML = text
}

function spawnAsteroid() {
    const size = Math.random() * 0.5 + 0.4
    const geo = new THREE.DodecahedronGeometry(size)
    const mat = new THREE.MeshStandardMaterial({ color: 0x888888 })
    const asteroid = new THREE.Mesh(geo, mat)
    asteroid.nearMissed = false
    const bounds = getBounds()
    asteroid.position.x = (Math.random() * 2 - 1) * bounds.x
    asteroid.position.y = (Math.random() * 2 - 1) * bounds.y
    if (score >= 100 && score <= 200) asteroid.position.z = -30
    else if (score >= 200 && score <= 300) asteroid.position.z = -25
    else if (score >= 300 && score <= 400) asteroid.position.z = -20
    else if (score > 400) asteroid.position.z = -15
    else asteroid.position.z = -40
    scene.add(asteroid)
    asteroids.push(asteroid)
}

function spawnAsteroid2() {
    const size = Math.random() * 0.5 + 0.4
    const geo = new THREE.DodecahedronGeometry(size)
    const mat = new THREE.MeshStandardMaterial({ color: 0x575757 })
    const asteroid2 = new THREE.Mesh(geo, mat)
    asteroid2.nearMissed = false
    const bounds = getBounds()
    asteroid2.position.x = (Math.random() * 2 - 1) * bounds.x
    asteroid2.position.y = (Math.random() * 2 - 1) * bounds.y
    if (score >= 100 && score <= 200) asteroid2.position.z = -30
    else if (score >= 200 && score <= 300) asteroid2.position.z = -25
    else if (score >= 300 && score <= 400) asteroid2.position.z = -20
    else if (score > 400) asteroid2.position.z = -15
    else asteroid2.position.z = -40
    scene.add(asteroid2)
    asteroids2.push(asteroid2)
    asteroid2.velocity = new THREE.Vector3(0, 0, speed * 2)
    asteroid2.homingTime = Math.max(0.3, 1.5 - score * 0.005)
}

function shoot(playerObj) {
    if (!playerObj) return
    if (bullets.length >= MAX_BULLETS) return

    const geo = new THREE.SphereGeometry(0.1)
    const mat = new THREE.MeshBasicMaterial({ color: 0xff0000 })
    const bullet = new THREE.Mesh(geo, mat)
    bullet.position.copy(playerObj.position)
    bullet.position.z -= 0.5
    bullet.velocity = new THREE.Vector3(0, 0, -0.5)
    scene.add(bullet)
    bullets.push(bullet)
}

function checkNearMiss(player, asteroid) {
    const distance = player.position.distanceTo(asteroid.position)
    return distance < 2 && distance > 1
}

function createExplosion(position) {
    shakeTime = 0.3
    for (let i = 0; i < 20; i++) {
        const geo = new THREE.SphereGeometry(1)
        const mat = new THREE.MeshBasicMaterial({ color: 0xffaa00 })
        const p = new THREE.Mesh(geo, mat)
        p.position.copy(position)
        p.velocity = new THREE.Vector3(
            (Math.random() - 0.5) * 1,
            (Math.random() - 0.5) * 1,
            (Math.random() - 0.5) * 1
        )
        scene.add(p)
        particles.push(p)
    }
}

function applyScreenShake() {
    if (shakeTime > 0) {
        shakeTime -= 0.016
        camera.position.x = (Math.random() - 0.5) * 0.2
        camera.position.y = (Math.random() - 0.5) * 0.2
    } else {
        camera.position.x = 0
        camera.position.y = 0
    }
}

function checkCollision(player, asteroid) {
    const distance = player.position.distanceTo(asteroid.position)
    const playerRadius = 0.5
    const asteroidRadius = asteroid.geometry.parameters.radius || 0.5
    return distance < (playerRadius + asteroidRadius)
}

function checkAsteroidCollisions() {
    for (let i = asteroids.length - 1; i >= 0; i--) {
        for (let j = asteroids2.length - 1; j >= 0; j--) {
            const a1 = asteroids[i]
            const a2 = asteroids2[j]

            if (checkCollision(a1, a2)) {
                createExplosion(a1.position)

                scene.remove(a1)
                scene.remove(a2)

                asteroids.splice(i, 1)
                asteroids2.splice(j, 1)

                break
            }
        }
    }
}

function checkBulletEnemyCollisions() {
    for (let i = bullets.length - 1; i >= 0; i--) {
        for (let j = enemies.length - 1; j >= 0; j--) {
            const b = bullets[i]
            const e = enemies[j]

            if (checkCollision(b, e)) {
                scene.remove(b)
                scene.remove(e)

                bullets.splice(i, 1)
                enemies.splice(j, 1)

                addScore(10)
                scoreUI.innerText = "Score: " + score

                break
            }
        }
        if (boss && checkCollision(b, boss)) {
            scene.remove(b)
            bullets.splice(i, 1)

            bossHP--

            if (bossHP <= 0) {
                scene.remove(boss)
                boss = null
                addScore(100)
            }
            break
        }
    }
}

function updateOpacity(object) {
    const distance = camera.position.z - object.position.z

    let opacity = 1

    if (distance < 20) {
        opacity = distance / 10
        opacity = Math.max(0.2, opacity)
    }

    object.material.transparent = true
    object.material.opacity = opacity
}

function updateAsteroid() {
    for (let i = asteroids.length - 1; i >= 0; i--) {
        const a = asteroids[i]
        a.position.z += speed
        a.rotation.x += 0.001
        a.rotation.y += 0.002

        if (checkCollision(player, a)) {
            if (activeEffects.shield) {
                scene.remove(a)
                asteroids.splice(i, 1)
                continue
            }
            createExplosion(player.position)
            handleGameOver()
        }

        if (checkCollision(player2, a)) {
            if (activeEffects.shield) {
                scene.remove(a)
                asteroids.splice(i, 1)
                continue
            }
            createExplosion(player2.position)
            handleGameOver()
        }

        if (!a.nearMissed && checkNearMiss(player, a)) {
            score += 3
            a.nearMissed = true
            createExplosion(a.position)
            scoreUI.innerText = "Score: " + score
            if (score > bestScoreValue) {
                bestScoreValue = score
                bestScore.innerText = "Best Score: " + bestScoreValue
                localStorage.setItem("bestScore", bestScoreValue)
            }
        }

        if (a.position.z > 5) {
            scene.remove(a)
            asteroids.splice(i, 1)
            score += activeEffects.double ? 2 : 1
            scoreUI.innerText = "Score: " + score
            if (score > bestScoreValue) {
                bestScoreValue = score
                bestScore.innerText = "Best Score: " + bestScoreValue
                localStorage.setItem("bestScore", bestScoreValue)
            }
        }
        updateOpacity(a)
    }
}

function updateAsteroid2() {
    for (let i = asteroids2.length - 1; i >= 0; i--) {
        const a2 = asteroids2[i]
        if (a2.homingTime > 0) {
            const direction = new THREE.Vector3()
            direction.subVectors(player.position, a2.position).normalize()

            a2.velocity.lerp(direction.multiplyScalar(speed * 2), 0.05)

            a2.homingTime -= 0.016
        }

        a2.position.add(a2.velocity)
        a2.rotation.x += 0.5
        a2.rotation.y += 0.3

        if (checkCollision(player, a2)) {
            if (activeEffects.shield) {
                scene.remove(a2)
                asteroids2.splice(i, 1)
                continue
            }
            createExplosion(player.position)
            handleGameOver()
        }
        if (checkCollision(player2, a2)) {
            if (activeEffects.shield) {
                scene.remove(a2)
                asteroids2.splice(i, 1)
                continue
            }
            createExplosion(player2.position)
            handleGameOver()
        }

        if (!a2.nearMissed && checkNearMiss(player, a2)) {
            score += 3
            a2.nearMissed = true
            createExplosion(a2.position)
            scoreUI.innerText = "Score: " + score
            if (score > bestScoreValue) {
                bestScoreValue = score
                bestScore.innerText = "Best Score: " + bestScoreValue
                localStorage.setItem("bestScore", bestScoreValue)
            }
        }

        if (a2.position.z > 5) {
            scene.remove(a2)
            asteroids2.splice(i, 1)
            score += activeEffects.double ? 2 : 1
            scoreUI.innerText = "Score: " + score
            if (score > bestScoreValue) {
                bestScoreValue = score
                bestScore.innerText = "Best Score: " + bestScoreValue
                localStorage.setItem("bestScore", bestScoreValue)
            }
        }
        updateOpacity(a2)
    }
}

function updateBullets() {
    for (let i = bullets.length - 1; i >= 0; i--) {
        const b = bullets[i]
        b.position.add(b.velocity)

        if (b.position.z < -50) {
            scene.remove(b)
            bullets.splice(i, 1)
        }
    }
}

function handleGameOver() {
    gameOver = true
    gameOverUI.style.display = "block"

    gameOverUI.innerHTML = `
        <h1>GAME OVER</h1>
        <p>Score: ${score}</p>
        <p>Best: ${bestScoreValue}</p>
        <p>Press R to restart</p>
    `

    for (const key in activeEffects) activeEffects[key] = false
    for (const key in effectTimers) effectTimers[key] = 0
    updateEffectsHUD()

    moveSpeedMultiplier = 0.8
    speedMultiplier = 0.5
    shakeTime = 0

    camera.position.set(0, 0, camera.position.z)
    if (player) {
        player.rotation.set(0, 600, 0)
    }
}

function updateParticles() {
    for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i]
        p.position.add(p.velocity)
        p.scale.multiplyScalar(0.95)
        if (p.scale.x < 0.01) {
            scene.remove(p)
            particles.splice(i, 1)
        }
    }
}

function updateDifficulty() {
    speed = (0.05 + (score / 2) * 0.002) * (activeEffects.slow ? 0.5 : 1) * speedMultiplier
}

function updateFPS() {
    const now = performance.now()
    frames++
    if (now - lastTime >= 1000) {
        fps = frames
        frames = 0
        lastTime = now
        fpsUI.innerText = "FPS: " + fps
    }
}

function updateStars() {
    const positions = stars.geometry.attributes.position.array
    for (let i = 2; i < positions.length; i += 3) {
        positions[i] += speed * 5
        if (positions[i] > 5) positions[i] = -200
    }
    stars.geometry.attributes.position.needsUpdate = true
}

function animate() {
    requestAnimationFrame(animate)
    if (gameStarted && !paused && !gameOver && player) {
        movePlayer()
        if (gameMode === "runner") {
            if (Math.random() < 0.02) spawnAsteroid()
            if (Math.random() < 0.005) spawnAsteroid2()
            if (Math.random() < 0.0009) spawnPowerUp()
            if (Math.random() < 0.0009) spawnObstacle()

            updateAsteroid()
            updateAsteroid2()
            updatePowerUps()
            updateObstacles()
            checkAsteroidCollisions()
        }
        if (gameMode === "invader") {
            if (Math.random() < 0.005) spawnBackEnemy()
            updateEnemies()
            checkBulletEnemyCollisions()
        }
        if (gameMode == "invader" && score > 200 && !boss) {
            spawnBoss()
        }
        updateBullets()
        updateDifficulty()
        updateParticles()
        updateLevel()
        updateEnemyBullets()
    }
    if (stars) updateStars()
    applyScreenShake()
    if (audio.paused) {
        audio.loop = true
        audio.play()
    }
    updateFPS()
    createEngineEffect()
    updateEngineEffect()
    renderer.render(scene, camera)
}
animate()

function restartGame() {
    gameOver = false
    score = 0
    scoreUI.innerText = "Score: 0"
    gameOverUI.style.display = "none"

    asteroids.forEach(a => scene.remove(a))
    asteroids = []

    asteroids2.forEach(a2 => scene.remove(a2))
    asteroids2 = []

    particles.forEach(p => scene.remove(p))
    particles = []

    powerUps.forEach(p => scene.remove(p))
    powerUps = []

    obstacles.forEach(o => scene.remove(o))
    obstacles = []

    effectIntervals.forEach(i => clearInterval(i))
    effectIntervals = []

    enemies.forEach(e => scene.remove(e))
    enemies = []

    enemyBullets.forEach(b => scene.remove(b))
    enemyBullets = []

    for (const key in activeEffects) activeEffects[key] = false
    for (const key in effectTimers) effectTimers[key] = 0
    updateEffectsHUD()
    updateGameModeUI()

    moveSpeedMultiplier = 0.8
    speedMultiplier = 0.5
    shakeTime = 0
    camera.position.set(0, 0, camera.position.z)

    boss = null
    bossHP = 20

    player.position.set(-1, 0, 0)
    player.rotation.set(0, 600, 0)

    player2.position.set(1, 0, 0)
    player2.rotation.set(0, 600, 0)
}

window.addEventListener("resize", () => {
    camera.aspect = window.innerWidth / window.innerHeight
    camera.updateProjectionMatrix()
    renderer.setSize(window.innerWidth, window.innerHeight)
})
