import * as THREE from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'

let scene, camera, renderer
let player
let shakeTime = 0
let stars
let radius = 0.3
let angle = 0.1

let powerUps = []
let obstacles = []
let asteroids = []
let particles = []

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

let moveSpeedMultiplier = 1
let speedMultiplier = 1
let speed = 0.05
let score = 0

let playerRotateZ = 0
let playerRotateX = 0
let playerRotateZ1 = 0
let playerRotateX1 = 0

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

const ambientLight = new THREE.AmbientLight(0xffffff, 0.5)
scene.add(ambientLight)

const pointLight = new THREE.PointLight(0xffffff, 1)
pointLight.position.set(5, 5, 5)
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
    player.position.set(0, 0, 0)
    player.rotation.set(0, 600, 0)
})

function createStars() {
    const starsGeometry = new THREE.BufferGeometry()
    const starsCount = 1000
    const positions = []
    for (let i = 0; i < starsCount; i++) {
        positions.push((Math.random() - 0.5) * 900)
        positions.push((Math.random() - 0.5) * 900)
        positions.push((Math.random() - 0.5) * 900)
    }
    starsGeometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 4))
    const starsMaterial = new THREE.PointsMaterial({
        color: 0xffffff,
        size: 0.5,
        transparent: true
    })
    stars = new THREE.Points(starsGeometry, starsMaterial)
    scene.add(stars)
}
createStars()

document.addEventListener('keydown', (e) => {
    keys[e.key] = true
    if (e.key === 'Enter' && !gameStarted) {
        gameStarted = true
        startScreen.style.display = "none"
    }
    if (e.key === 'p') {
        paused = !paused
        pauseScreen.style.display = paused ? "block" : "none"
    }
    if (e.key === 'r' && gameOver) {
        restartGame()
    }
})

document.addEventListener('keyup', (e) => {
    keys[e.key] = false
})

function getBounds() {
    const distance = camera.position.z
    const vFOV = (camera.fov * Math.PI) / 180
    const height = 2 * Math.tan(vFOV / 2) * distance
    const width = height * camera.aspect
    return { x: width / 2 - 0.5, y: height / 2 - 0.5 }
}

function movePlayer() {
    const playerSpeed = 0.1 * moveSpeedMultiplier * (effectTimers.speed > 0 ? 1.5 : 1)
    if (keys["ArrowLeft"] || keys["a"]) {
        player.position.x -= playerSpeed
        playerRotateZ1 = -radius
    } else playerRotateZ1 = 0
    if (keys["ArrowRight"] || keys["d"]) {
        player.position.x += playerSpeed
        playerRotateZ = radius
    } else playerRotateZ = 0
    if (keys["ArrowUp"] || keys["w"]) {
        player.position.y += playerSpeed
        playerRotateX1 = radius
    } else playerRotateX1 = 0
    if (keys["ArrowDown"] || keys["s"]) {
        player.position.y -= playerSpeed
        playerRotateX = -radius
    } else playerRotateX = 0
    const bounds = getBounds()
    player.position.x = Math.max(-bounds.x, Math.min(bounds.x, player.position.x))
    player.position.y = Math.max(-bounds.y, Math.min(bounds.y, player.position.y))
    player.rotation.z += (playerRotateZ - player.rotation.z) * angle
    player.rotation.x += (playerRotateX - player.rotation.x) * angle
    player.rotation.z += (playerRotateZ1 - player.rotation.z) * angle
    player.rotation.x += (playerRotateX1 - player.rotation.x) * angle
}

function spawnPowerUp() {
    const geo = new THREE.BoxGeometry(0.5, 0.5, 0.5)
    const mat = new THREE.MeshStandardMaterial({ color: 0x00ff00 })
    const p = new THREE.Mesh(geo, mat)
    const bounds = getBounds()
    p.position.x = (Math.random() * 2 - 1) * bounds.x
    p.position.y = (Math.random() * 2 - 1) * bounds.y
    p.position.z = -30
    p.type = ["shield", "slow", "double"][Math.floor(Math.random() * 3)]
    scene.add(p)
    powerUps.push(p)
}

function updatePowerUps() {
    for (let i = powerUps.length - 1; i >= 0; i--) {
        const p = powerUps[i]
        p.position.z += speed
        if (checkCollision(player, p)) {
            activatePowerUp(p.type)
            scene.remove(p)
            powerUps.splice(i, 1)
        }
        if (p.position.z > 5) {
            scene.remove(p)
            powerUps.splice(i, 1)
        }
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
    const geo = new THREE.TorusGeometry(0.5, 0.2)
    const mat = new THREE.MeshStandardMaterial({ color: 0xff0000 })
    const o = new THREE.Mesh(geo, mat)
    const bounds = getBounds()
    o.position.x = (Math.random() * 2 - 1) * bounds.x
    o.position.y = (Math.random() * 2 - 1) * bounds.y
    o.position.z = -30
    o.type = ["invert", "speed", "shake"][Math.floor(Math.random() * 3)]
    scene.add(o)
    obstacles.push(o)
}

function updateObstacles() {
    for (let i = obstacles.length - 1; i >= 0; i--) {
        const o = obstacles[i]
        o.position.z += speed
        if (checkCollision(player, o)) {
            activatePowerDown(o.type)
            scene.remove(o)
            obstacles.splice(i, 1)
        }
        if (o.position.z > 5) {
            scene.remove(o)
            obstacles.splice(i, 1)
        }
    }
}

function activatePowerDown(type) {
    if (type === "speed") {
        speedMultiplier = 2
        effectTimers.speed = 5
    }
    if (type === "shake") {
        shakeTime = 1
        effectTimers.shake = 1
    }
    if (type === "invert") {
        moveSpeedMultiplier = -1
        effectTimers.invert = 5
    }
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

function updateEffectsHUD() {
    const hud = document.getElementById('effectsHUD')
    let text = ""
    for (const [key, value] of Object.entries(effectTimers)) {
        if (value > 0) text += `${key.toUpperCase()}: ${value.toFixed(1)}s<br>`
    }
    hud.innerHTML = text
}

function spawnAsteroid() {
    const size = Math.random() * 0.5 + 0.3
    const geo = new THREE.DodecahedronGeometry(size)
    const mat = new THREE.MeshStandardMaterial({ color: 0x888888 })
    const asteroid = new THREE.Mesh(geo, mat)
    asteroid.nearMissed = false
    const bounds = getBounds()
    asteroid.position.x = (Math.random() * 2 - 1) * bounds.x
    asteroid.position.y = (Math.random() * 2 - 1) * bounds.y
    if (score >= 100 && score <= 200) asteroid.position.z = -30
    else if (score >= 200 && score <= 300) asteroid.position.z = -20
    else if (score >= 300 && score <= 400) asteroid.position.z = -10
    else if (score > 400) asteroid.position.z = -5
    else asteroid.position.z = -40
    scene.add(asteroid)
    asteroids.push(asteroid)
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

function updateAsteroid() {
    for (let i = asteroids.length - 1; i >= 0; i--) {
        const a = asteroids[i]
        a.position.z += speed
        a.rotation.x += 0.01
        a.rotation.y += 0.01

        if (checkCollision(player, a)) {
            if (activeEffects.shield) {
                scene.remove(a)
                asteroids.splice(i, 1)
                continue
            }
            createExplosion(player.position)
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
    }
}

function handleGameOver() {
    gameOver = true
    gameOverUI.style.display = "block"

    powerUps.forEach(p => scene.remove(p))
    powerUps = []

    obstacles.forEach(o => scene.remove(o))
    obstacles = []

    asteroids.forEach(a => scene.remove(a))
    asteroids = []

    particles.forEach(p => scene.remove(p))
    particles = []

    effectIntervals.forEach(i => clearInterval(i))
    effectIntervals = []

    for (const key in activeEffects) activeEffects[key] = false
    for (const key in effectTimers) effectTimers[key] = 0
    updateEffectsHUD()

    moveSpeedMultiplier = 1
    speedMultiplier = 1
    shakeTime = 0

    camera.position.set(0, 0, camera.position.z)
    if (player) {
        player.position.set(0, 0, 0)
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
    speed = (0.05 + score * 0.002) * (activeEffects.slow ? 0.5 : 1) * speedMultiplier
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
        if (Math.random() < 0.03) spawnAsteroid()
        if (Math.random() < 0.01) spawnPowerUp()
        if (Math.random() < 0.01) spawnObstacle()
        updateAsteroid()
        updateDifficulty()
        updateParticles()
        updatePowerUps()
        updateObstacles()
    }
    if (stars) updateStars()
    applyScreenShake()
    if (audio.paused) {
        audio.loop = true
        audio.play()
    }
    updateFPS()
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

    particles.forEach(p => scene.remove(p))
    particles = []

    powerUps.forEach(p => scene.remove(p))
    powerUps = []

    obstacles.forEach(o => scene.remove(o))
    obstacles = []

    effectIntervals.forEach(i => clearInterval(i))
    effectIntervals = []

    for (const key in activeEffects) activeEffects[key] = false
    for (const key in effectTimers) effectTimers[key] = 0
    updateEffectsHUD()

    moveSpeedMultiplier = 1
    speedMultiplier = 1
    shakeTime = 0
    camera.position.set(0, 0, camera.position.z)

    player.position.set(0, 0, 0)
    player.rotation.set(0, 600, 0)
}

window.addEventListener("resize", () => {
    camera.aspect = window.innerWidth / window.innerHeight
    camera.updateProjectionMatrix()
    renderer.setSize(window.innerWidth, window.innerHeight)
})
