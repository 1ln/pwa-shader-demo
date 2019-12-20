//Signed Distance using raymarching
//Copyright 2019, Dan Olson

precision mediump float;

varying vec2 vUv;
varying vec2 vtc;

uniform float u_hash;

uniform vec2 u_mouse;
uniform int u_mouse_pressed;
uniform int u_swipe_dir;

uniform vec2 u_resolution;

uniform vec3 u_cam_target;
uniform float u_time;

const float PI  =  3.1415926;
const float PI2 = 2.0 * PI;
const float PI6 = 6.0 * PI;
const float PI_6 = 6.0/PI;
const float PHI =  1.6180339;
const float PHI_INV = 1.0/PHI;
const float PHI_SPHERE = 1.0 - PHI/6.0;

const int MARCH_STEPS = 128;

const float EPSILON = 0.0001;
const float TRACE_DIST = 1000.0;

float hash(float h) { return fract(sin(h) * u_hash *  43758.5453 ); }
//float hash(float h) { return fract(PHI/log(23324.0 ) * h  * 981123324.0  ); }

float hash2(vec2 st) {
return fract(sin(dot(st.xy,vec2(12.9898,78.233))) * 43758.5453123) * 2.0 - 1.0 ;
}

float noise2(in vec2 st_) {

    vec2 i = floor(st_);
    vec2 f = fract(st_);

    float a = hash2(i);
    float b = hash2(i + vec2(1.0,0.0));
    float c = hash2(i + vec2(0.0,1.0));
    float d = hash2(i + vec2(1.0,1.0));
 
    vec2 u = f * f * (3.0 - 2.0 * f);

    return mix(a,b,u.x) + 
        (c - a) * u.y * (1.0 - u.x) +
        (d - b) * u.x * u.y;
}

vec3 hash3(vec3 x) {
 
    x = vec3(dot(x,vec3(45.0,325.0,2121.455)), 
             dot(x,vec3(122.34,109.0,592.0)),
             dot(x,vec3(67.0,322.4364,1235.0)));

    return fract(sin(x) * 92352.3635 * u_hash);
}
 
float cell(vec3 x,float iterations,int type) {
 
    x *= iterations;

    vec3 p = floor(x);
    vec3 f = fract(x);
 
    float min_dist = 1.0;
    
    for(int i = -1; i <= 1; i++) {
        for(int j = -1; j <= 1; j++) {
            for(int k = -1; k <= 1; k++) { 

                vec3 b = vec3(float(k),float(j),float(i));
                vec3 r = hash3(p + b);
                vec3 diff = (b + r - f);

                float d = length(diff);

                    if(type == 0) { 
                        min_dist = min(min_dist,d);
                    }
 
                    if(type == 1) {
                        min_dist = min(min_dist,abs(diff.x)+abs(diff.y)+abs(diff.z));
                    }

                    if(type == 2) {
                        min_dist = min(min_dist,max(abs(diff.x),max(abs(diff.y),abs(diff.z))));
                    }

            }
        }
    }
 
    return min_dist;  

}

float noise3d(vec3 x) {

    vec3 p = floor(x);
    vec3 f = fract(x);

    f = f * f * (3.0 - 2.0 * f);
 
    float n = p.x + p.y * 157.0 + 113.0 * p.z;

    return mix(mix(mix(hash(n + 0.0),hash(n + 1.0),f.x), 
                   mix(hash(n + 157.0),hash(n + 158.0),f.x),f.y),
               mix(mix(hash(n + 113.0),hash(n + 114.0),f.x),
                   mix(hash(n + 270.0),hash(n + 271.0),f.x),f.y),f.z);
} 

float fractal312(vec3 x,int octaves) {

    float value = 0.0;
    float h  = .5;
    float g = exp2(-h); 
    float amp = 0.5;
    float freq = 1.0;

    if(octaves >= 1)  { value += amp * noise3d(freq * x); freq *= 2.0; amp *= g; }
    if(octaves >= 2)  { value += amp * noise3d(freq * x); freq *= 2.0; amp *= g; }
    if(octaves >= 3)  { value += amp * noise3d(freq * x); freq *= 2.0; amp *= g; }
    if(octaves >= 4)  { value += amp * noise3d(freq * x); freq *= 2.0; amp *= g; }
    if(octaves >= 5)  { value += amp * noise3d(freq * x); freq *= 2.0; amp *= g; }
    if(octaves >= 6)  { value += amp * noise3d(freq * x); freq *= 2.0; amp *= g; } 
    if(octaves >= 7)  { value += amp * noise3d(freq * x); freq *= 2.0; amp *= g; }
    if(octaves >= 8)  { value += amp * noise3d(freq * x); freq *= 2.0; amp *= g; } 
    if(octaves >= 9)  { value += amp * noise3d(freq * x); freq *= 2.0; amp *= g; }
    if(octaves >= 10) { value += amp * noise3d(freq * x); freq *= 2.0; amp *= g; }
    if(octaves >= 11) { value += amp * noise3d(freq * x); freq *= 2.0; amp *= g; }
    if(octaves >= 12) { value += amp * noise3d(freq * x); freq *= 2.0; amp *= g; }

    return value;
}

float distortFractal(vec3 p,float f,int octaves) {
    
    vec3 q = vec3(fractal312(p + vec3(0.0,0.0,1.0),octaves),      
                  fractal312(p + vec3(4.5,1.8,6.3),octaves),
                  fractal312(p + vec3(1.1,7.2,2.4),octaves)
    );

    vec3 r = vec3(fractal312(p + f*q + vec3(2.1,9.4,5.1),octaves),
                  fractal312(p + f*q + vec3(5.6,3.7,8.9),octaves),
                  fractal312(p + f*q + vec3(4.3,0.0,3.1),octaves) 
    ); 

    return fractal312(p + f * r,octaves);
} 

float sinDisplace3(vec3 p,float h) {
    
    return sin(p.x*h) * sin(p.y*h) * sin(p.z*h);
}

float envImpulse(float x,float k) {

    float h = k * x;
    return h * exp(1.0 - h);
}

float envStep(float x,float k,float n) {

    return exp(-k * pow(x,n));
}

float cubicImpulse(float x,float c,float w) {

    x = abs(x - c);
    if( x > w) { return 0.0; }
    x /= w;
    return 1.0 - x * x  * (3.0 - 2.0 * x);

}

float sincPhase(float x,float k) {

    float a = PI * (k * x - 1.0);
    return sin(a)/a;
}

vec3 fmCol(float t,vec3 a,vec3 b,vec3 c,vec3 d) {
    
    return a + b * cos(PI2 * (c * t + d));
}

mat2 rot2(float a) {

    float c = cos(a);
    float s = sin(a);
    
    return mat2(c,-s,s,c);
}

mat4 rotAxis(vec3 axis,float theta) {

axis = normalize(axis);

    float c = cos(theta);
    float s = sin(theta);

    float oc = 1.0 - c;

    return mat4( 
        oc * axis.x * axis.x + c, oc * axis.x * axis.y - axis.z * s, oc * axis.z * axis.x + axis.y * s, 0.0,
        oc * axis.x * axis.y + axis.z * s, oc * axis.y * axis.y + c, oc * axis.y * axis.z - axis.x * s, 0.0,
        oc * axis.z * axis.x - axis.y * s, oc * axis.y * axis.z + axis.x * s, oc * axis.z * axis.z + c, 0.0,
        0.0,0.0,0.0,1.0);

}

mat4 translate(vec3 p) {
 
    return mat4(
        vec4(1,0,0,p.x),
        vec4(0,1,0,p.y),
        vec4(0,0,1,p.z),
        vec4(0,0,0,1)  
);
}

vec3 repeatLimit(vec3 p,float c,vec3 l) {
  
    vec3 q = p - c * clamp( floor((p/c)+0.5) ,-l,l);
    return q; 
}

vec3 repeat(vec3 p,vec3 s) {
   
    vec3 q = mod(p,s) - 0.5 * s;
    return q;
}

float refx(vec3 p) {
    
   return p.x = abs(p.x);
} 

vec2 opu(vec2 d1,vec2 d2) {

    return (d1.x < d2.x) ? d1 : d2;
} 

float opu(float d1,float d2) {
    
    return min(d1,d2);
}

float opi(float d1,float d2) {

    return max(d1,d2);
}

float opd(float d1,float d2) {

    return max(-d1,d2);
}

float smou(float d1,float d2,float k) {

    float h = clamp(0.5 + 0.5 * (d2-d1)/k,0.0,1.0);
    return mix(d2,d1,h) - k * h * (1.0 - h);
}

float smod(float d1,float d2,float k) {

    float h = clamp(0.5 - 0.5 * (d2+d1)/k,0.0,1.0);
    return mix(d2,-d1,h) + k * h * (1.0 - h);
}

float smoi(float d1,float d2,float k) {

    float h = clamp(0.5 + 0.5 * (d2-d1)/k,0.0,1.0);
    return mix(d2,d1,h) + k * h * (1.0 - h);
}

float round(float d,float h) { 

    return d - h;
}

float layer(float d,float h) {

    return abs(d) - h;
}

float sphere(vec3 p,float r) { 
     
    return length(p) - r;
}

float sphereNeg(vec3 p,float r) {

    return abs(length(p)-r);
}

float ellipsoid(vec3 p,vec3 r) {

    float k0 = length(p/r); 
    float k1 = length(p/(r*r));
    return k0*(k0-1.0)/k1;
}

float cone(vec3 p,vec2 c) {

    float q = length(p.xy);
    return dot(c,vec2(q,p.z));
}

float roundedCone(vec3 p,float r1,float r2,float h) {

    vec2 q = vec2(length(vec2(p.x,p.z)),p.y);
    float b = (r1-r2)/h;
    float a = sqrt(1.0 - b*b);
    float k = dot(q,vec2(-b,a));

    if( k < 0.0) return length(q) - r1;
    if( k > a*h) return length(q - vec2(0.0,h)) - r2;

    return dot(q,vec2(a,b)) - r1;
}

float solidAngle(vec3 p,vec2 c,float ra) {
    
    vec2 q = vec2(length(vec2(p.x,p.z)),p.y);
    float l = length(q) - ra;
    float m = length(q - c * clamp(dot(q,c),0.0,ra));
    return max(l,m * sign(c.y * q.x - c.x * q.y));
}

float link(vec3 p,float le,float r1,float r2) {

    vec3 q = vec3(p.x,max(abs(p.y) -le,0.0),p.z);
    return length(vec2(length(q.xy)-r1,q.z)) - r2;
}

float plane(vec3 p,vec4 n) {

    return dot(p,n.xyz) + n.w;
}

float capsule(vec3 p,vec3 a,vec3 b,float r) {

    vec3 pa = p - a;
    vec3 ba = b - a;
    float h = clamp(dot(pa,ba)/dot(ba,ba),0.0,1.0);
    return length(pa - ba * h) - r;
} 

float prism(vec3 p,vec2 h) {

    vec3 q = abs(p);
    return max(q.z - h.y,max(q.x * 0.866025 + p.y * 0.5,-p.y) - h.x * 0.5); 
}

float box(vec3 p,vec3 b) {

    vec3 d = abs(p) - b;
    return length(max(d,0.0)) + min(max(d.x,max(d.y,d.z)),0.0);
}

float roundBox(vec3 p,vec3 b,float r) {

    vec3 q = abs(p) - b;
    return length(max(q,0.0)) + min(max(q.x,max(q.y,q.z)),0.0) - r;
}

float torus(vec3 p,vec2 t) {

    vec2 q = vec2(length(vec2(p.x,p.z)) - t.x,p.y);
    return length(q) - t.y; 
}

float cylinder(vec3 p,float h,float r) {
    
    float d = length(vec2(p.x,p.z)) - r;
    d = max(d, -p.y - h);
    d = max(d, p.y - h);
    return d; 
}

float hexPrism(vec3 p,vec2 h) {
 
    const vec3 k = vec3(-0.8660254,0.5,0.57735);
    p = abs(p); 
    p.xy -= 2.0 * min(dot(k.xy,p.xy),0.0) * k.xy;
 
    vec2 d = vec2(length(p.xy - vec2(clamp(p.x,-k.z * h.x,k.z * h.x),h.x)) * sign(p.y-h.x),p.z-h.y);
    return min(max(d.x,d.y),0.0) + length(max(d,0.0));
}

float octahedron(vec3 p,float s) {

    p = abs(p);

    float m = p.x + p.y + p.z - s;
    vec3 q;

    if(3.0 * p.x < m) {
       q = vec3(p.x,p.y,p.z);  
    } else if(3.0 * p.y < m) {
       q = vec3(p.y,p.z,p.x); 
    } else if(3.0 * p.z < m) { 
       q = vec3(p.z,p.x,p.y);
    } else { 
       return m * 0.57735027;
    }

    float k = clamp(0.5 *(q.z-q.y+s),0.0,s);
    return length(vec3(q.x,q.y-s+k,q.z - k)); 
}
   
vec2 scene(vec3 p) { 

vec3 q = vec3(p);

float s  = 0.001;
float t  = u_time; 

vec2 res = vec2(1.0,0.0);

vec2 mo = vec2(u_mouse);
mat4 mxr = rotAxis(vec3(1.0,0.0,0.0),PI2 * mo.y);
mat4 myr = rotAxis(vec3(0.0,1.0,0.0),PI2 * mo.x); 
//p = (vec4(p,1.0) * mxr * myr).xyz;


mat4 r = rotAxis(vec3(1.0,0.0,0.0),t*s );
//p = (vec4(p,1.0) * r).xyz;

/*
df = sphere(p,1.);
df = box(p,vec3(1.0);
df = cylinder(p,1.0,.5);
df = octahedron(p,1.0);
df = prism(p,vec2(1.0,0.0));
df = hexPrism(p,vec2(1.0,d));
*/

float df = sphere(p,1.0);

res = vec2(df,0.0);
return res;
}

vec2 rayScene(vec3 ro,vec3 rd) {
    
    float depth = 0.0;
    float d = -1.0;

    for(int i = 0; i < MARCH_STEPS; ++i) {

        vec3 p = ro + depth * rd;
        vec2 dist = scene(p);
   
        if(dist.x < EPSILON || TRACE_DIST < dist.x ) { break; }
        depth += dist.x;
        d = dist.y;

        }
 
        if(TRACE_DIST < depth) { d = -1.0; }
        return vec2(depth,d);

}

vec2 rayReflect(vec3 ro,vec3 rd) {

    float depth = 0.0;
    float d = -1.0;

    for(int i = 0; i < 10; ++i) {
        vec3 p = ro + depth * rd;
        vec2 dist = scene(p);
         
        if(dist.x < EPSILON || TRACE_DIST < dist.x) { break; }
        depth += dist.x;
        d = dist.y;
        }
        
        if(TRACE_DIST < depth) { d = -1.0; }
        return vec2(depth,d);
}

vec3 calcNormal(vec3 p) {

    vec2 e = vec2(1.0,-1.0) * EPSILON;

    return normalize(vec3(
    vec3(e.x,e.y,e.y) * scene(p + vec3(e.x,e.y,e.y)).x +
    vec3(e.y,e.x,e.y) * scene(p + vec3(e.y,e.x,e.y)).x +
    vec3(e.y,e.y,e.x) * scene(p + vec3(e.y,e.y,e.x)).x + 
    vec3(e.x,e.x,e.x) * scene(p + vec3(e.x,e.x,e.x)).x

    ));

}

vec3 rgb2hsv(in vec3 c) {

    vec3 rgb = clamp(abs(mod(c.x * 6.0 + vec3(0.0,4.0,2.0),6.0) - 3.0) - 1.0,0.0,1.0); 
    rgb = rgb * rgb - (3.0 - 2.0) * rgb; 
    return c.z * mix(vec3(1.0),rgb,c.y);
}

vec3 phongModel(vec3 kd,vec3 ks,float alpha,vec3 p,vec3 cam_ray,vec3 light_pos,vec3 intensity) {  

     vec3 n = calcNormal(p);

     vec3 l = normalize(light_pos - p);

     vec3 v = normalize(cam_ray - p);
     vec3 r = normalize(reflect(-l,n));

     float ln = clamp(dot(l,n),0.0,1.0);
     float rv = dot(r,v);

     if(ln < 0.0) {
         return vec3(0.0);  
     }

     if(rv < 0.0) {
         return intensity * (kd * ln);
     }

     return intensity * (kd * ln + ks * pow(rv,alpha));
}

vec3 phongLight(vec3 ka,vec3 kd,vec3 ks,float alpha,vec3 p,vec3 light,vec3 cam_ray) {

     const vec3 ambient_light = 0.5  * vec3(1.0,1.0,1.0);
     vec3 color = ka * ambient_light;  
     
     vec3 intensity = vec3(1.0);
   
     color += phongModel(kd,ks,alpha,p,cam_ray,light,intensity);     
    
     return color;
}

vec3 rayCamDir(vec2 uv,vec3 camPosition,vec3 camTarget,float fPersp) {

     vec3 camForward = normalize(camTarget - camPosition);
     vec3 camRight = normalize(cross(vec3(0.0,1.0,0.0),camForward));
     vec3 camUp = normalize(cross(camForward,camRight));


     vec3 vDir = normalize(uv.x * camRight + uv.y * camUp + camForward * fPersp);  

     return vDir;
}

vec3 render(vec3 ro,vec3 rd) {

vec3 color = vec3(0.0);

vec2 d = rayScene(ro, rd);
//vec2 rf = rayReflect(ro,rd);

vec3 p = ro + rd * d.x;

vec3 kd = vec3(0.0);
vec3 ka = vec3(0.0);
vec3 ks = vec3(0.0);

float shininess = 10.0;
float n = 0.0;

    if(d.x > TRACE_DIST - EPSILON) {

      //  color = vec3(0.0);
          color = vec3(.12) * rd.y*0.5;  

    } else {

//     n = distortFractal(p + cell(p,16.0,0),4.0,6);
      
      n += fractal312(p,6);

      kd = fmCol(p.y+n,vec3(0.0,1.0,0.5),vec3(0.5,.25,0.1),vec3(0.0,0.35,0.45),vec3(0.9,1.0,0.5));
 
      vec3 ka = vec3(0.0); 
      vec3 ks = vec3(1.0);

      color += phongLight(ka,kd,ks,shininess,p,vec3(0.0,0.0,10.0),ro);
      
      color = pow(color,vec3(0.4545)); 

}

      return color;
}

void main() {
 
vec3 cam_pos = cameraPosition;
vec3 cam_target = u_cam_target;

//vec3 cam_pos = vec3(0.0,0.5,5.0);

mat4 cam_rot = rotAxis(vec3(0.0,1.0,0.0),u_time * 0.0001);
//cam_pos = (vec4(cam_pos,1.0) * cam_rot).xyz;

vec2 uvu = -1.0 + 2.0 * vUv.xy;
uvu.x *= u_resolution.x/u_resolution.y; 
vec3 direction = rayCamDir(uvu,cam_pos,cam_target,1.0);
vec3 color = render(cam_pos,direction);

gl_FragColor = vec4(color,1.0);

}
