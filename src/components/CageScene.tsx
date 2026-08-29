import { Grid, OrbitControls } from '@react-three/drei'
import { Canvas, useThree } from '@react-three/fiber'
import { useLayoutEffect, useMemo, useRef, type RefObject } from 'react'
import {
  BufferGeometry,
  CanvasTexture,
  CatmullRomCurve3,
  CurvePath,
  DoubleSide,
  Float32BufferAttribute,
  LineCurve3,
  Path,
  RepeatWrapping,
  SRGBColorSpace,
  Shape,
  ShapeGeometry,
  TubeGeometry,
  Vector3,
} from 'three'
import { hoopPointAt, type CageGeometry, type Point } from '../lib/geometry'

type ControlsHandle = {
  target: Vector3
  update: () => void
}
import { BIRDIES_COLORS } from '../lib/birdies'
import { HOOP_MATERIAL, WALL_MESH, type CageInputs } from '../lib/model'

export type ViewId = 'iso' | 'end' | 'side' | 'top' | 'plan'

type CageSceneProps = {
  input: CageInputs
  geo: CageGeometry
  view: ViewId
  showNet: boolean
  showMesh: boolean
  doorOpen: boolean
  selectedId: string | null
  onSelect: (id: string | null) => void
}

function gridTexture(apertureMm: number, line: string, fill: string): CanvasTexture {
  const px = 64
  const c = document.createElement('canvas')
  c.width = px
  c.height = px
  const ctx = c.getContext('2d')
  if (!ctx) return new CanvasTexture(c)
  ctx.fillStyle = fill
  ctx.fillRect(0, 0, px, px)
  ctx.strokeStyle = line
  ctx.lineWidth = apertureMm <= 15 ? 2.4 : 1.5
  ctx.strokeRect(0.5, 0.5, px - 1, px - 1)
  const t = new CanvasTexture(c)
  t.wrapS = RepeatWrapping
  t.wrapT = RepeatWrapping
  t.anisotropy = 8
  t.colorSpace = SRGBColorSpace
  return t
}

function tunnelGeometry(points: Point[], z0: number, z1: number): BufferGeometry {
  const pos: number[] = []
  const n = points.length
  for (const p of points) pos.push(p.x, p.y, z0)
  for (const p of points) pos.push(p.x, p.y, z1)
  const idx: number[] = []
  for (let i = 0; i < n - 1; i++) {
    const a = i
    const b = i + 1
    const c = i + n
    const d = i + 1 + n
    idx.push(a, b, d, a, d, c)
  }
  const g = new BufferGeometry()
  g.setAttribute('position', new Float32BufferAttribute(pos, 3))
  g.setIndex(idx)
  g.computeVertexNormals()
  return g
}

function endWallGeometry(
  hoop: Point[],
  width: number,
  door: { x0: number; x1: number; height: number } | null,
): ShapeGeometry {
  const shape = new Shape()
  shape.moveTo(-width / 2, 0)
  for (const p of hoop) shape.lineTo(p.x, p.y)
  shape.lineTo(width / 2, 0)
  shape.lineTo(-width / 2, 0)
  if (door) {
    const hole = new Path()
    hole.moveTo(door.x0, 0)
    hole.lineTo(door.x1, 0)
    hole.lineTo(door.x1, door.height)
    hole.lineTo(door.x0, door.height)
    hole.closePath()
    shape.holes.push(hole)
  }
  return new ShapeGeometry(shape, 8)
}

function CameraRig({
  view,
  length,
  width,
  peak,
  controlsRef,
}: {
  view: ViewId
  length: number
  width: number
  peak: number
  controlsRef: RefObject<ControlsHandle | null>
}) {
  const camera = useThree((s) => s.camera)
  useLayoutEffect(() => {
    const span = Math.max(length, width, 4)
    const lookY = peak * 0.42
    const pos: [number, number, number] =
      view === 'end'
        ? [0, peak * 0.85, -length / 2 - span * 0.9]
        : view === 'side'
          ? [width / 2 + span * 0.85, peak * 0.8, length * 0.12]
          : view === 'top'
            ? [0.2, span * 1.4, 0.2]
            : [width * 0.95 + 2.5, peak * 1.35 + 1.4, length * 0.7 + 2]
    const aim = () => {
      camera.position.set(...pos)
      camera.lookAt(0, lookY, 0)
      camera.updateProjectionMatrix()
      const c = controlsRef.current
      if (c) {
        c.target.set(0, lookY, 0)
        c.update()
      }
    }
    aim()
    const id = requestAnimationFrame(aim)
    return () => cancelAnimationFrame(id)
  }, [view, length, width, peak, camera, controlsRef])
  return null
}

function CageModel({
  input,
  geo,
  showNet,
  showMesh,
  doorOpen,
  selectedId,
  onSelect,
}: Omit<CageSceneProps, 'view'>) {
  const hoopMat = HOOP_MATERIAL[input.hoopMaterial]
  const meshSpec = WALL_MESH[input.wallMesh]
  const pipeR = hoopMat.odMm / 2000

  const meshTex = useMemo(
    () => gridTexture(meshSpec.apertureMm, '#9aae7a', 'rgba(180,200,150,0.22)'),
    [meshSpec.apertureMm],
  )
  const netTex = useMemo(() => gridTexture(8, 'rgba(240,255,220,0.55)', 'rgba(255,255,255,0.06)'), [])

  const hoopTubes = useMemo(() => {
    const pts = geo.hoopPoints.map((p) => new Vector3(p.x, p.y, 0))
    const path = new CurvePath<Vector3>()
    const insert = geo.pipeInsertM
    if (insert > 0.02 && pts.length > 4) {
      const leftBot = pts[0]!
      const leftTop = pts[1]!
      const rightTop = pts[pts.length - 2]!
      const rightBot = pts[pts.length - 1]!
      const arc = pts.slice(1, -1)
      path.add(new LineCurve3(leftBot, leftTop))
      path.add(new CatmullRomCurve3(arc))
      path.add(new LineCurve3(rightTop, rightBot))
    } else {
      path.add(new CatmullRomCurve3(pts))
    }
    return new TubeGeometry(path, 48, pipeR, 10, false)
  }, [geo.hoopPoints, geo.pipeInsertM, pipeR])

  const netGeom = useMemo(
    () => tunnelGeometry(geo.netPoints, -input.length / 2, input.length / 2),
    [geo.netPoints, input.length],
  )
  const doorEnd = useMemo(
    () =>
      endWallGeometry(geo.hoopPoints, input.width, {
        x0: -input.doorWidth / 2,
        x1: input.doorWidth / 2,
        height: input.doorHeight,
      }),
    [geo.hoopPoints, input.width, input.doorWidth, input.doorHeight],
  )
  const farEnd = useMemo(
    () => endWallGeometry(geo.hoopPoints, input.width, null),
    [geo.hoopPoints, input.width],
  )
  const ridgeGeom = useMemo(
    () =>
      new TubeGeometry(
        new CatmullRomCurve3([
          new Vector3(0, input.peakHeight, -input.length / 2),
          new Vector3(0, input.peakHeight, input.length / 2),
        ]),
        2,
        pipeR * 0.85,
        6,
        false,
      ),
    [input.peakHeight, input.length, pipeR],
  )
  const purlinGeoms = useMemo(() => {
    if (input.purlins !== 3) return []
    return [0.55, -0.55].map((t) => {
      const p = hoopPointAt(geo.span, geo.rise, geo.hoopStartY, t)
      return new TubeGeometry(
        new CatmullRomCurve3([
          new Vector3(p.x, p.y, -input.length / 2),
          new Vector3(p.x, p.y, input.length / 2),
        ]),
        2,
        pipeR * 0.8,
        6,
        false,
      )
    })
  }, [input.purlins, input.length, geo.span, geo.rise, geo.hoopStartY, pipeR])

  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
        <planeGeometry args={[40, 40]} />
        <meshLambertMaterial color="#4a6a40" />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.002, 0]}>
        <planeGeometry args={[input.width, input.length]} />
        <meshLambertMaterial color="#6a4a32" />
      </mesh>

      {geo.beds.map((b) => {
        const hex = BIRDIES_COLORS[b.source.color].hex
        const on = b.id === selectedId
        return (
          <group
            key={b.id}
            position={[b.x, 0, b.z]}
            onPointerDown={(e) => {
              e.stopPropagation()
              onSelect(b.id)
            }}
          >
            <mesh position={[0, b.h / 2, 0]}>
              <boxGeometry args={[b.w, b.h, b.d]} />
              <meshStandardMaterial color={hex} emissive={on ? '#445522' : '#000000'} roughness={0.55} />
            </mesh>
            <mesh position={[0, b.h + 0.015, 0]} rotation={[-Math.PI / 2, 0, 0]}>
              <planeGeometry args={[Math.max(0.1, b.w - 0.06), Math.max(0.1, b.d - 0.06)]} />
              <meshStandardMaterial color="#3f3424" />
            </mesh>
            {on ? (
              <mesh position={[0, b.h / 2, 0]}>
                <boxGeometry args={[b.w + 0.04, b.h + 0.04, b.d + 0.04]} />
                <meshBasicMaterial color="#f4f1c0" wireframe />
              </mesh>
            ) : null}
          </group>
        )
      })}

      {showMesh ? (
        <>
          {(() => {
            const sideW = (input.width - input.doorWidth) / 2
            const zDoor = -input.length / 2
            return (
              <>
                <mesh position={[-(input.doorWidth / 2 + sideW / 2), input.meshHeight / 2, zDoor]}>
                  <planeGeometry args={[sideW, input.meshHeight]} />
                  <meshStandardMaterial map={meshTex} transparent opacity={0.72} side={DoubleSide} color="#c5d6a8" />
                </mesh>
                <mesh position={[input.doorWidth / 2 + sideW / 2, input.meshHeight / 2, zDoor]}>
                  <planeGeometry args={[sideW, input.meshHeight]} />
                  <meshStandardMaterial map={meshTex} transparent opacity={0.72} side={DoubleSide} color="#c5d6a8" />
                </mesh>
              </>
            )
          })()}
          <mesh position={[0, input.meshHeight / 2, input.length / 2]} rotation={[0, Math.PI, 0]}>
            <planeGeometry args={[input.width, input.meshHeight]} />
            <meshStandardMaterial map={meshTex} transparent opacity={0.72} side={DoubleSide} color="#c5d6a8" />
          </mesh>
          <mesh position={[-input.width / 2, input.meshHeight / 2, 0]} rotation={[0, Math.PI / 2, 0]}>
            <planeGeometry args={[input.length, input.meshHeight]} />
            <meshStandardMaterial map={meshTex} transparent opacity={0.72} side={DoubleSide} color="#c5d6a8" />
          </mesh>
          <mesh position={[input.width / 2, input.meshHeight / 2, 0]} rotation={[0, -Math.PI / 2, 0]}>
            <planeGeometry args={[input.length, input.meshHeight]} />
            <meshStandardMaterial map={meshTex} transparent opacity={0.72} side={DoubleSide} color="#c5d6a8" />
          </mesh>
        </>
      ) : null}

      {geo.hoopZs.map((z, i) => (
        <mesh key={i} geometry={hoopTubes} position={[0, 0, z]}>
          <meshStandardMaterial color={hoopMat.colour} roughness={0.42} metalness={0.08} transparent opacity={0.82} />
        </mesh>
      ))}

      {geo.hoopZs.map((z, i) => {
        const sleeveTop = geo.hoopStartY
        const sleeveBot = Math.max(0, sleeveTop - geo.pipeInsertM)
        const postTop = Math.max(input.meshHeight, sleeveTop)
        const postBot = -0.35
        const stubR = Math.min(pipeR * 0.62, 0.018)
        const timber = input.postType === 'pine90'
        return (
          <group key={`p-${i}`}>
            {([-1, 1] as const).map((side) => (
              <group key={side} position={[(side * input.width) / 2, 0, z]}>
                {timber ? (
                  <mesh position={[0, (postTop + postBot) / 2, 0]}>
                    <boxGeometry args={[0.09, postTop - postBot, 0.09]} />
                    <meshStandardMaterial color="#7a4e24" />
                  </mesh>
                ) : (
                  <mesh position={[0, (postTop + postBot) / 2, 0]}>
                    <cylinderGeometry args={[stubR, stubR, postTop - postBot, 8]} />
                    <meshStandardMaterial color="#8a9298" metalness={0.35} roughness={0.4} />
                  </mesh>
                )}
                <mesh position={[0, (sleeveTop + sleeveBot) / 2, 0]}>
                  <cylinderGeometry args={[stubR * 0.92, stubR * 0.92, Math.max(0.04, sleeveTop - sleeveBot), 8]} />
                  <meshStandardMaterial color="#c5cdd2" metalness={0.45} roughness={0.28} />
                </mesh>
              </group>
            ))}
          </group>
        )
      })}

      <mesh geometry={ridgeGeom}>
        <meshStandardMaterial color={hoopMat.colour} />
      </mesh>
      {purlinGeoms.map((g, i) => (
        <mesh key={`purlin-${i}`} geometry={g}>
          <meshStandardMaterial color={hoopMat.colour} />
        </mesh>
      ))}

      {showNet ? (
        <>
          <mesh geometry={netGeom}>
            <meshStandardMaterial
              map={netTex}
              transparent
              opacity={0.28}
              side={DoubleSide}
              depthWrite={false}
              color="#e8f5c8"
            />
          </mesh>
          <mesh geometry={doorEnd} position={[0, 0, -input.length / 2]}>
            <meshStandardMaterial map={netTex} transparent opacity={0.32} side={DoubleSide} color="#e8f5c8" />
          </mesh>
          <mesh geometry={farEnd} position={[0, 0, input.length / 2]}>
            <meshStandardMaterial map={netTex} transparent opacity={0.32} side={DoubleSide} color="#e8f5c8" />
          </mesh>
        </>
      ) : null}

      <group
        position={[-input.doorWidth / 2, 0, -input.length / 2 - 0.04]}
        rotation={[0, doorOpen ? 1.45 : 0, 0]}
      >
        <mesh position={[input.doorWidth / 2, input.doorHeight / 2, 0]}>
          <boxGeometry args={[input.doorWidth, input.doorHeight, 0.05]} />
          <meshStandardMaterial color="#6b8f3a" transparent opacity={0.55} />
        </mesh>
        <mesh position={[0.03, input.doorHeight / 2, 0]}>
          <boxGeometry args={[0.06, input.doorHeight, 0.08]} />
          <meshStandardMaterial color="#6a4420" />
        </mesh>
        <mesh position={[input.doorWidth - 0.03, input.doorHeight / 2, 0]}>
          <boxGeometry args={[0.06, input.doorHeight, 0.08]} />
          <meshStandardMaterial color="#6a4420" />
        </mesh>
      </group>

      {/* 1.7 m person on the centre path */}
      <group position={[0, 0, -input.length / 2 + 1.4]}>
        <mesh position={[0, 0.85, 0]}>
          <capsuleGeometry args={[0.16, 0.95, 4, 8]} />
          <meshStandardMaterial color="#d7c4a8" />
        </mesh>
        <mesh position={[0, 1.58, 0]}>
          <sphereGeometry args={[0.13, 12, 12]} />
          <meshStandardMaterial color="#d7c4a8" />
        </mesh>
      </group>
    </group>
  )
}

export function CageScene({
  input,
  geo,
  view,
  showNet,
  showMesh,
  doorOpen,
  selectedId,
  onSelect,
}: CageSceneProps) {
  const controlsRef = useRef<ControlsHandle | null>(null)

  return (
    <Canvas
      camera={{ fov: 42, near: 0.1, far: 80, position: [8, 7, 16] }}
      gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }}
      dpr={[1, 2]}
      style={{ position: 'absolute', inset: 0 }}
    >
      <color attach="background" args={['#24342c']} />
      <ambientLight intensity={1.35} />
      <hemisphereLight args={['#e7f0ff', '#5a6a48', 1.1]} />
      <directionalLight position={[10, 18, -8]} intensity={2.2} />
      <directionalLight position={[-8, 8, 10]} intensity={0.55} />
      <Grid
        args={[30, 30]}
        cellSize={1}
        cellThickness={0.6}
        cellColor="#2e3a2a"
        sectionSize={5}
        sectionThickness={1.1}
        sectionColor="#4a5c40"
        fadeDistance={28}
        infiniteGrid
        position={[0, -0.012, 0]}
      />
      <CageModel
        input={input}
        geo={geo}
        showNet={showNet}
        showMesh={showMesh}
        doorOpen={doorOpen}
        selectedId={selectedId}
        onSelect={onSelect}
      />
      <OrbitControls
        ref={(el) => {
          controlsRef.current = el as ControlsHandle | null
        }}
        makeDefault
        target={[0, 1.1, 0]}
        maxPolarAngle={Math.PI / 2 - 0.04}
        minDistance={3}
        maxDistance={48}
      />
      <CameraRig
        view={view}
        length={input.length}
        width={input.width}
        peak={input.peakHeight}
        controlsRef={controlsRef}
      />
    </Canvas>
  )
}
