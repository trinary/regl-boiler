/*
  tags: instancing, basic

  <p> In this example, it is shown how you can draw a bunch of bunny meshes using the
  instancing feature of regl. </p>
*/

const mat4 = require('gl-mat4')
const bunny = require('bunny')
const fit = require('canvas-fit')
const normals = require('angle-normals')

const canvas = document.body.appendChild(document.createElement('canvas'))
const regl = require('regl')({canvas: canvas, extensions: ['angle_instanced_arrays']})
const camera = require('canvas-orbit-camera')(canvas)
window.addEventListener('resize', fit(canvas), false)

// configure initial camera view.
camera.rotate([0.0, 0.0], [0.0, -0.4])
camera.zoom(70.0)


// all the positions of a single block.
var blockPosition = [
  // side faces
  [[-0.5, +0.5, +0.5], [+0.5, +0.5, +0.5], [+0.5, -0.5, +0.5], [-0.5, -0.5, +0.5]], // positive z face.
  [[+0.5, +0.5, +0.5], [+0.5, +0.5, -0.5], [+0.5, -0.5, -0.5], [+0.5, -0.5, +0.5]], // positive x face
  [[+0.5, +0.5, -0.5], [-0.5, +0.5, -0.5], [-0.5, -0.5, -0.5], [+0.5, -0.5, -0.5]], // negative z face
  [[-0.5, +0.5, -0.5], [-0.5, +0.5, +0.5], [-0.5, -0.5, +0.5], [-0.5, -0.5, -0.5]], // negative x face.
  // top faces
  [[-0.5, +0.5, -0.5], [+0.5, +0.5, -0.5], [+0.5, +0.5, +0.5], [-0.5, +0.5, +0.5]],
  // bottom face
  [[-0.5, -0.5, -0.5], [+0.5, -0.5, -0.5], [+0.5, -0.5, +0.5], [-0.5, -0.5, +0.5]]
]

// all the uvs of a single block.
var blockUv = [
  // side faces
  [[0.0, 0.5], [0.5, 0.5], [0.5, 1.0], [0.0, 1.0]],
  [[0.0, 0.5], [0.5, 0.5], [0.5, 1.0], [0.0, 1.0]],
  [[0.0, 0.5], [0.5, 0.5], [0.5, 1.0], [0.0, 1.0]],
  [[0.0, 0.5], [0.5, 0.5], [0.5, 1.0], [0.0, 1.0]],
  // top
  [[0.0, 0.0], [0.5, 0.0], [0.5, 0.5], [0.0, 0.5]],
  [[0.0, 0.0], [0.5, 0.0], [0.5, 0.5], [0.0, 0.5]]
]

// all the normals of a single block.
var blockNormal = [
  // side faces
  [[0.0, 0.0, +1.0], [0.0, 0.0, +1.0], [0.0, 0.0, +1.0], [0.0, 0.0, +1.0]],
  [[+1.0, 0.0, 0.0], [+1.0, 0.0, 0.0], [+1.0, 0.0, 0.0], [+1.0, 0.0, 0.0]],
  [[0.0, 0.0, -1.0], [0.0, 0.0, -1.0], [0.0, 0.0, -1.0], [0.0, 0.0, -1.0]],
  [[-1.0, 0.0, 0.0], [-1.0, 0.0, 0.0], [-1.0, 0.0, 0.0], [-1.0, 0.0, 0.0]],
  // top
  [[0.0, +1.0, 0.0], [0.0, +1.0, 0.0], [0.0, +1.0, 0.0], [0.0, +1.0, 0.0]],
  [[0.0, -1.0, 0.0], [0.0, -1.0, 0.0], [0.0, -1.0, 0.0], [0.0, -1.0, 0.0]]
]

var N = 15 // N bunnies on the width, N bunnies on the height.

// these contains all the geometry of the world.
// you can add blocks to these arrays by calling addBlock()
var uv = []
var elements = []
var position = []
var normal = []

var s = 8;

var addBlock = (x, y, z) => {
  var index = position.length

  for (var i = 0; i < 6; i++) {
    var j
    // add positions.
    for (j = 0; j < blockPosition[i].length; j++) {
      var p = blockPosition[i][j]
      position.push([p[0] * s + x, p[1] * s + y, p[2] * s + z])
    }

    // add normals.
    for (j = 0; j < blockNormal[i].length; j++) {
      var n = blockNormal[i][j]
      normal.push([n[0], n[1], n[2]])
    }

    // add uvs.
    for (j = 0; j < blockUv[i].length; j++) {
      var a = blockUv[i][j]
      uv.push([a[0], a[1]])
    }

    // add quad face.
    elements.push([2 + index, 1 + index, 0 + index])
    elements.push([2 + index, 0 + index, 3 + index])

    index += 4 // next quad.
  }
}

addBlock(0,0,0);

var angle = []
for (var i = 0; i < N * N; i++) {
  // generate random initial angle.
  angle[i] = Math.random() * (2 * Math.PI)
}

// This buffer stores the angles of all
// the instanced bunnies.
const angleBuffer = regl.buffer({
  length: angle.length * 4,
  type: 'float',
  usage: 'dynamic'
})

const drawBunnies = regl({
  frag: `
  precision mediump float;

  varying vec3 vNormal;
  varying vec3 vColor;

  void main () {
    vec3 color = vColor;

    vec3 ambient = vec3(0.3) * color;

    vec3 lightDir = vec3(0.39, 0.87, 0.29);
    vec3 diffuse = vec3(0.7) * color * clamp(dot(vNormal, lightDir) , 0.0, 1.0 );

    gl_FragColor = vec4(ambient + diffuse, 1.0);

  }`,
  vert: `
  precision mediump float;

  attribute vec3 position;
  attribute vec3 normal;

  // These three are instanced attributes.
  attribute vec3 offset;
  attribute vec3 color;
  attribute float angle;
  attribute float stretch;

  uniform mat4 proj;
  uniform mat4 model;
  uniform mat4 view;

  varying vec3 vNormal;
  varying vec3 vColor;

  void main () {
    vNormal = normal;
    vColor = color;

    // float s = normal.y >= 1.0 ? stretch : 1.0;
    gl_Position = proj * view * model * vec4(
      +cos(angle) * position.x + position.z * sin(angle) + offset.x,
      (position.y  * stretch + stretch/2.0) + offset.y,
      -sin(angle) * position.x  + position.z * cos(angle) + offset.z,
      1.0);
  }`,
  attributes: {
    position: bunny.positions,
    normal: normals(bunny.cells, bunny.positions),
    // position: position,
    // normal: normal,

    offset: {
      buffer: regl.buffer(
        Array(N * N).fill().map((_, i) => {
          var x = (-1 + 2 * Math.floor(i / N) / N) * 120
          var z = (-1 + 2 * (i % N) / N) * 120
          return [x, 3*Math.sin(i % N * Math.PI/2), z]
        })),
      divisor: 1
    },

    stretch: {
      buffer: regl.buffer(
        Array(N * N).fill().map((_, i) => {
          return 2 * i / (N * N) + 0.1;
        })),
      divisor: 1
    },

    color: {
      buffer: regl.buffer(
        Array(N * N).fill().map((_, i) => {
          var x = Math.floor(i / N) / (N - 1)
          var z = (i % N) / (N - 1)
          return [
            x * z * 0.3 + 0.7 * z,
            x * x * 0.5 + z * z * 0.4,
            x * z * x + 0.35
          ]
        })),
      divisor: 1
    },

    angle: {
      buffer: angleBuffer,
      divisor: 1
    }
  },
  // elements: elements,
  elements: bunny.cells,
  instances: N * N,
  uniforms: {
    proj: ({viewportWidth, viewportHeight}) =>
      mat4.perspective([],
                       Math.PI / 2,
                       viewportWidth / viewportHeight,
                       0.01,
                       1000),
    model: mat4.identity([]),
    view: () => camera.view()
  }
})

regl.frame(() => {
  regl.clear({
    color: [0, 0, 0, 1]
  })

  // rotate the bunnies every frame.
  for (var i = 0; i < N * N; i++) {
    angle[i] += 0.01
  }
  angleBuffer.subdata(angle)

  drawBunnies()

  camera.tick()
})
