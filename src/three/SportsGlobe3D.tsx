import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { SportWithStats } from '../types/analytics';

interface SportsGlobe3DProps {
  sports: SportWithStats[];
  onSelectSport?: (slug: string) => void;
}

const _vec3 = new THREE.Vector3();
const _dummy = new THREE.Object3D();

function detectSoftwareGl(): boolean {
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
    if (!gl) return true;
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
    const gpu = String(gl.getParameter(param) || '');
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
  } catch {
    return true;
  }
}

export function SportsGlobe3D({ sports, onSelectSport }: SportsGlobe3DProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const onSelectRef = useRef(onSelectSport);
  onSelectRef.current = onSelectSport;

  const [hoveredSport, setHoveredSport] = useState<SportWithStats | null>(null);
  const [autoRotate, setAutoRotate] = useState(true);
  const [dockCollapsed, setDockCollapsed] = useState(false);
  const [cameraPreset, setCameraPreset] = useState<'orbit' | 'equator' | 'polar'>('orbit');
  const [webglUnavailable, setWebglUnavailable] = useState(false);

  const autoRotateRef = useRef(autoRotate);
  autoRotateRef.current = autoRotate;

  const presetTargetRef = useRef<{ pos: THREE.Vector3; active: boolean }>({
    pos: new THREE.Vector3(0, 1.6, 6.4),
    active: false,
  });

  useEffect(() => {
    if (cameraPreset === 'orbit') {
      presetTargetRef.current = { pos: new THREE.Vector3(0, 1.6, 6.4), active: true };
    } else if (cameraPreset === 'equator') {
      presetTargetRef.current = { pos: new THREE.Vector3(5.6, 0.4, 3.2), active: true };
    } else {
      presetTargetRef.current = { pos: new THREE.Vector3(0.4, 5.8, 2.8), active: true };
    }
  }, [cameraPreset]);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const isSoftwareGl = detectSoftwareGl();
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: !isSoftwareGl,
        alpha: true,
        powerPreference: 'high-performance',
      });
    } catch {
      setWebglUnavailable(true);
      return;
    }

    const width = container.clientWidth || 640;
    const height = container.clientHeight || 480;

    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);
    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    const onContextLost = (e: Event) => {
      e.preventDefault();
      setWebglUnavailable(true);
    };
    renderer.domElement.addEventListener('webglcontextlost', onContextLost);

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x060b18, 0.045);

    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    const envTexture = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = envTexture;
    pmremGenerator.dispose();

    const camera = new THREE.PerspectiveCamera(44, width / height, 0.1, 100);
    camera.position.set(0, 1.6, 6.4);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = !isSoftwareGl;
    controls.dampingFactor = 0.06;
    controls.enablePan = false;
    controls.minDistance = 3.8;
    controls.maxDistance = 10;
    controls.addEventListener('start', () => {
      presetTargetRef.current.active = false;
    });

    // 3-point warm/cool broadcast lighting rig
    const keyLight = new THREE.DirectionalLight(0xfff5e4, 2.2);
    keyLight.position.set(5, 6, 5);
    scene.add(keyLight);

    const hemiLight = new THREE.HemisphereLight(0x38bdf8, 0x060b18, 1.1);
    scene.add(hemiLight);

    const rimLight = new THREE.DirectionalLight(0x3b82f6, 1.6);
    rimLight.position.set(-5, -2, -4);
    scene.add(rimLight);

    // Composite 3D Sports Globe Group (Multi-part assembly)
    const globeGroup = new THREE.Group();
    scene.add(globeGroup);

    // 1. Inner dark obsidian core sphere
    const coreGeo = new THREE.IcosahedronGeometry(1.75, 4);
    const coreMat = new THREE.MeshStandardMaterial({
      color: 0x0b162c,
      roughness: 0.35,
      metalness: 0.72,
    });
    const coreMesh = new THREE.Mesh(coreGeo, coreMat);
    globeGroup.add(coreMesh);

    // 2. Geodesic lattice shell
    const wireGeo = new THREE.IcosahedronGeometry(1.79, 2);
    const wireMat = new THREE.MeshStandardMaterial({
      color: 0x3b82f6,
      wireframe: true,
      roughness: 0.25,
      metalness: 0.85,
      emissive: 0x1d4ed8,
      emissiveIntensity: 0.35,
    });
    const wireMesh = new THREE.Mesh(wireGeo, wireMat);
    globeGroup.add(wireMesh);

    // 3. Brushed titanium equatorial & meridian rings
    const ringMat = new THREE.MeshStandardMaterial({
      color: 0x94a3b8,
      metalness: 0.92,
      roughness: 0.18,
    });
    const eqRing = new THREE.Mesh(new THREE.TorusGeometry(2.25, 0.022, 16, 96), ringMat);
    eqRing.rotation.x = Math.PI / 2.2;
    globeGroup.add(eqRing);

    const merRing = new THREE.Mesh(
      new THREE.TorusGeometry(2.45, 0.015, 16, 96),
      new THREE.MeshStandardMaterial({
        color: 0x06b6d4,
        metalness: 0.85,
        roughness: 0.22,
        emissive: 0x0891b2,
        emissiveIntensity: 0.25,
      }),
    );
    merRing.rotation.y = Math.PI / 4;
    merRing.rotation.x = Math.PI / 5;
    globeGroup.add(merRing);

    // 4. Ground contact shadow ring below globe
    const basePlinth = new THREE.Mesh(
      new THREE.RingGeometry(1.6, 2.8, 64),
      new THREE.MeshBasicMaterial({
        color: 0x1d4ed8,
        transparent: true,
        opacity: 0.14,
        side: THREE.DoubleSide,
        depthWrite: false,
      }),
    );
    basePlinth.rotation.x = -Math.PI / 2;
    basePlinth.position.y = -2.35;
    scene.add(basePlinth);

    // 5. Orbiting Sport Node Satellites (3-part composite beacons)
    const clickableTargets: THREE.Object3D[] = [];
    const sportNodes: Array<{ group: THREE.Group; radius: number; speed: number; angle: number; yAmp: number }> = [];
    const activeSports = sports.length > 0 ? sports : [
      { id: 1, slug: 'cricket', name: 'Cricket', accentColor: '#3B82F6', totalComments: 12, positivePct: 58, negativePct: 25, neutralPct: 17, avgScore: 28, category: '', description: '', imagePath: '', isActive: true, trendingTopics: [] },
      { id: 2, slug: 'football', name: 'Football', accentColor: '#10B981', totalComments: 12, positivePct: 50, negativePct: 33, neutralPct: 17, avgScore: 18, category: '', description: '', imagePath: '', isActive: true, trendingTopics: [] },
      { id: 3, slug: 'basketball', name: 'Basketball', accentColor: '#06B6D4', totalComments: 12, positivePct: 50, negativePct: 33, neutralPct: 17, avgScore: 20, category: '', description: '', imagePath: '', isActive: true, trendingTopics: [] },
      { id: 4, slug: 'tennis', name: 'Tennis', accentColor: '#8B5CF6', totalComments: 12, positivePct: 50, negativePct: 33, neutralPct: 17, avgScore: 15, category: '', description: '', imagePath: '', isActive: true, trendingTopics: [] },
      { id: 5, slug: 'hockey', name: 'Hockey', accentColor: '#0EA5E9', totalComments: 12, positivePct: 50, negativePct: 33, neutralPct: 17, avgScore: 16, category: '', description: '', imagePath: '', isActive: true, trendingTopics: [] },
      { id: 6, slug: 'formula-1', name: 'Formula 1', accentColor: '#EF4444', totalComments: 12, positivePct: 48, negativePct: 34, neutralPct: 18, avgScore: 14, category: '', description: '', imagePath: '', isActive: true, trendingTopics: [] },
      { id: 7, slug: 'kabaddi', name: 'Kabaddi', accentColor: '#F59E0B', totalComments: 12, positivePct: 55, negativePct: 27, neutralPct: 18, avgScore: 22, category: '', description: '', imagePath: '', isActive: true, trendingTopics: [] },
      { id: 8, slug: 'esports', name: 'Esports', accentColor: '#22D3EE', totalComments: 12, positivePct: 54, negativePct: 28, neutralPct: 18, avgScore: 24, category: '', description: '', imagePath: '', isActive: true, trendingTopics: [] },
    ];

    activeSports.forEach((sp, i) => {
      const nodeGroup = new THREE.Group();
      const color = new THREE.Color(sp.accentColor || '#3B82F6');

      // Part A: Glowing crystal core
      const orb = new THREE.Mesh(
        new THREE.OctahedronGeometry(0.16, 1),
        new THREE.MeshStandardMaterial({
          color,
          emissive: color,
          emissiveIntensity: 0.45,
          roughness: 0.2,
          metalness: 0.35,
        }),
      );
      nodeGroup.add(orb);

      // Part B: Metallic collar ring
      const collar = new THREE.Mesh(
        new THREE.TorusGeometry(0.24, 0.018, 12, 32),
        new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.9, roughness: 0.2 }),
      );
      collar.rotation.x = Math.PI / 2;
      nodeGroup.add(collar);

      // Part C: Proxy hitbox for crisp raycasting
      const hitbox = new THREE.Mesh(
        new THREE.SphereGeometry(0.34, 8, 8),
        new THREE.MeshBasicMaterial({ visible: false }),
      );
      hitbox.userData.sport = sp;
      hitbox.layers.set(1);
      nodeGroup.add(hitbox);
      clickableTargets.push(hitbox);

      const angle = (i / activeSports.length) * Math.PI * 2;
      const radius = 2.65 + (i % 2) * 0.25;
      nodeGroup.position.set(Math.cos(angle) * radius, Math.sin(i * 1.1) * 0.65, Math.sin(angle) * radius);
      scene.add(nodeGroup);

      sportNodes.push({
        group: nodeGroup,
        radius,
        speed: 0.16 + (i % 3) * 0.03,
        angle,
        yAmp: 0.45 + (i % 2) * 0.25,
      });
    });

    // 6. InstancedMesh incoming comment data particles
    const particleCount = 140;
    const particleGeo = new THREE.BoxGeometry(0.045, 0.045, 0.045);
    const particleMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.3,
      metalness: 0.4,
    });
    const particles = new THREE.InstancedMesh(particleGeo, particleMat, particleCount);
    particles.frustumCulled = false;

    const particleMeta = Array.from({ length: particleCount }, (_, i) => {
      const polarityChoice = i % 10;
      const color =
        polarityChoice < 5
          ? new THREE.Color(0x10b981)
          : polarityChoice < 8
            ? new THREE.Color(0xef4444)
            : new THREE.Color(0xf59e0b);
      particles.setColorAt(i, color);
      return {
        theta: (i / particleCount) * Math.PI * 2,
        phi: ((i * 73) % 180) * (Math.PI / 180),
        dist: 2.1 + (i % 7) * 0.38,
        speed: 0.25 + (i % 5) * 0.08,
      };
    });
    if (particles.instanceColor) particles.instanceColor.needsUpdate = true;
    particles.computeBoundingSphere();
    scene.add(particles);

    if (!isSoftwareGl) {
      renderer.compile(scene, camera);
    }

    // Raycasting setup
    const raycaster = new THREE.Raycaster();
    raycaster.layers.set(1);
    const pointer = new THREE.Vector2();
    let lastRaycast = 0;

    const updatePointer = (ev: MouseEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.x = ((ev.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((ev.clientY - rect.top) / rect.height) * 2 + 1;
    };

    const onPointerMove = (ev: MouseEvent) => {
      const now = Date.now();
      if (now - lastRaycast < 50) return;
      lastRaycast = now;
      updatePointer(ev);
      raycaster.setFromCamera(pointer, camera);
      const hits = raycaster.intersectObjects(clickableTargets, false);
      if (hits.length > 0) {
        const sp = hits[0].object.userData.sport as SportWithStats;
        setHoveredSport(sp);
        renderer.domElement.style.cursor = 'pointer';
      } else {
        setHoveredSport(null);
        renderer.domElement.style.cursor = 'grab';
      }
    };

    const onClick = (ev: MouseEvent) => {
      updatePointer(ev);
      raycaster.setFromCamera(pointer, camera);
      const hits = raycaster.intersectObjects(clickableTargets, false);
      if (hits.length > 0) {
        const sp = hits[0].object.userData.sport as SportWithStats;
        onSelectRef.current?.(sp.slug);
      }
    };

    renderer.domElement.addEventListener('mousemove', onPointerMove);
    renderer.domElement.addEventListener('click', onClick);

    const onResize = () => {
      if (!container) return;
      const w = container.clientWidth || 640;
      const h = container.clientHeight || 480;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', onResize);

    // Animation loop with software WebGL pacing
    let frameId = 0;
    let disposed = false;
    const clock = new THREE.Clock();

    function afterDraw(cb: () => void) {
      const gl = renderer.getContext() as WebGL2RenderingContext;
      const sync = gl.fenceSync ? gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0) : null;
      gl.flush();
      const poll = () => {
        if (disposed) return;
        const state = sync && gl.getSyncParameter ? gl.getSyncParameter(sync, gl.SYNC_STATUS) : gl.SIGNALED;
        if (state === gl.UNSIGNALED) {
          frameId = window.setTimeout(poll, 5);
        } else {
          if (sync && gl.deleteSync) gl.deleteSync(sync);
          frameId = window.setTimeout(cb, 80);
        }
      };
      frameId = window.setTimeout(poll, 5);
    }

    function tick() {
      if (disposed) return;
      const dt = Math.min(clock.getDelta(), 0.05);
      const elapsed = clock.getElapsedTime();

      if (autoRotateRef.current) {
        globeGroup.rotation.y += dt * 0.22;
        merRing.rotation.z += dt * 0.14;
      }

      if (presetTargetRef.current.active) {
        camera.position.x = THREE.MathUtils.damp(camera.position.x, presetTargetRef.current.pos.x, 4.5, dt);
        camera.position.y = THREE.MathUtils.damp(camera.position.y, presetTargetRef.current.pos.y, 4.5, dt);
        camera.position.z = THREE.MathUtils.damp(camera.position.z, presetTargetRef.current.pos.z, 4.5, dt);
        if (camera.position.distanceTo(presetTargetRef.current.pos) < 0.05) {
          presetTargetRef.current.active = false;
        }
      }

      // Orbit sport beacons
      for (let i = 0; i < sportNodes.length; i++) {
        const node = sportNodes[i];
        const a = node.angle + elapsed * (autoRotateRef.current ? node.speed : 0.03);
        node.group.position.set(
          Math.cos(a) * node.radius,
          Math.sin(elapsed * 0.7 + i) * node.yAmp,
          Math.sin(a) * node.radius,
        );
        node.group.rotation.y += dt * 0.9;
      }

      // Animate incoming comment particles spiraling inward
      for (let i = 0; i < particleCount; i++) {
        const m = particleMeta[i];
        const radial = 1.9 + ((m.dist - elapsed * m.speed) % 2.4 + 2.4) % 2.4;
        const theta = m.theta + elapsed * 0.25;
        _vec3.set(
          Math.sin(m.phi) * Math.cos(theta) * radial,
          Math.cos(m.phi) * radial * 0.75,
          Math.sin(m.phi) * Math.sin(theta) * radial,
        );
        _dummy.position.copy(_vec3);
        _dummy.rotation.set(elapsed + i, elapsed * 0.5, 0);
        const s = 0.7 + (4.3 - radial) * 0.15;
        _dummy.scale.setScalar(Math.max(0.4, s));
        _dummy.updateMatrix();
        particles.setMatrixAt(i, _dummy.matrix);
      }
      particles.instanceMatrix.needsUpdate = true;

      controls.update();
      renderer.render(scene, camera);

      if (isSoftwareGl) afterDraw(tick);
      else frameId = requestAnimationFrame(tick);
    }

    tick();

    return () => {
      disposed = true;
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      window.removeEventListener('resize', onResize);
      renderer.domElement.removeEventListener('mousemove', onPointerMove);
      renderer.domElement.removeEventListener('click', onClick);
      renderer.domElement.removeEventListener('webglcontextlost', onContextLost);
      controls.dispose();
      envTexture.dispose();
      scene.traverse((obj) => {
        if ((obj as THREE.Mesh).isMesh) {
          const mesh = obj as THREE.Mesh;
          mesh.geometry?.dispose();
          if (Array.isArray(mesh.material)) mesh.material.forEach((m) => m.dispose());
          else mesh.material?.dispose();
        }
      });
      renderer.dispose();
    };
  }, [sports]);

  if (webglUnavailable) {
    return (
      <div className="relative w-full h-full min-h-[420px] rounded-xl border border-slate-800 bg-[#0B1324] flex flex-col items-center justify-center p-8 text-center">
        <p className="font-display text-lg font-semibold text-slate-200">
          3D Sports Telemetry Globe
        </p>
        <p className="mt-2 max-w-md text-sm text-slate-400">
          WebGL rendering context is unavailable on this device. All 8 sports analytics modules remain fully interactive below.
        </p>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full min-h-[440px] lg:min-h-[540px] rounded-xl overflow-hidden border border-slate-800/80 bg-[#070E1E]">
      {/* Dedicated isolated WebGL mount */}
      <div ref={mountRef} className="w-full h-full min-h-[440px] lg:min-h-[540px]" />

      {/* Minimal top-left sport inspection readout on hover */}
      {hoveredSport && (
        <div className="pointer-events-none absolute top-4 left-4 z-10 rounded-lg border border-blue-500/30 bg-[#0B1324]/95 px-3.5 py-2.5 shadow-lg">
          <div className="text-xs font-medium text-blue-400">{hoveredSport.name} · Click to inspect</div>
          <div className="mt-1 flex items-center gap-3 font-mono-tabular text-xs text-slate-200">
            <span>{hoveredSport.totalComments} comments</span>
            <span>Pos {hoveredSport.positivePct}%</span>
            <span>Score {hoveredSport.avgScore > 0 ? `+${hoveredSport.avgScore}` : hoveredSport.avgScore}</span>
          </div>
        </div>
      )}

      {/* Collapsible Bottom Control Dock (no backdrop-filter over WebGL) */}
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center">
        <button
          type="button"
          onClick={() => setDockCollapsed((v) => !v)}
          className="mb-1.5 rounded-md border border-slate-700/80 bg-[#0B1324]/95 px-2.5 py-1 text-[11px] font-medium text-slate-300 hover:text-white transition-colors whitespace-nowrap"
        >
          {dockCollapsed ? 'Show Globe Controls' : 'Hide Controls'}
        </button>

        {!dockCollapsed && (
          <div className="flex flex-wrap items-center gap-2 rounded-lg border border-slate-700/80 bg-[#0B1324]/95 px-3 py-1.5 shadow-xl">
            <button
              type="button"
              onClick={() => setAutoRotate((r) => !r)}
              className={`px-2.5 py-1 rounded text-xs font-medium transition-colors whitespace-nowrap ${
                autoRotate ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-800'
              }`}
            >
              {autoRotate ? 'Pause Orbit' : 'Resume Orbit'}
            </button>
            <span className="h-3.5 w-px bg-slate-700" aria-hidden="true" />
            {(['orbit', 'equator', 'polar'] as const).map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => setCameraPreset(preset)}
                className={`px-2.5 py-1 rounded text-xs font-medium capitalize transition-colors whitespace-nowrap ${
                  cameraPreset === preset
                    ? 'bg-slate-800 text-cyan-300 border border-cyan-500/40'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {preset} View
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
