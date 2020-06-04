let w,h;

let canvas,context;

let renderer;
let render;
let uniforms;

let reset;

let nhash,hash;  

let pos;

let mouse_pressed,mouse_held,mouse;
let cam,scene,geometry,mesh,mat;

let clock;

function init() {

    canvas  = $('#canvas')[0];
    context = canvas.getContext('webgl2',{ antialias:false });

    w = window.innerWidth;
    h = window.innerHeight; 

    canvas.width  = w;
    canvas.height = h;

    renderer = new THREE.WebGLRenderer({canvas:canvas,context:context});

    cam = new THREE.PerspectiveCamera(45.,w/h,0.0,1000.0);

    clock = new THREE.Clock(); 

    nhash = new Math.seedrandom();
    hash = nhash();

    mouse = new THREE.Vector2(0.0); 
    mouse_pressed = 0;
    mouse_held = 0;

    cam.position.set(0.0,0.0,5.0); 
    pos = new THREE.Vector3(0);

    scene = new THREE.Scene();
    geometry = new THREE.PlaneBufferGeometry(2,2);

    uniforms = {

        "t"   : { value : 1.0 },
        "res" : new THREE.Uniform(new THREE.Vector2(w,h)),
        "m"   : new THREE.Uniform(new THREE.Vector2()),
        "p"   : new THREE.Uniform(new THREE.Vector3(pos)),
        "h"   : { value: hash }

    };   

}

init();

ShaderLoader("render.vert","render.frag",

    function(vertex,fragment) {

        material = new THREE.ShaderMaterial({

            uniforms : uniforms,
            vertexShader : vertex,
            fragmentShader : fragment

        });

        mesh = new THREE.Mesh(geometry,material);

        scene.add(mesh);
       
        renderer.setPixelRatio(window.devicePixelRatio);
        renderer.setSize(w,h);

        render = function(timestamp) {

        requestAnimationFrame(render);
    
        uniforms["t"].value = performance.now();
        uniforms["p"].value = pos; 
        uniforms["m"].value = mouse;
        uniforms["h"].value = hash;

        renderer.render(scene,cam);

        } 
       
    render();

    }
) 

$('#canvas').mousedown(function() { 
 
    mouse_pressed = true;
   
    reset = setTimeout(function() {
    mouse_held = true; 


    },5000);


});

$('#canvas').mouseup(function() {
    
    mouse_pressed = false;    
    mouse_held = false;
    
    hash = nhash();

    if(reset) {
        clearTimeout(reset);
    };

});        

window.addEventListener('mousemove',onMouseMove,false);

function onMouseMove(event) {
    mouse.x = (event.clientX / w) * 2.0 - 1.0; 
    mouse.y = -(event.clientY / h) * 2.0 + 1.0;
}
