import './style.css'
import * as dat from 'lil-gui'
import * as THREE from 'three'
import gsap from 'gsap'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader'
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader'
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer'
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass'
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass'
import { OutlinePass } from 'three/examples/jsm/postprocessing/OutlinePass'
import { FXAAShader } from 'three/examples/jsm/shaders/FXAAShader'
import { PointerLockControls } from './PointerLockControlsMobile'


// /**
//  * Spector JS
//  */
// const SPECTOR = require('spectorjs')
// const spector = new SPECTOR.Spector()
// spector.displayUI()

/**
 * Base
 */
// Debug
const gui = new dat.GUI({
    width: 400
})
const debugObject = {
    envMapIntensity: 2.5,
    edgeStrength: 1.5,
    edgeGlow: 1,
    edgeThickness: 1.8,
    pulsePeriod: 5,
}

// Canvas
const canvas = document.querySelector('canvas.webgl')

// Scene
const scene = new THREE.Scene()

// Pictures
const picturesPosNorm = new Set()

// Mouse
const pointer = new THREE.Vector2()
const raycaster = new THREE.Raycaster()
let isMoved = false

/**
 * Update all materials
 */
 const updateAllMaterials = () =>
 {
     scene.traverse((child) =>
     {
         if(child instanceof THREE.Mesh && child.material instanceof THREE.MeshStandardMaterial)
         {
             // child.material.envMap = environmentMap
             child.material.envMapIntensity = debugObject.envMapIntensity
             child.material.needsUpdate = true
             child.castShadow = true
             child.receiveShadow = true
         }
     })
 }

/**
 * Loaders
 */
// Texture loader
const textureLoader = new THREE.TextureLoader()

//Cube texture loader
const cubeTextureLoader = new THREE.CubeTextureLoader()

// Draco loader
const dracoLoader = new DRACOLoader()
dracoLoader.setDecoderPath('draco/')

// GLTF loader
const gltfLoader = new GLTFLoader()
gltfLoader.setDRACOLoader(dracoLoader)

/**
 * Textures
 */
const environmentMap = cubeTextureLoader.load([
    '/environmentMaps/1/px.jpg',
    '/environmentMaps/1/nx.jpg',
    '/environmentMaps/1/py.jpg',
    '/environmentMaps/1/ny.jpg',
    '/environmentMaps/1/pz.jpg',
    '/environmentMaps/1/nz.jpg',
])
environmentMap.encoding = THREE.sRGBEncoding

scene.background = environmentMap
scene.environment = environmentMap

gui.add(debugObject, 'envMapIntensity').min(0).max(10).step(0.001).onChange(updateAllMaterials)

/**
 * Materials
 */

/**
 * Model
 */
let artifacts = []
gltfLoader.load(
    './gallery/gallery.gltf',
    (gltf) => {
        const meshes = [...gltf.scene.children[0].children[0].children[0].children[0].children]
        const materials = []

        let center = new THREE.Vector3()

        gltf.scene.traverse(object => {
            if(object.material)
            materials.push(object.material)
        })

        meshes.forEach(mesh => {
            scene.add(mesh)
            mesh.geometry.computeBoundingBox()

            if(mesh.name.includes('picture') && !mesh.name.includes('pictureborder')){
                mesh.geometry.boundingBox.getCenter(center)

                const objNorm = mesh.geometry.attributes.normal
                const normal = new THREE.Vector3()
                const objWorldPos = new THREE.Vector3()
                objWorldPos.copy(mesh.localToWorld(center))
                
                for( let i = 0; i < objNorm.count / 32; i++){
                    normal.set(objNorm.getX(i), objNorm.getY(i), objNorm.getZ(i))
                }
                
                picturesPosNorm.add({norm: normal, pos: objWorldPos})
            }
        })

        picturesPosNorm.forEach(picturePosNorm => {
            const geometry = new THREE.BoxGeometry( 0.3, 0.3, 0.3 )
            const material = new THREE.MeshBasicMaterial( {color: 0x00ff00} )
            const cube = new THREE.Mesh( geometry, material )
            const offset = new THREE.Vector3()

            offset.addScaledVector(picturePosNorm.norm, 0.2)
            cube.position.copy(picturePosNorm.pos).add(offset)
            artifacts.push(cube)
            scene.add( cube )
        })

        updateAllMaterials()
    }
)

/**
 * Sizes
 */
const sizes = {
    width: window.innerWidth,
    height: window.innerHeight
}

window.addEventListener('resize', () => {
    // Update sizes
    sizes.width = window.innerWidth
    sizes.height = window.innerHeight

    // Update camera
    camera.aspect = sizes.width / sizes.height
    camera.updateProjectionMatrix()

    // Update renderer
    renderer.setSize(sizes.width, sizes.height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))

    effectComposer.setSize(sizes.width, sizes.height)
    effectComposer.setPixelRatio(Math.min(window.devicePixelRatio, 2))

    fxaaPass.uniforms['resolution'].value.set( 1 / sizes.width, 1 / sizes.height )

})

/**
 * Camera
 */
// Base camera
const camera = new THREE.PerspectiveCamera(45, sizes.width / sizes.height, 0.1, 100)
camera.position.y = -1
scene.add(camera)


/**
 * Events
 */
const controls = new PointerLockControls(camera, canvas)
scene.add(controls.getObject())

// Cursor
window.addEventListener('pointermove', onPointerMove )

function onPointerMove(event){
    event.preventDefault()
    isMoved = true
    pointer.x = ( event.clientX / window.innerWidth ) * 2 - 1
    pointer.y = - ( event.clientY / window.innerHeight ) * 2 + 1
}

canvas.addEventListener('click', (event) => {
    controls.lock()
    
    // Raycast from camera center
    raycaster.setFromCamera({x: 0, y: 0}, camera )
    const intersects = raycaster.intersectObjects(artifacts)
    if (intersects.length > 0)  {
        
        gsap.to(camera.position, {
            duration: 2,
            x: intersects[0].object.position.x,
        })
        // camera.lookAt(intersects[0].object.position)
        addSelectedObject(intersects[0].object)
	}
})

let selectedObjects = []
function addSelectedObject( object ) {
    selectedObjects = []
    selectedObjects.push( object )
    outlinePass.selectedObjects = selectedObjects
}

window.addEventListener('touchend', (event) => {

    // If user has not dragged on the screen ray cast touch input
    if(isMoved === false){
        // Raycast from touch input
        let {clientX, clientY} = event.changedTouches[0]
        clientX = (clientX / window.innerWidth) * 2 - 1
        clientY = -(clientY / window.innerHeight) * 2 + 1
        const coords = new THREE.Vector2(clientX, clientY)
    
        raycaster.setFromCamera(coords, camera )
        const intersects = raycaster.intersectObjects(artifacts)
        if (intersects.length > 0)  {
            // camera.lookAt(intersects[0].object.position)
            addSelectedObject(intersects[0].object)
        }
    }

    isMoved = false
})

window.addEventListener('keydown', onKeyDown, false)

function onKeyDown(event){
    switch ( event.keyCode ) {
        case 37: // left
        case 65: // a
            console.log('left')
            camera.position.x -= 0.1
            break;
        case 39: // right
        case 68: // d
            console.log('right')
            camera.position.x += 0.1
            break;
        case 32: // space
            console.log('space')
            break;

    }
}

/**
 * Renderer
 */
const renderer = new THREE.WebGLRenderer({
    canvas: canvas,
    antialias: true
})
renderer.physicallyCorrectLights = true
renderer.outputEncoding = THREE.sRGBEncoding
renderer.toneMapping = THREE.ReinhardToneMapping
renderer.toneMappingExposure = 5
renderer.setSize(sizes.width, sizes.height)
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))

gui
    .add(renderer, 'toneMapping', {
        No: THREE.NoToneMapping,
        Linear: THREE.LinearToneMapping,
        Reinhard: THREE.ReinhardToneMapping,
        Cineon: THREE.CineonToneMapping,
        ACESFilmic: THREE.ACESFilmicToneMapping
    })
    .onFinishChange(() =>
    {
        renderer.toneMapping = Number(renderer.toneMapping)
        updateAllMaterials()
    })
gui.add(renderer, 'toneMappingExposure').min(3).max(10).step(0.001)

// Post processing
const effectComposer = new EffectComposer(renderer)

const renderPass = new RenderPass(scene, camera)
effectComposer.addPass(renderPass)

const outlinePass = new OutlinePass( new THREE.Vector2(sizes.width, sizes.height), scene, camera)
outlinePass.edgeStrength = 1.5
outlinePass.edgeGlow = 1
outlinePass.edgeThickness = 1.5
outlinePass.pulsePeriod = 5
effectComposer.addPass(outlinePass)

const fxaaPass = new ShaderPass(FXAAShader)
fxaaPass.uniforms['resolution'].value.set( 1 / sizes.width, 1 / sizes.height)
effectComposer.addPass(fxaaPass)

gui.add(debugObject, 'edgeStrength', 0.01, 10 ).onChange( function ( value ) {
    outlinePass.edgeStrength = Number( value )
})
gui.add(debugObject, 'edgeGlow', 0.0, 1 ).onChange( function ( value ) {
    outlinePass.edgeGlow = Number( value )
})
gui.add(debugObject, 'edgeThickness', 1, 4 ).onChange( function ( value ) {
    outlinePass.edgeThickness = Number( value )
})
gui.add(debugObject, 'pulsePeriod', 0.0, 5 ).onChange( function ( value ) {
    outlinePass.pulsePeriod = Number( value )
})


/**
 * Animate
 */
const clock = new THREE.Clock()

const tick = () =>
{
    const elapsedTime = clock.getElapsedTime()

    // Update controls
    // controls.update()

    // Render
    // renderer.render(scene, camera)
    effectComposer.render()

    // Call tick again on the next frame
    window.requestAnimationFrame(tick)
}

tick()