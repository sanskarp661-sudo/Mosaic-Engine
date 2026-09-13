// Progressive enhancement: renders the mosaic ring mark as an interactive
// 3D scene. If WebGL/modules/anything fails, the static SVG mark (already
// in the page) is left exactly as-is and this script simply no-ops.
(async function () {
  var mount = document.querySelector('[data-hero-3d]');
  if (!mount || !window.WebGLRenderingContext) return;

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var THREE;
  try {
    THREE = await import('three');
  } catch (e) {
    return; // no module/CDN support — SVG fallback stays visible
  }

  var canvas = document.createElement('canvas');
  canvas.className = 'hero-3d-canvas';
  canvas.setAttribute('aria-hidden', 'true');

  var renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas: canvas, alpha: true, antialias: true });
  } catch (e) {
    return;
  }

  var svg = mount.querySelector('svg');
  var size = mount.clientWidth || 340;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(size, size);

  var scene = new THREE.Scene();
  var camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
  camera.position.set(0, 0, 9);

  scene.add(new THREE.HemisphereLight(0xf3efe6, 0x2a3230, 1.1));
  var key = new THREE.DirectionalLight(0xffffff, 1.0);
  key.position.set(4, 5, 6);
  scene.add(key);
  var rim = new THREE.PointLight(0xd9853b, 6, 20, 2);
  rim.position.set(2.6, -1, 3);
  scene.add(rim);

  var group = new THREE.Group();
  scene.add(group);

  var GAP = 1.15; // radians of open gap in the main ring
  var mainArc = Math.PI * 2 - GAP;
  var ringGeo = new THREE.TorusGeometry(2.5, 0.62, 28, 100, mainArc);
  var ringMat = new THREE.MeshStandardMaterial({ color: 0x558c89, roughness: 0.45, metalness: 0.12 });
  var ring = new THREE.Mesh(ringGeo, ringMat);
  ring.rotation.z = Math.PI / 2 + GAP / 2;
  group.add(ring);

  var pieceArc = GAP * 0.62;
  var pieceGeo = new THREE.TorusGeometry(2.5, 0.62, 28, 40, pieceArc);
  var pieceMat = new THREE.MeshStandardMaterial({ color: 0xd9853b, roughness: 0.35, metalness: 0.08 });
  var piece = new THREE.Mesh(pieceGeo, pieceMat);
  piece.rotation.z = Math.PI / 2 - GAP / 2 - pieceArc + (GAP - pieceArc) / 2;
  piece.position.x += 0.18;
  group.add(piece);

  function fitCamera() {
    var box = new THREE.Box3().setFromObject(group);
    var sphere = box.getBoundingSphere(new THREE.Sphere());
    var fov = camera.fov * (Math.PI / 180);
    var dist = (sphere.radius / Math.sin(fov / 2)) * 1.08;
    camera.position.setLength(dist);
  }
  fitCamera();

  // idle cursor-parallax (when the user isn't actively dragging)
  var pointer = { x: 0, y: 0 };
  var target = { x: 0, y: 0 };
  window.addEventListener('pointermove', function (e) {
    if (dragging) return;
    var rect = mount.getBoundingClientRect();
    var cx = rect.left + rect.width / 2;
    var cy = rect.top + rect.height / 2;
    target.x = Math.max(-1, Math.min(1, (e.clientX - cx) / (window.innerWidth / 2)));
    target.y = Math.max(-1, Math.min(1, (e.clientY - cy) / (window.innerHeight / 2)));
  }, { passive: true });

  // click-and-drag rotates the mark directly, with a bit of inertia on release
  var dragging = false;
  var dragRotation = { x: -0.1, y: 0 };
  var velocity = { x: 0, y: 0 };
  var last = { x: 0, y: 0 };

  canvas.style.touchAction = 'none';
  canvas.addEventListener('pointerdown', function (e) {
    dragging = true;
    velocity.x = 0; velocity.y = 0;
    last.x = e.clientX; last.y = e.clientY;
    canvas.setPointerCapture(e.pointerId);
    canvas.style.cursor = 'grabbing';
  });
  canvas.addEventListener('pointermove', function (e) {
    if (!dragging) return;
    var dx = e.clientX - last.x;
    var dy = e.clientY - last.y;
    last.x = e.clientX; last.y = e.clientY;
    velocity.y = dx * 0.008;
    velocity.x = dy * 0.008;
    dragRotation.y += velocity.y;
    dragRotation.x = Math.max(-1.1, Math.min(1.1, dragRotation.x + velocity.x));
  });
  function endDrag() { dragging = false; canvas.style.cursor = 'grab'; }
  canvas.addEventListener('pointerup', endDrag);
  canvas.addEventListener('pointercancel', endDrag);

  var running = false;
  var rafId = null;
  var t = 0;
  var autoSpin = 0;

  function render() {
    t += 0.008;
    if (!reduceMotion) {
      if (!dragging) {
        // inertia decay after release
        dragRotation.y += velocity.y;
        dragRotation.x = Math.max(-1.1, Math.min(1.1, dragRotation.x + velocity.x));
        velocity.x *= 0.94;
        velocity.y *= 0.94;
        autoSpin += 0.0035;
        pointer.x += (target.x - pointer.x) * 0.05;
        pointer.y += (target.y - pointer.y) * 0.05;
      }
      group.rotation.y = dragRotation.y + autoSpin - pointer.x * 0.16;
      group.rotation.x = dragRotation.x + pointer.y * 0.28;
      group.position.y = dragging ? 0 : Math.sin(t) * 0.12;
    }
    renderer.render(scene, camera);
    if (running) rafId = requestAnimationFrame(render);
  }

  function start() {
    if (running) return;
    running = true;
    render();
  }
  function stop() {
    running = false;
    if (rafId) cancelAnimationFrame(rafId);
  }

  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) start(); else stop();
      });
    }, { threshold: 0.05 }).observe(mount);
  } else {
    start();
  }

  document.addEventListener('visibilitychange', function () {
    if (document.hidden) stop(); else if (mount.getBoundingClientRect().top < window.innerHeight) start();
  });

  if ('ResizeObserver' in window) {
    new ResizeObserver(function () {
      var s = mount.clientWidth;
      if (!s) return;
      renderer.setSize(s, s);
    }).observe(mount);
  }

  // first frame rendered successfully — swap the static mark for the canvas,
  // inserted in the SVG's place so it keeps its position before the caption
  renderer.render(scene, camera);
  if (svg) {
    mount.insertBefore(canvas, svg);
    svg.style.display = 'none';
  } else {
    mount.insertBefore(canvas, mount.firstChild);
  }
  requestAnimationFrame(function () { canvas.classList.add('is-ready'); });
  start();
})();
