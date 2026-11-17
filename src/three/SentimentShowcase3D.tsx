import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { AnalyticsKpis, SportComparisonRow } from '../types/analytics';

interface SentimentShowcase3DProps {
  kpis: AnalyticsKpis;
  sportsComparison: SportComparisonRow[];
  onSelectSport?: (slug: string) => void;
}

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

export function SentimentShowcase3D({
  kpis,
  sportsComparison,
  onSelectSport,
}: SentimentShowcase3DProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const onSelectRef = useRef(onSelectSport);
  onSelectRef.current = onSelectSport;

  const [mode, setMode] = useState<'combined' | 'spheres' | 'bars'>('combined');
  const [hoveredLabel, setHoveredLabel] = useState<string | null>(null);
  const [dockCollapsed, setDockCollapsed] = useState(false);

  const modeRef = useRef(mode);
  modeRef.current = mode;

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
      return;
    }

    const width = container.clientWidth || 720;
    const height = container.clientHeight || 380;

    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.08;
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);
    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x060b18, 0.035);

    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    const envTex = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = envTex;
    pmremGenerator.dispose();

    const camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 100);
    camera.position.set(0, 4.2, 10.5);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = !isSoftwareGl;
    controls.dampingFactor = 0.06;
    controls.maxPolarAngle = Math.PI / 2.05;
    controls.minDistance = 5;
    controls.maxDistance = 16;

    const keyLight = new THREE.DirectionalLight(0xfff4e0, 2.2);
    keyLight.position.set(6, 9, 6);
    scene.add(keyLight);

    const hemiLight = new THREE.HemisphereLight(0x38bdf8, 0x060b18, 1.0);
    scene.add(hemiLight);

    const rimLight = new THREE.DirectionalLight(0x6366f1, 1.4);
    rimLight.position.set(-6, 4, -5);
    scene.add(rimLight);

    // Calibrated stage plinth
    const floorGrid = new THREE.GridHelper(16, 16, 0x1e3a8a, 0x0f172a);
    floorGrid.position.y = -0.02;
    scene.add(floorGrid);

    const plinth = new THREE.Mesh(
      new THREE.CylinderGeometry(5.6, 5.9, 0.16, 48),
      new THREE.MeshStandardMaterial({ color: 0x0b1324, roughness: 0.4, metalness: 0.65 }),
    );
    plinth.position.y = -0.1;
    scene.add(plinth);

    const raycastTargets: THREE.Object3D[] = [];

    // Group A: 3D Sentiment Spheres (Positive, Neutral, Negative)
    const spheresGroup = new THREE.Group();
    scene.add(spheresGroup);

    const total = Math.max(1, kpis.totalComments);
    const sphereSpecs = [
      {
        label: `Positive · ${kpis.positiveCount} (${kpis.positivePct}%)`,
        color: 0x10b981,
        x: -2.4,
        scale: 0.55 + (kpis.positiveCount / total) * 0.85,
      },
      {
        label: `Neutral · ${kpis.neutralCount} (${kpis.neutralPct}%)`,
        color: 0xf59e0b,
        x: 0,
        scale: 0.5 + (kpis.neutralCount / total) * 0.85,
      },
      {
        label: `Negative · ${kpis.negativeCount} (${kpis.negativePct}%)`,
        color: 0xef4444,
        x: 2.4,
        scale: 0.55 + (kpis.negativeCount / total) * 0.85,
      },
    ];

    const sphereMeshes: THREE.Group[] = [];
    sphereSpecs.forEach((spec) => {
      const g = new THREE.Group();
      const sphere = new THREE.Mesh(
        new THREE.SphereGeometry(spec.scale, 32, 32),
        new THREE.MeshPhysicalMaterial({
          color: spec.color,
          roughness: 0.18,
          metalness: 0.35,
          clearcoat: 0.9,
          emissive: spec.color,
          emissiveIntensity: 0.18,
        }),
      );
      sphere.userData.label = spec.label;
      sphere.layers.set(1);
      g.add(sphere);
      raycastTargets.push(sphere);

      const halo = new THREE.Mesh(
        new THREE.TorusGeometry(spec.scale + 0.18, 0.018, 12, 48),
        new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.9, roughness: 0.2 }),
      );
      halo.rotation.x = Math.PI / 2.4;
      g.add(halo);

      // Pedestal ring
      const base = new THREE.Mesh(
        new THREE.CylinderGeometry(0.45, 0.55, 0.1, 24),
        new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.8, roughness: 0.25 }),
      );
      base.position.y = -1.35;
      g.add(base);

      g.position.set(spec.x, 1.4, -1.6);
      spheresGroup.add(g);
      sphereMeshes.push(g);
    });

    // Group B: 3D Sport Comparison Bars (all 8 sports)
    const barsGroup = new THREE.Group();
    scene.add(barsGroup);

    const maxComments = Math.max(1, ...sportsComparison.map((s) => s.total));
    const barCount = sportsComparison.length;
    const spacing = 1.05;
    const startX = -((barCount - 1) * spacing) / 2;

    sportsComparison.forEach((sp, i) => {
      const h = Math.max(0.35, (sp.total / maxComments) * 2.6);
      const colColor = new THREE.Color(sp.accentColor || '#3B82F6');

      const barGroup = new THREE.Group();
      barGroup.position.set(startX + i * spacing, 0, 1.35);

      const col = new THREE.Mesh(
        new THREE.BoxGeometry(0.54, h, 0.54),
        new THREE.MeshStandardMaterial({
          color: colColor,
          roughness: 0.28,
          metalness: 0.55,
          emissive: colColor,
          emissiveIntensity: 0.15,
        }),
      );
      col.position.y = h / 2;
      col.userData.label = `${sp.sport} · ${sp.total} comments · Avg ${sp.avgScore > 0 ? `+${sp.avgScore}` : sp.avgScore}`;
      col.userData.slug = sp.slug;
      col.layers.set(1);
      barGroup.add(col);
      raycastTargets.push(col);

      // Top cap accent
      const cap = new THREE.Mesh(
        new THREE.BoxGeometry(0.6, 0.06, 0.6),
        new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.9, roughness: 0.15 }),
      );
      cap.position.y = h + 0.03;
      barGroup.add(cap);

      barsGroup.add(barGroup);
    });

    const raycaster = new THREE.Raycaster();
    raycaster.layers.set(1);
    const pointer = new THREE.Vector2();
    let lastRaycast = 0;

    const onPointerMove = (ev: MouseEvent) => {
      const now = Date.now();
      if (now - lastRaycast < 50) return;
      lastRaycast = now;
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.x = ((ev.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((ev.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(pointer, camera);
      const hits = raycaster.intersectObjects(raycastTargets, false);
      if (hits.length > 0) {
        setHoveredLabel(hits[0].object.userData.label || null);
        renderer.domElement.style.cursor = hits[0].object.userData.slug ? 'pointer' : 'default';
      } else {
        setHoveredLabel(null);
        renderer.domElement.style.cursor = 'grab';
      }
    };

    const onClick = (ev: MouseEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.x = ((ev.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((ev.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(pointer, camera);
      const hits = raycaster.intersectObjects(raycastTargets, false);
      if (hits.length > 0 && hits[0].object.userData.slug) {
        onSelectRef.current?.(hits[0].object.userData.slug);
      }
    };

    renderer.domElement.addEventListener('mousemove', onPointerMove);
    renderer.domElement.addEventListener('click', onClick);

    const onResize = () => {
      if (!container) return;
      const w = container.clientWidth || 720;
      const h = container.clientHeight || 380;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', onResize);

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
        if (state === gl.UNSIGNALED) frameId = window.setTimeout(poll, 5);
        else {
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

      const activeMode = modeRef.current;
      spheresGroup.visible = activeMode !== 'bars';
      barsGroup.visible = activeMode !== 'spheres';

      sphereMeshes.forEach((g, idx) => {
        g.position.y = 1.45 + Math.sin(elapsed * 1.4 + idx * 1.3) * 0.14;
        g.children[1].rotation.z += dt * 0.6;
      });

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
      controls.dispose();
      envTex.dispose();
      scene.traverse((obj) => {
        if ((obj as THREE.Mesh).isMesh) {
          const m = obj as THREE.Mesh;
          m.geometry?.dispose();
          if (Array.isArray(m.material)) m.material.forEach((mat) => mat.dispose());
          else m.material?.dispose();
        }
      });
      renderer.dispose();
    };
  }, [kpis, sportsComparison]);

  return (
    <div className="relative w-full h-[380px] rounded-xl overflow-hidden border border-slate-800/80 bg-[#070E1E]">
      <div ref={mountRef} className="w-full h-full" />

      {hoveredLabel && (
        <div className="pointer-events-none absolute top-3 left-3 z-10 rounded-lg border border-blue-500/30 bg-[#0B1324]/95 px-3 py-1.5 font-mono-tabular text-xs text-slate-100">
          {hoveredLabel}
        </div>
      )}

      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center">
        <button
          type="button"
          onClick={() => setDockCollapsed((v) => !v)}
          className="mb-1 rounded border border-slate-700/80 bg-[#0B1324]/95 px-2.5 py-0.5 text-[11px] font-medium text-slate-300 hover:text-white"
        >
          {dockCollapsed ? 'Show 3D Controls' : 'Hide Controls'}
        </button>
        {!dockCollapsed && (
          <div className="flex items-center gap-1.5 rounded-lg border border-slate-700/80 bg-[#0B1324]/95 p-1">
            {([
              ['combined', 'Combined 3D'],
              ['spheres', 'Sentiment Spheres'],
              ['bars', '3D Sport Bars'],
            ] as const).map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setMode(key)}
                className={`px-2.5 py-1 rounded text-xs font-medium transition-colors whitespace-nowrap ${
                  mode === key ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-800'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
