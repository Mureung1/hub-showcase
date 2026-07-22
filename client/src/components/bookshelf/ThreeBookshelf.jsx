import { useEffect, useMemo } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { ContactShadows, RoundedBox } from '@react-three/drei';
import { animated, useSpring } from '@react-spring/three';
import { CanvasTexture, DoubleSide, SRGBColorSpace } from 'three';

const BOOK_COLORS = [
  { cover: '#a94f3b', edge: '#733124', accent: '#e6b06d' },
  { cover: '#3f5558', edge: '#26383b', accent: '#d9b87b' },
  { cover: '#8b7048', edge: '#5f472a', accent: '#f0d7a2' },
  { cover: '#6f5873', edge: '#49364d', accent: '#dec0d2' },
  { cover: '#56715c', edge: '#354b3a', accent: '#d6c789' },
];

function makeBookLabelTexture(book, accent, variant) {
  const canvas = document.createElement('canvas');
  canvas.width = variant === 'spine' ? 192 : 512;
  canvas.height = 768;
  const context = canvas.getContext('2d');

  context.clearRect(0, 0, canvas.width, canvas.height);
  context.textAlign = 'center';
  context.textBaseline = 'middle';

  if (variant === 'spine') {
    context.save();
    context.translate(canvas.width / 2, canvas.height / 2);
    context.rotate(Math.PI / 2);
    context.fillStyle = '#fff8e9';
    context.font = '600 38px Georgia, serif';
    context.fillText(book.title, 0, 0, canvas.height - 150);
    context.fillStyle = accent;
    context.fillRect(-210, 42, 420, 5);
    context.restore();
  } else if (variant === 'page') {
    context.fillStyle = '#fffaf0';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.strokeStyle = '#d8cfc1';
    context.lineWidth = 2;
    for (let y = 92; y <= 690; y += 54) {
      context.beginPath();
      context.moveTo(70, y);
      context.lineTo(442, y);
      context.stroke();
    }
    context.strokeStyle = '#d8a18f';
    context.beginPath();
    context.moveTo(112, 54);
    context.lineTo(112, 714);
    context.stroke();
  } else {
    context.fillStyle = '#fff8e9';
    context.font = '600 38px Georgia, serif';
    const words = book.title.split(/\s+/);
    const lines = [];
    let line = '';

    words.forEach((word) => {
      const candidate = line ? `${line} ${word}` : word;
      if (context.measureText(candidate).width > 370 && line) {
        lines.push(line);
        line = word;
      } else {
        line = candidate;
      }
    });
    if (line) lines.push(line);

    const visibleLines = lines.slice(0, 4);
    const startY = 330 - ((visibleLines.length - 1) * 27) / 2;
    visibleLines.forEach((text, index) => {
      context.fillText(text, canvas.width / 2, startY + index * 54);
    });
    context.fillStyle = accent;
    context.fillRect(92, 500, 328, 5);
    context.fillStyle = '#fff8e9';
    context.font = '500 24px Geist, sans-serif';
    context.fillText(book.author || 'READING NOTE', canvas.width / 2, 550);
  }

  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}

function BookLabel({ book, accent, variant = 'cover', position, rotation = [0, 0, 0], size }) {
  const texture = useMemo(() => makeBookLabelTexture(book, accent, variant), [book, accent, variant]);

  useEffect(() => () => texture.dispose(), [texture]);

  return (
    <mesh position={position} rotation={rotation}>
      <planeGeometry args={size} />
      <meshBasicMaterial
        map={texture}
        transparent={variant !== 'page'}
        depthWrite
        toneMapped={false}
        side={DoubleSide}
      />
    </mesh>
  );
}

function TurningPage({ book, accent, index, shouldTurn, thickness, height, pageWidth }) {
  const unturnedLayer = thickness / 2 - 0.01 - index * 0.004;
  const turnedLayer = thickness / 2 - 0.034 + index * 0.004;
  const animation = useSpring({
    rotation: shouldTurn ? -Math.PI : 0,
    layer: shouldTurn ? turnedLayer : unturnedLayer,
    delay: 0,
    immediate: false,
    config: { mass: 0.95, tension: 135, friction: 23 },
  });

  return (
    <animated.group
      position-x={animation.layer}
      rotation-y={animation.rotation}
    >
      <BookLabel
        book={book}
        accent={accent}
        variant="page"
        position={[0.006, height / 2, -(pageWidth - 0.18) / 2]}
        rotation={[0, Math.PI / 2, 0]}
        size={[pageWidth - 0.18, height - 0.2]}
      />
    </animated.group>
  );
}

function BookModel({ book, index, total, selectedBookId, bookOpeningPhase, openingPageCount, hoveredBookId, onHoverBook, onSelectBook }) {
  const thickness = 0.62;
  const height = 2.78;
  const pageWidth = 1.95;
  const coverThickness = 0.075;
  const palette = BOOK_COLORS[index % BOOK_COLORS.length];
  const homeX = (index - (total - 1) / 2) * 0.88;
  const homeTilt = [-0.045, 0.028, -0.018, 0.04, -0.03][index % 5];
  const isSelected = selectedBookId === book.id;
  const isPulling = isSelected && bookOpeningPhase === 'pulling';
  const isTurning = isSelected && bookOpeningPhase === 'turning';
  const isOpening = isSelected && bookOpeningPhase === 'opening';
  const isZooming = isSelected && bookOpeningPhase === 'zooming';
  const isBookOpen = isOpening || isZooming;
  const isActive = isPulling || isTurning || isBookOpen;
  const isHovered = hoveredBookId === book.id && !isActive;
  const recordCount = Number(book.recordCount ?? 0);
  const pagesToTurn = book.status === 'COMPLETED' ? 5 : recordCount > 0 ? 3 : 0;

  const activePosition = isZooming
    ? [0, -1.31, 3.65]
    : isOpening
      ? [0, -1.31, 3.05]
    : isTurning
      ? [-0.95, -1.31, 2.75]
      : [0, -1.31, 2.45];

  const animation = useSpring({
    position: isActive
      ? activePosition
      : [homeX, -1.31, isHovered ? 0.36 : 0.22],
    rotation: isActive
      ? [0, 0, 0]
      : [isHovered ? 0.16 : 0, homeTilt, 0],
    scale: isZooming ? 1.42 : isOpening ? 1.2 : isTurning ? 1.16 : isPulling ? 1.08 : isHovered ? 1.03 : 1,
    bookYaw: isTurning || isBookOpen ? -Math.PI / 2 : 0,
    frontCoverRotation: isBookOpen ? -Math.PI : 0,
    frontCoverLayer: isBookOpen
      ? thickness / 2 - 0.09
      : thickness / 2 + coverThickness / 2,
    immediate: false,
    config: { mass: 1, tension: 205, friction: 26 },
  });

  return (
    <animated.group
      position={animation.position}
      rotation={animation.rotation}
      scale={animation.scale}
      onPointerEnter={(event) => {
        event.stopPropagation();
        onHoverBook(book.id);
      }}
      onPointerLeave={() => onHoverBook(null)}
      onClick={(event) => {
        event.stopPropagation();
        onSelectBook(book.id);
      }}
    >
      <animated.group rotation-y={animation.bookYaw}>
        {!isBookOpen && (
          <>
            <RoundedBox
              args={[thickness, height, 0.16]}
              radius={0.055}
              smoothness={4}
              position={[0, height / 2, 0]}
              castShadow
            >
              <meshStandardMaterial color={palette.cover} roughness={0.62} metalness={0.04} />
            </RoundedBox>
            <BookLabel
              book={book}
              accent={palette.accent}
              variant="spine"
              position={[0, height / 2, 0.086]}
              size={[thickness * 0.72, height * 0.8]}
            />
            <RoundedBox
              args={[thickness - 0.13, height - 0.18, pageWidth - 0.12]}
              radius={0.035}
              smoothness={4}
              position={[0, height / 2, -pageWidth / 2]}
              castShadow
              receiveShadow
            >
              <meshStandardMaterial color="#eee0c9" roughness={0.95} />
            </RoundedBox>
            <RoundedBox
              args={[coverThickness, height, pageWidth]}
              radius={0.035}
              smoothness={4}
              position={[-thickness / 2 - coverThickness / 2, height / 2, -pageWidth / 2]}
              castShadow
            >
              <meshStandardMaterial color={palette.cover} roughness={0.62} metalness={0.04} />
            </RoundedBox>
          </>
        )}

        <animated.group
          position-x={animation.frontCoverLayer}
          rotation-y={animation.frontCoverRotation}
        >
          <RoundedBox
            args={[coverThickness, height, pageWidth]}
            radius={0.035}
            smoothness={4}
            position={[0, height / 2, -pageWidth / 2]}
            castShadow
          >
            <meshStandardMaterial color={palette.cover} roughness={0.62} metalness={0.04} />
          </RoundedBox>
          <BookLabel
            book={book}
            accent={palette.accent}
            position={[coverThickness / 2 + 0.006, height / 2, -pageWidth / 2]}
            rotation={[0, Math.PI / 2, 0]}
            size={[pageWidth * 0.78, height * 0.78]}
          />
        </animated.group>

        <BookLabel
          book={book}
          accent={palette.accent}
          variant="page"
          position={[thickness / 2 - 0.045, height / 2, -(pageWidth - 0.18) / 2]}
          rotation={[0, Math.PI / 2, 0]}
          size={[pageWidth - 0.18, height - 0.2]}
        />

        {Array.from({ length: 5 }, (_, pageIndex) => (
          <TurningPage
            key={pageIndex}
            book={book}
            accent={palette.accent}
            index={pageIndex}
            shouldTurn={isBookOpen && pageIndex < Math.min(openingPageCount, pagesToTurn)}
            thickness={thickness}
            height={height}
            pageWidth={pageWidth}
          />
        ))}

        <mesh position={[thickness / 2 - 0.04, height * 0.52, -pageWidth * 0.3]} rotation={[0, Math.PI / 2, 0]}>
          <planeGeometry args={[0.16, 0.82]} />
          <meshStandardMaterial color={palette.accent} roughness={0.85} side={DoubleSide} />
        </mesh>
      </animated.group>
    </animated.group>
  );
}

function RoomModel() {
  return (
    <group>
      <RoundedBox args={[16, 8, 0.16]} radius={0.08} smoothness={3} position={[0, 2.1, -2.35]} receiveShadow>
        <meshStandardMaterial color="#f3e7d3" roughness={0.96} />
      </RoundedBox>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -2.12, 1.2]} receiveShadow>
        <planeGeometry args={[18, 14]} />
        <meshStandardMaterial color="#afc9de" roughness={0.98} />
      </mesh>
      <RoundedBox args={[2.35, 1.4, 0.12]} radius={0.05} smoothness={3} position={[4.15, 2.25, -2.18]} castShadow>
        <meshStandardMaterial color="#9b6747" roughness={0.88} />
      </RoundedBox>
      <RoundedBox args={[1.92, 0.96, 0.08]} radius={0.03} smoothness={3} position={[4.15, 2.25, -2.1]}>
        <meshStandardMaterial color="#fffaf0" roughness={0.98} />
      </RoundedBox>
    </group>
  );
}

function ShelfModel() {
  return (
    <group>
      <RoundedBox args={[9.3, 4.7, 0.25]} radius={0.08} smoothness={4} position={[0, 0.45, -2.08]} receiveShadow>
        <meshStandardMaterial color="#664532" roughness={0.84} />
      </RoundedBox>
      <RoundedBox args={[9.6, 0.3, 4.4]} radius={0.06} smoothness={4} position={[0, -1.48, -0.05]} castShadow receiveShadow>
        <meshStandardMaterial color="#8e5f43" roughness={0.74} />
      </RoundedBox>
      <RoundedBox args={[9.6, 0.24, 4.4]} radius={0.06} smoothness={4} position={[0, 2.75, -0.05]} castShadow receiveShadow>
        <meshStandardMaterial color="#754a35" roughness={0.78} />
      </RoundedBox>
      <RoundedBox args={[0.3, 4.5, 4.4]} radius={0.06} smoothness={4} position={[-4.66, 0.62, -0.05]} castShadow receiveShadow>
        <meshStandardMaterial color="#744a35" roughness={0.8} />
      </RoundedBox>
      <RoundedBox args={[0.3, 4.5, 4.4]} radius={0.06} smoothness={4} position={[4.66, 0.62, -0.05]} castShadow receiveShadow>
        <meshStandardMaterial color="#744a35" roughness={0.8} />
      </RoundedBox>
    </group>
  );
}

function ResponsiveCamera() {
  const { camera, size } = useThree();

  useEffect(() => {
    camera.fov = size.width < 640 ? 54 : 34;
    camera.updateProjectionMatrix();
  }, [camera, size.width]);

  return null;
}

export function ThreeBookshelf({ books, selectedBookId, bookOpeningPhase, openingPageCount, hoveredBookId, onHoverBook, onSelectBook }) {
  return (
    <div className="three-bookshelf__canvas" aria-hidden="true">
      <Canvas
        shadows
        dpr={[1, 1.25]}
        camera={{ position: [0, 0.3, 9.8], fov: 34 }}
        gl={{ antialias: true, alpha: false }}
      >
        <ResponsiveCamera />
        <color attach="background" args={['#f3e7d3']} />
        <fog attach="fog" args={['#f3e7d3', 8, 16]} />
        <ambientLight intensity={1.35} />
        <directionalLight
          castShadow
          position={[-4, 7, 5]}
          intensity={3.5}
          color="#fff5e7"
          shadow-mapSize-width={512}
          shadow-mapSize-height={512}
          shadow-camera-left={-6}
          shadow-camera-right={6}
          shadow-camera-top={6}
          shadow-camera-bottom={-6}
        />
        <pointLight position={[3.2, 2.8, 3.8]} intensity={14} distance={12} color="#e9af7d" />
        <pointLight position={[-3.5, 0.2, 2]} intensity={8} distance={10} color="#9bb7bc" />

        <RoomModel />
        <ShelfModel />
        {books.map((book, index) => (
          <BookModel
            key={book.id}
            book={book}
            index={index}
            total={books.length}
            selectedBookId={selectedBookId}
            bookOpeningPhase={bookOpeningPhase}
            openingPageCount={openingPageCount}
            hoveredBookId={hoveredBookId}
            onHoverBook={onHoverBook}
            onSelectBook={onSelectBook}
          />
        ))}
        <ContactShadows position={[0, -1.42, 0.3]} opacity={0.42} scale={9} blur={1.8} far={4.5} resolution={256} />
      </Canvas>
    </div>
  );
}
