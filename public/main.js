import * as THREE from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

let scene, camera, renderer
let player
let shakeTime = 0
let stars

let asteroids = []
let particles = []

let score = 0
let gameOver = false
let speed = 0.05

const audio = new Audio('explosion.mp3')
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

const ambientLight = new THREE.AmbientLight(0xffffff, 0.5)
scene.add(ambientLight)

const pointLight = new THREE.PointLight(0xffffff, 1)
pointLight.position.set(5, 5, 5)
scene.add(pointLight)

const loader = new GLTFLoader();

loader.load('/spaceship.glb', (gltf) => {
    player = gltf.scene;
    scene.add(player);
    player.scale.set(0.2, 0.2, 0.2);
    player.position.set(0, 0, 0);
    player.rotation.set(0, 600, 0)
});

function createStars() {
    const starsGeometry = new THREE.BufferGeometry()
    const starsCount = 1000
    const positions = []

    for (let i = 0; i < starsCount; i++) {
        positions.push((Math.random() - 0.5) * 900)
        positions.push((Math.random() - 0.5) * 900)
        positions.push((Math.random() - 0.5) * 900)
    }

    starsGeometry.setAttribute(
        'position',
        new THREE.Float32BufferAttribute(positions, 3)
    )

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

    return {
        x: width / 2 - 0.5,
        y: height / 2 - 0.5
    }
}

function movePlayer() {
    const moveSpeed = 0.1

    if (keys["ArrowLeft"] || keys["a"])
        player.position.x -= moveSpeed

    if (keys["ArrowRight"] || keys["d"])
        player.position.x += moveSpeed

    if (keys["ArrowUp"] || keys["w"])
        player.position.y += moveSpeed

    if (keys["ArrowDown"] || keys["s"])
        player.position.y -= moveSpeed

    const bounds = getBounds()

    player.position.x = Math.max(-bounds.x, Math.min(bounds.x, player.position.x))
    player.position.y = Math.max(-bounds.y, Math.min(bounds.y, player.position.y))
}

function spawnAsteroid() {
    const size = Math.random() * 0.5 + 0.3
    const geo = new THREE.DodecahedronGeometry(size)
    const mat = new THREE.MeshStandardMaterial({ color: 0x888888 })

    const asteroid = new THREE.Mesh(geo, mat)

    const bounds = getBounds()

    asteroid.position.x = (Math.random() * 2 - 1) * bounds.x
    asteroid.position.y = (Math.random() * 2 - 1) * bounds.y
    asteroid.position.z = -20

    scene.add(asteroid)
    asteroids.push(asteroid)
}

function createExplosion(position) {
    shakeTime = 0.3
    for (let i = 0; i < 20; i++) {
        const geo = new THREE.SphereGeometry(1)
        const mat = new THREE.MeshBasicMaterial({ color: 0xffaa00 })

        const p = new THREE.Mesh(geo, mat)
        p.position.copy(position)

        p.velocity = new THREE.Vector3(
            (Math.random() - 1) * 1,
            (Math.random() - 1) * 1,
            (Math.random() - 1) * 1
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

function checkCollision(a, b) {
    const box1 = new THREE.Box3().setFromObject(a)
    const box2 = new THREE.Box3().setFromObject(b)

    return box1.intersectsBox(box2)
}

function updateAsteroid() {
    for (let i = asteroids.length - 1; i >= 0; i--) {
        const a = asteroids[i]

        a.position.z += speed
        a.rotation.x += 0.01
        a.rotation.y += 0.01

        if (checkCollision(player, a)) {
            createExplosion(player.position)
            gameOver = true
            gameOverUI.style.display = "block"
        }

        if (a.position.z > 5) {
            scene.remove(a)
            asteroids.splice(i, 1)

            score++
            scoreUI.innerText = "Score: " + score
        }
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
    speed = 0.05 + score * 0.002
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

        if (positions[i] > 5) {
            positions[i] = -200
        }
    }
    stars.geometry.attributes.position.needsUpdate = true
}

function animate() {
    requestAnimationFrame(animate)

    if (!gameOver) {
        movePlayer()

        if (Math.random() < 0.02) {
            spawnAsteroid()
        }

        updateAsteroid()
        updateDifficulty()
        updateParticles()
    }
    if (stars) updateStars()

    applyScreenShake()

    audio.play()

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

    player.position.set(0, 0, 0)
}

window.addEventListener("resize", () => {
    camera.aspect = window.innerWidth / window.innerHeight
    camera.updateProjectionMatrix()

    renderer.setSize(window.innerWidth, window.innerHeight)
})