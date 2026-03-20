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
let asteroids2 = []
let particles = []

let trail
let trailPositions = []
const trailLength = 50

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

const ambientLight = new THREE.AmbientLight(0xffffff, 0.3)
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

function createTrail() {
    const geometry = new THREE.BufferGeometry()
    const positions = new Float32Array(trailLength * 3)

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))

    const material = new THREE.LineBasicMaterial({
        color: 0x00ffff,
        transparent: true,
        opacity: 0.6
    })

    trail = new THREE.Line(geometry, material)
    scene.add(trail)

    for (let i = 0; i < trailLength; i++) {
        trailPositions.push(new THREE.Vector3(0, 0, 0))
    }
}
createTrail()

function updateTrail() {
    if (!player) return

    trailPositions.pop()
    trailPositions.unshift(player.position.clone())

    const positions = trail.geometry.attributes.position.array

    for (let i = 0; i < trailLength; i++) {
        positions[i * 3] = trailPositions[i].x
        positions[i * 3 + 1] = trailPositions[i].y
        positions[i * 3 + 2] = trailPositions[i].z
    }

    trail.geometry.attributes.position.needsUpdate = true
}

function createEngineEffect() {
    if (!player) return

    const geo = new THREE.SphereGeometry(0.1)
    const mat = new THREE.MeshBasicMaterial({
        color: 0x00aaff,
        transparent: true,
        opacity: 0.2
    })

    const particle = new THREE.Mesh(geo, mat)

    particle.position.copy(player.position)
    particle.position.z += 0.3

    particle.velocity = new THREE.Vector3(
        (Math.random() - 0.5) * 0.02,
        (Math.random() - 0.5) * 0.02,
        0.2 + Math.random() * 0.1
    )

    scene.add(particle)
    engineParticles.push(particle)
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
    const geo = new THREE.TorusGeometry(0.5, 0.5)
    const mat = new THREE.MeshStandardMaterial({ color: 0x00ff00 })
    const p = new THREE.Mesh(geo, mat)
    const bounds = getBounds()
    p.position.x = (Math.random() * 2 - 1) * bounds.x
    p.position.y = (Math.random() * 2 - 1) * bounds.y
    p.position.z = -30
    p.type = ["shield", "slow", "double"][Math.floor(Math.random() * 3)]
    const spriteMat = new THREE.SpriteMaterial({ map: icons[p.type] })
    const sprite = new THREE.Sprite(spriteMat)
    sprite.material.depthTest = false
    sprite.scale.set(1, 1, 1)
    sprite.position.set(0, 1, 0)

    p.add(sprite)
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
    const geo = new THREE.TorusGeometry(0.5, 0.5)
    const mat = new THREE.MeshStandardMaterial({ color: 0xff0000 })
    const o = new THREE.Mesh(geo, mat)
    const bounds = getBounds()
    o.position.x = (Math.random() * 2 - 1) * bounds.x
    o.position.y = (Math.random() * 2 - 1) * bounds.y
    o.position.z = -30
    o.type = ["invert", "speed", "shake"][Math.floor(Math.random() * 3)]
    const spriteMat = new THREE.SpriteMaterial({ map: icons[o.type] })
    const sprite = new THREE.Sprite(spriteMat)
    sprite.material.depthTest = false
    sprite.scale.set(1, 1, 1)
    sprite.position.set(0, 1, 0)

    o.add(sprite)
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

function handleGameOver() {
    gameOver = true
    gameOverUI.style.display = "block"

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
        if (Math.random() < 0.02) spawnAsteroid()
        if (Math.random() < 0.005) spawnAsteroid2()
        if (Math.random() < 0.0009) spawnPowerUp()
        if (Math.random() < 0.0009) spawnObstacle()
        updateAsteroid()
        updateAsteroid2()
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
    updateTrail()
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

    for (const key in activeEffects) activeEffects[key] = false
    for (const key in effectTimers) effectTimers[key] = 0
    updateEffectsHUD()

    moveSpeedMultiplier = 0.8
    speedMultiplier = 0.5
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
