import { useEffect, useMemo } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { ContactShadows, RoundedBox } from '@react-three/drei';
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

function BookModel({ book, index, total, hoveredBookId, onHoverBook, onSelectBook }) {
  const thickness = 0.54;
  const height = 1.36;
  const pageWidth = 0.88;
  const palette = BOOK_COLORS[index % BOOK_COLORS.length];
  const row = Math.floor(index / 6);
  const booksInRow = Math.min(6, total - row * 6);
  const column = index % 6;
  const homeX = (column - (booksInRow - 1) / 2) * 0.72;
  const homeY = [1.32, -0.25, -1.82][row] ?? -1.82;
  const homeTilt = [-0.045, 0.028, -0.018, 0.04, -0.03][index % 5];
  const isHovered = hoveredBookId === book.id;

  return (
    <group
      position={[homeX, homeY, isHovered ? 0.24 : 0.08]}
      rotation={[isHovered ? 0.12 : 0, homeTilt, 0]}
      scale={isHovered ? 1.06 : 1}
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
      <RoundedBox args={[thickness, height, 0.16]} radius={0.055} smoothness={4} position={[0, height / 2, 0]} castShadow>
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
    </group>
  );
}

function ShelfModel() {
  return (
    <group>
      <RoundedBox args={[5.7, 4.85, 0.22]} radius={0.08} smoothness={4} position={[0, 0.3, -1.48]} receiveShadow>
        <meshStandardMaterial color="#664532" roughness={0.84} />
      </RoundedBox>
      {[-2.02, -0.45, 1.12, 2.7].map((y) => (
        <RoundedBox key={y} args={[5.95, 0.24, 1.7]} radius={0.06} smoothness={4} position={[0, y, -0.65]} castShadow receiveShadow>
          <meshStandardMaterial color={y === 2.7 ? '#754a35' : '#8e5f43'} roughness={0.78} />
        </RoundedBox>
      ))}
      {[-2.88, 2.88].map((x) => (
        <RoundedBox key={x} args={[0.28, 4.75, 1.7]} radius={0.06} smoothness={4} position={[x, 0.34, -0.65]} castShadow receiveShadow>
          <meshStandardMaterial color="#744a35" roughness={0.8} />
        </RoundedBox>
      ))}
    </group>
  );
}

function ResponsiveCamera() {
  const { camera, size } = useThree();

  useEffect(() => {
    camera.fov = size.width < 480 ? 48 : 42;
    camera.position.z = size.width < 480 ? 10.5 : 9;
    camera.updateProjectionMatrix();
  }, [camera, size.width]);

  return null;
}

export function ThreeBookshelf({ books, hoveredBookId, onHoverBook, onSelectBook }) {
  return (
    <div className="three-bookshelf__canvas" aria-hidden="true">
      <Canvas
        shadows
        frameloop="demand"
        dpr={[1, 1.25]}
        camera={{ position: [0, 0.3, 9], fov: 42 }}
        gl={{ antialias: true, alpha: true }}
      >
        <ResponsiveCamera />
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
        <pointLight position={[3.2, 2.8, 3.8]} intensity={10} distance={12} color="#e9af7d" />

        <ShelfModel />
        {books.map((book, index) => (
          <BookModel
            key={book.id}
            book={book}
            index={index}
            total={books.length}
            hoveredBookId={hoveredBookId}
            onHoverBook={onHoverBook}
            onSelectBook={onSelectBook}
          />
        ))}
        <ContactShadows position={[0, -2.05, 0.3]} opacity={0.32} scale={6} blur={1.8} far={4} resolution={256} />
      </Canvas>
    </div>
  );
}
