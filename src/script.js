import './style.css'
import * as dat from 'lil-gui'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js'
import { PointerLockControls } from './PointerLockControlsMobile'
import { VertexNormalsHelper } from 'three/examples/jsm//helpers/VertexNormalsHelper'

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
const debugObject = {}

// Canvas
const canvas = document.querySelector('canvas.webgl')

// Scene
const scene = new THREE.Scene()

// Pictures
const picturesPosNorm = new Set()

// Mouse
const pointer = new THREE.Vector2()
const raycaster = new THREE.Raycaster()

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

debugObject.envMapIntensity = 2.5
gui.add(debugObject, 'envMapIntensity').min(0).max(10).step(0.001).onChange(updateAllMaterials)

/**
 * Materials
 */

/**
 * Model
 */
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
})

/**
 * Camera
 */
// Base camera
const camera = new THREE.PerspectiveCamera(45, sizes.width / sizes.height, 0.1, 100)
camera.position.y = -1
scene.add(camera)

// Controls
// const controls = new OrbitControls(camera, canvas)
// controls.enableDamping = true
// controls.enableZoom = false
// controls.enablePan = false
const controls = new PointerLockControls(camera, canvas)

/*
         TODO: Apply delta for camera rotation change =======================
*/
scene.add(controls.getObject())

window.addEventListener('click', () => {
    controls.lock()
    
    // Raycast from camera center
    raycaster.setFromCamera({x: 0, y: 0}, camera )
    const intersects = raycaster.intersectObject(scene)
    if (intersects.length > 0)  {
		intersects[0].object.material.color.set( 0xff0000 )
        // camera.lookAt(intersects[0].object.position)
	}
})

window.addEventListener( 'keydown', onKeyDown, false)

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

// Mouse
window.addEventListener('pointermove', onPointerMove )

function onPointerMove(event){
    event.preventDefault()

    pointer.x = ( event.clientX / window.innerWidth ) * 2 - 1
    pointer.y = - ( event.clientY / window.innerHeight ) * 2 + 1
}


window.addEventListener( 'pointermove', onPointerMove )

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
renderer.toneMappingExposure = 1.6
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
gui.add(renderer, 'toneMappingExposure').min(0).max(10).step(0.001)


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
    renderer.render(scene, camera)

    // Call tick again on the next frame
    window.requestAnimationFrame(tick)
}

tick()