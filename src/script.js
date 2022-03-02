import './style.css'
import * as dat from 'lil-gui'
import * as THREE from 'three'
import gsap from 'gsap'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader'
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader'
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer'
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass'
import { OutlinePass } from 'three/examples/jsm/postprocessing/OutlinePass'
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
    width: 200
})
gui.hide()
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

// Sizes
 const sizes = {
    width: window.innerWidth,
    height: window.innerHeight
}

/**
 * Camera
 */
// Base camera
const camera = new THREE.PerspectiveCamera(75, sizes.width / sizes.height, 0.1, 100)
camera.position.y = -1
scene.add(camera)

// Pictures
const picturesPosNorm = []

// Mouse
const pointer = new THREE.Vector2()
const raycaster = new THREE.Raycaster()
let isMoved = false

/**
 * UI
 */
// Loading overlay
 const overlayGeometry = new THREE.PlaneGeometry(2, 2, 1, 1)
 const overlayMaterial = new THREE.ShaderMaterial({
     transparent: true,
     uniforms:
     {
         uAlpha: { value: 1 }
     },
     vertexShader: `
     void main()
     {
         gl_Position = vec4(position, 1.0);
     }
     `,
     fragmentShader: `
        uniform float uAlpha;
        void main()
        {
            gl_FragColor = vec4(0.0, 0.0, 0.0, uAlpha);
        }
     `
 })
 const overlay = new THREE.Mesh(overlayGeometry, overlayMaterial)
 scene.add(overlay)

// Crosshair
const crossHair = document.querySelector('.crosshair')

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
// Loading Manager
const loadingBarElement = document.querySelector('.loading-bar')
let sceneReady = false
const loadingManager = new THREE.LoadingManager(
    // Loaded
    () => {
        // Wait a little
        window.setTimeout(() =>{
            // Animate overlay
            gsap.to(overlayMaterial.uniforms.uAlpha, { duration: 3, value: 0, delay: 1 })

            // Update loading bar
            loadingBarElement.classList.add('ended')
            loadingBarElement.style.transform = ''
        }, 500)

        window.setTimeout(() => {
            sceneReady = true
        }, 2000)
    },
    // Progress
    (itemUrl, itemsLoaded, itemsTotal) =>
    {   
        // Calculate loading progress and update loading bar element
        const progressRatio = itemsLoaded / itemsTotal
        loadingBarElement.style.transform = `scaleX(${progressRatio})`
    } 
)

// Texture loader
const textureLoader = new THREE.TextureLoader(loadingManager)

//Cube texture loader
const cubeTextureLoader = new THREE.CubeTextureLoader(loadingManager)

// Draco loader
const dracoLoader = new DRACOLoader(loadingManager)
dracoLoader.setDecoderPath('draco/')

// GLTF loader
const gltfLoader = new GLTFLoader(loadingManager)
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
 * Models
 */
let artifacts = []
let artifactObjects = []
gltfLoader.load(
    './models/gallery/gallery.gltf',
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
                
                picturesPosNorm.push({norm: normal, pos: objWorldPos})
            }
        })

        // picturesPosNorm.forEach(picturePosNorm => {
        //     const geometry = new THREE.BoxGeometry( 0.3, 0.3, 0.3 )
        //     const material = new THREE.MeshBasicMaterial( {color: 0x00ff00} )
        //     const mesh = new THREE.Mesh( geometry, material )
        //     const offset = new THREE.Vector3()

        //     offset.addScaledVector(picturePosNorm.norm, 0.2)
        //     mesh.position.copy(picturePosNorm.pos).add(offset)
        //     artifacts.push({mesh, points})
        //     scene.add( mesh )
        // })

        // Seperate artifact objects out of object
        // artifactObjects = artifacts.map(({mesh}) => mesh)

        updateAllMaterials()
    }
)

// Load models and with points of interest from load_gallery.json file
const loadGalleryData = require('./load_gallery.json')
loadGalleryData.artifacts.forEach((artifactData) => {
    gltfLoader.load(
        `./models/${artifactData.model_path}`,
        (gltf) => {
            const object = gltf.scene.children[0]

            // Calculate bounding box for collision detection (ray cast)
            object.traverse((mesh) => {
                if(mesh instanceof THREE.Mesh){
                    mesh.geometry.computeBoundingBox()
                }
            })

            // Position mesh in front of painting index
            const offset = new THREE.Vector3()
            offset.addScaledVector(picturesPosNorm[artifactData.index].norm, 0.2)
            object.position.copy(picturesPosNorm[artifactData.index].pos).add(offset)
            
            let mx = new THREE.Matrix4().lookAt(object.position, picturesPosNorm[artifactData.index].pos, object.up)
            object.quaternion.setFromRotationMatrix(mx)

            // Rotate loaded mesh to correct orientation
            // const pictureArrow = new THREE.ArrowHelper(picturesPosNorm[artifactData.index].norm, picturesPosNorm[artifactData.index].pos, 1, 0xffff00)
            // const objectArrow = new THREE.ArrowHelper(object.up, object.position, 1, 0xff0000)
            // scene.add(pictureArrow, objectArrow)

            // Create HTML elements with the data points
            const points = []
            artifactData.points.forEach((pointData, index) => {
                let div = document.createElement('div')
                div.className = `point point-${index}`
                let label, text 
                label = document.createElement('div')
                label.className = 'label'
                label.innerText = index + 1
                text = document.createElement('div')
                text.className = 'text'
                text.textContent = pointData.text
                div.appendChild(label)
                div.appendChild(text)
                document.body.appendChild(div)
                const point = 
                {
                    position: new THREE.Vector3(),
                    pos_offset: new THREE.Vector3().fromArray(pointData.pos_offset),
                    text: pointData.text,
                    element: document.querySelector(`.point-${index}`)
                }
                points.push(point)
            })

            artifactObjects.push(object)
            artifacts.push({object, points})
            scene.add(object)
        }
    )
})

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
})

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
    event.preventDefault()
    
    controls.lock()
    
    // Raycast from camera center
    raycaster.setFromCamera({x: 0, y: 0}, camera )

    const intersects = raycaster.intersectObjects(artifactObjects)
    if (intersects.length > 0)  {
        let object = intersects[0].object.parent.parent.parent.parent
        
        gsap.to(camera.position, {
            duration: 2,
            x: object.position.x,
        })
        // Iterate every artifact to match the interected object
        artifacts.forEach(artifact => {
            if(object === artifact.object){
                // Update selected artifact
                addSelectedObject(artifact)
            }
        })
	}
})

window.addEventListener('touchend', (event) => {

    // If user has not dragged on the screen ray cast touch input
    if(isMoved === false){
        // Raycast from touch input
        let {clientX, clientY} = event.changedTouches[0]
        clientX = (clientX / window.innerWidth) * 2 - 1
        clientY = -(clientY / window.innerHeight) * 2 + 1
        const coords = new THREE.Vector2(clientX, clientY)
    
        raycaster.setFromCamera(coords, camera )
        const intersects = raycaster.intersectObjects(artifactObjects)
        if (intersects.length > 0)  {
            let object = intersects[0].object

            gsap.to(camera.position, {
                duration: 2,
                x: object.position.x,
            })
            
            artifacts.forEach(artifact => {
                if(object === artifact.object){
                    // Update selected artifact
                    addSelectedObject(artifact)
                }
            })
        }
    }

    isMoved = false
})

let selectedObjects = []
function addSelectedObject( selected ) {
    selectedObjects = []
    selectedObjects.push(selected)
    let selectedMeshes = [selected.object]
    outlinePass.selectedObjects = selectedMeshes

    // Updates points make them visible
    console.log(selected.points)
    selected.points.forEach(point => {
        point.position.copy(selected.object.position)
        point.position.add(point.pos_offset)
        
        point.element.classList.add('visible')
    })
}

window.addEventListener('keydown', onKeyDown, false)

function onKeyDown(event){
    switch ( event.keyCode ) {
        case 37: // left
        case 65: // a
            camera.position.x -= 0.1
            break;
        case 39: // right
        case 68: // d
            camera.position.x += 0.1
            break;
        case 32: // space
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

gui.add(debugObject, 'edgeStrength', 0.01, 10 ).onChange((value) => {
    outlinePass.edgeStrength = Number(value)
})
gui.add(debugObject, 'edgeGlow', 0.0, 1 ).onChange((value) => {
    outlinePass.edgeGlow = Number(value)
})
gui.add(debugObject, 'edgeThickness', 1, 4 ).onChange((value) => {
    outlinePass.edgeThickness = Number(value)
})
gui.add(debugObject, 'pulsePeriod', 0.0, 5 ).onChange((value) => {
    outlinePass.pulsePeriod = Number(value)
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

    // Go through each point
    if(sceneReady && selectedObjects.length > 0){
        for(const point of selectedObjects[0].points){
            const screenPosition = point.position.clone()
            screenPosition.project(camera)

            const translateX = screenPosition.x * sizes.width * 0.5
            const translateY = -screenPosition.y * sizes.height * 0.5
            point.element.style.transform = `translateX(${translateX}px) translateY(${translateY}px)`
        }
    }

    // Update crosshair
    if(controls.isLocked && controls.isMobile === false){ crossHair.classList.add('visible') }
    else{ crossHair.classList.remove('visible') }
    
    // Render
    // renderer.render(scene, camera)
    effectComposer.render()

    // Call tick again on the next frame
    window.requestAnimationFrame(tick)
}

tick()