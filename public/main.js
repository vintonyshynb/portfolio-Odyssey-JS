import * as THREE from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'

let scene, camera, renderer
let player
let shakeTime = 0
let stars
let radius = 0.3
let angle = 0.1

let playerRotateZ = 0
let playerRotateX = 0
let playerRotateZ1 = 0
let playerRotateX1 = 0

let asteroids = []
let particles = []
let powerUps = []

let score = 0
let gameOver = false
let speed = 0.05

// BUFFY
let shieldActive = false
let shieldTime = 0

let slowMotionActive = false
let slowMotionTime = 0

const audio = new Audio('starwars.mp3')
const keys = {}
const scoreUI = document.getElementById('score')
const gameOverUI = document.getElementById('gameOver')
const fpsUI = document.getElementById('fps')

let lastTime = performance.now()
let frames = 0
let fps = 0

scene = new THREE.Scene()
camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000)
camera.position.z = 5

renderer = new THREE.WebGLRenderer()
renderer.setSize(window.innerWidth, window.innerHeight)
document.body.appendChild(renderer.domElement)

scene.add(new THREE.AmbientLight(0xffffff, 0.5))

const light = new THREE.PointLight(0xffffff, 1)
light.position.set(5, 5, 5)
scene.add(light)

const loader = new GLTFLoader()

loader.load('/spaceship.glb', (gltf) => {
    player = gltf.scene
    scene.add(player)
    player.scale.set(0.2, 0.2, 0.2)
})

function createStars() {
    const geo = new THREE.BufferGeometry()
    const count = 1000
    const pos = []

    for (let i = 0; i < count; i++) {
        pos.push((Math.random() - 0.5) * 900)
        pos.push((Math.random() - 0.5) * 900)
        pos.push((Math.random() - 0.5) * 900)
    }

    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))

    stars = new THREE.Points(geo, new THREE.PointsMaterial({ size: 0.5 }))
    scene.add(stars)
}
createStars()

document.addEventListener('keydown', e => {
    keys[e.key] = true
    if (e.key === 'r' && gameOver) restartGame()
})

document.addEventListener('keyup', e => keys[e.key] = false)

function getBounds() {
    const d = camera.position.z
    const h = 2 * Math.tan((camera.fov * Math.PI) / 180 / 2) * d
    return { x: (h * camera.aspect) / 2 - 0.5, y: h / 2 - 0.5 }
}

function movePlayer() {
    const s = 0.1

    if (keys["a"]) { player.position.x -= s; playerRotateZ1 = -radius } else playerRotateZ1 = 0
    if (keys["d"]) { player.position.x += s; playerRotateZ = radius } else playerRotateZ = 0
    if (keys["w"]) { player.position.y += s; playerRotateX1 = radius } else playerRotateX1 = 0
    if (keys["s"]) { player.position.y -= s; playerRotateX = -radius } else playerRotateX = 0

    const b = getBounds()
    player.position.x = Math.max(-b.x, Math.min(b.x, player.position.x))
    player.position.y = Math.max(-b.y, Math.min(b.y, player.position.y))

    player.rotation.z += (playerRotateZ + playerRotateZ1 - player.rotation.z) * angle
    player.rotation.x += (playerRotateX + playerRotateX1 - player.rotation.x) * angle
}

function spawnAsteroid() {
    const geo = new THREE.DodecahedronGeometry(Math.random() * 0.5 + 0.3)
    const mat = new THREE.MeshStandardMaterial({ color: 0x888888 })

    const a = new THREE.Mesh(geo, mat)
    a.nearMissed = false

    const b = getBounds()
    a.position.set((Math.random()*2-1)*b.x, (Math.random()*2-1)*b.y, -40)

    scene.add(a)
    asteroids.push(a)
}

function spawnPowerUp() {
    const geo = new THREE.IcosahedronGeometry(0.4)
    const mat = new THREE.MeshStandardMaterial({ color: 0x00ffcc })

    const p = new THREE.Mesh(geo, mat)
    const b = getBounds()

    p.position.set((Math.random()*2-1)*b.x, (Math.random()*2-1)*b.y, -40)
    p.type = Math.random() < 0.5 ? "shield" : "slow"

    scene.add(p)
    powerUps.push(p)
}

function checkCollision(a, b) {
    return a.position.distanceTo(b.position) < 1
}

function updateAsteroids() {
    for (let i = asteroids.length - 1; i >= 0; i--) {
        const a = asteroids[i]
        a.position.z += speed

        if (checkCollision(player, a)) {
            if (!shieldActive) {
                gameOver = true
                gameOverUI.style.display = "block"
            } else {
                scene.remove(a)
                asteroids.splice(i, 1)
                score += 2
            }
        }

        if (a.position.z > 5) {
            scene.remove(a)
            asteroids.splice(i, 1)
            score++
        }
    }
    scoreUI.innerText = "Score: " + score
}

function updatePowerUps() {
    for (let i = powerUps.length - 1; i >= 0; i--) {
        const p = powerUps[i]
        p.position.z += speed

        if (checkCollision(player, p)) {
            if (p.type === "shield") {
                shieldActive = true
                shieldTime = 5
            }
            if (p.type === "slow") {
                slowMotionActive = true
                slowMotionTime = 5
            }

            scene.remove(p)
            powerUps.splice(i, 1)
        }
    }
}

function updateBuffs() {
    if (shieldActive && (shieldTime -= 0.016) <= 0) shieldActive = false
    if (slowMotionActive && (slowMotionTime -= 0.016) <= 0) slowMotionActive = false
}

function updateDifficulty() {
    let base = 0.05 + score * 0.002
    speed = slowMotionActive ? base * 0.3 : base
}

function animate() {
    requestAnimationFrame(animate)

    if (!gameOver && player) {
        movePlayer()

        if (Math.random() < 0.03) spawnAsteroid()
        if (Math.random() < 0.005) spawnPowerUp()

        updateAsteroids()
        updatePowerUps()
        updateBuffs()
        updateDifficulty()
    }

    if (!audio.playing) {
        audio.loop = true
        audio.play()
    }

    renderer.render(scene, camera)
}
animate()

function restartGame() {
    gameOver = false
    score = 0
    scoreUI.innerText = "Score: 0"
    gameOverUI.style.display = "none"

    asteroids.forEach(a => scene.remove(a))
    powerUps.forEach(p => scene.remove(p))

    asteroids = []
    powerUps = []

    shieldActive = false
    slowMotionActive = false

    player.position.set(0,0,0)
}