'use client';

import Link from 'next/link';
import { useEffect, useLayoutEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import * as THREE from 'three';
import styles from './landing.module.css';

const steps = [
  {
    number: '01',
    label: 'COMMIT',
    title: '오늘의 목표를 건다',
    body: '크게 다짐하지 않습니다. 오늘 끝낼 단 하나를 구체적으로 정합니다.',
    meta: 'DAILY GOAL',
  },
  {
    number: '02',
    label: 'FOCUS',
    title: '30분, 깊게 잠긴다',
    body: '타이머가 흐르는 동안 해야 할 일은 하나뿐. 시작이 곧 첫 승리입니다.',
    meta: '30:00 MIN',
  },
  {
    number: '03',
    label: 'PROVE',
    title: '오늘의 생존을 증명한다',
    body: '짧은 회고와 학습 흔적을 남기면 오늘의 루프가 완성됩니다.',
    meta: '1 PROOF',
  },
  {
    number: '04',
    label: 'SURVIVE',
    title: '연속성이 보상이 된다',
    body: '매일 쌓이는 생존 기록이 포인트, 배지, 그리고 다음 몰입을 만듭니다.',
    meta: 'STREAK +1',
  },
] as const;

function ArrowIcon() {
  return <span aria-hidden="true">↗</span>;
}

export function LandingExperience() {
  const rootRef = useRef<HTMLElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const coreWrapRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = coreWrapRef.current;
    if (!canvas || !wrap) return;

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 100);
    camera.position.set(0, 0, 6.4);

    const renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: true,
      powerPreference: 'high-performance',
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;

    const coreGroup = new THREE.Group();
    scene.add(coreGroup);

    const coreGeometry = new THREE.IcosahedronGeometry(1.48, 5);
    const coreMaterial = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color('#8b5cf6'),
      roughness: 0.16,
      metalness: 0.04,
      transmission: 0.38,
      thickness: 1.4,
      clearcoat: 1,
      clearcoatRoughness: 0.12,
      iridescence: 0.42,
      iridescenceIOR: 1.7,
      emissive: new THREE.Color('#3b197d'),
      emissiveIntensity: 0.12,
    });
    const core = new THREE.Mesh(coreGeometry, coreMaterial);
    core.scale.set(1, 1.08, 1);
    coreGroup.add(core);

    const shellGeometry = new THREE.IcosahedronGeometry(1.72, 2);
    const shellMaterial = new THREE.MeshBasicMaterial({
      color: '#ffffff',
      wireframe: true,
      transparent: true,
      opacity: 0.16,
    });
    const shell = new THREE.Mesh(shellGeometry, shellMaterial);
    coreGroup.add(shell);

    const ringMaterial = new THREE.MeshBasicMaterial({
      color: '#6d3bd2',
      transparent: true,
      opacity: 0.34,
    });
    const rings = [
      { radius: 2.18, tube: 0.012, rotation: [1.08, 0.1, 0.45] },
      { radius: 2.46, tube: 0.009, rotation: [0.35, 1.12, -0.2] },
      { radius: 2.76, tube: 0.006, rotation: [1.5, 0.55, 0.9] },
    ] as const;
    rings.forEach(({ radius, tube, rotation }, index) => {
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(radius, tube, 10, 160),
        ringMaterial.clone(),
      );
      ring.rotation.set(rotation[0], rotation[1], rotation[2]);
      ring.userData.speed = (index + 1) * 0.0007;
      coreGroup.add(ring);
    });

    const particleCount = 180;
    const positions = new Float32Array(particleCount * 3);
    for (let index = 0; index < particleCount; index += 1) {
      const radius = 2.35 + Math.random() * 2.8;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      positions[index * 3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[index * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      positions[index * 3 + 2] = radius * Math.cos(phi);
    }
    const particleGeometry = new THREE.BufferGeometry();
    particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const particles = new THREE.Points(
      particleGeometry,
      new THREE.PointsMaterial({
        color: '#7c52c9',
        size: 0.026,
        transparent: true,
        opacity: 0.58,
        sizeAttenuation: true,
      }),
    );
    coreGroup.add(particles);

    scene.add(new THREE.HemisphereLight('#fff5fc', '#d8c5ff', 2.4));
    const keyLight = new THREE.DirectionalLight('#ffffff', 4.4);
    keyLight.position.set(3, 4, 5);
    scene.add(keyLight);
    const violetLight = new THREE.PointLight('#b99cff', 22, 10);
    violetLight.position.set(-3.5, -1.5, 2.5);
    scene.add(violetLight);
    const pinkLight = new THREE.PointLight('#ffd4e9', 18, 10);
    pinkLight.position.set(3, 1, 2);
    scene.add(pinkLight);

    const pointer = new THREE.Vector2(0, 0);
    const pointerTarget = new THREE.Vector2(0, 0);
    let scrollProgress = 0;
    let frame = 0;

    const resize = () => {
      const { width, height } = wrap.getBoundingClientRect();
      renderer.setSize(width, height, false);
      camera.aspect = width / Math.max(height, 1);
      camera.updateProjectionMatrix();
    };
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(wrap);
    resize();

    const handlePointer = (event: PointerEvent) => {
      const bounds = wrap.getBoundingClientRect();
      pointerTarget.x = ((event.clientX - bounds.left) / bounds.width - 0.5) * 2;
      pointerTarget.y = -((event.clientY - bounds.top) / bounds.height - 0.5) * 2;
    };
    const handleLeave = () => pointerTarget.set(0, 0);
    const handleScroll = () => {
      scrollProgress = window.scrollY / Math.max(document.body.scrollHeight - window.innerHeight, 1);
    };
    wrap.addEventListener('pointermove', handlePointer);
    wrap.addEventListener('pointerleave', handleLeave);
    window.addEventListener('scroll', handleScroll, { passive: true });

    const clock = new THREE.Clock();
    const render = () => {
      const elapsed = clock.getElapsedTime();
      pointer.lerp(pointerTarget, 0.055);
      coreGroup.rotation.x += (pointer.y * 0.2 + scrollProgress * 0.5 - coreGroup.rotation.x) * 0.035;
      coreGroup.rotation.y += (pointer.x * 0.28 + elapsed * 0.08 - coreGroup.rotation.y) * 0.035;
      core.rotation.z = elapsed * 0.04;
      shell.rotation.y = -elapsed * 0.055;
      shell.rotation.z = elapsed * 0.03;
      particles.rotation.y = elapsed * -0.018;
      coreGroup.children.slice(2, 5).forEach((child) => {
        child.rotation.z += child.userData.speed as number;
      });
      const pulse = 1 + Math.sin(elapsed * 1.7) * 0.018;
      core.scale.set(pulse, pulse * 1.08, pulse);
      renderer.render(scene, camera);
      frame = window.requestAnimationFrame(render);
    };

    renderer.render(scene, camera);
    if (!reduceMotion) frame = window.requestAnimationFrame(render);

    return () => {
      window.cancelAnimationFrame(frame);
      resizeObserver.disconnect();
      wrap.removeEventListener('pointermove', handlePointer);
      wrap.removeEventListener('pointerleave', handleLeave);
      window.removeEventListener('scroll', handleScroll);
      coreGeometry.dispose();
      coreMaterial.dispose();
      shellGeometry.dispose();
      shellMaterial.dispose();
      ringMaterial.dispose();
      particleGeometry.dispose();
      (particles.material as THREE.Material).dispose();
      coreGroup.children.forEach((child) => {
        if (child instanceof THREE.Mesh && child.geometry !== coreGeometry && child.geometry !== shellGeometry) {
          child.geometry.dispose();
          if (child.material instanceof THREE.Material) child.material.dispose();
        }
      });
      renderer.dispose();
    };
  }, []);

  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    gsap.registerPlugin(ScrollTrigger);
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduceMotion) return;

    const context = gsap.context(() => {
      const intro = gsap.timeline({ defaults: { ease: 'power4.out' } });
      intro
        .from('[data-intro="eyebrow"]', { y: 18, opacity: 0, duration: 0.8 })
        .from('[data-intro="word"]', { yPercent: 115, rotate: 2, duration: 1.15, stagger: 0.1 }, '-=0.45')
        .from('[data-intro="copy"]', { y: 28, opacity: 0, duration: 0.9 }, '-=0.65')
        .from('[data-intro="actions"]', { y: 24, opacity: 0, duration: 0.8 }, '-=0.68')
        .from('[data-intro="core"]', { scale: 0.72, opacity: 0, duration: 1.3, ease: 'expo.out' }, '-=1.2');

      gsap.to('[data-hero="content"]', {
        yPercent: 18,
        opacity: 0.22,
        ease: 'none',
        scrollTrigger: {
          trigger: '[data-section="hero"]',
          start: 'top top',
          end: 'bottom top',
          scrub: true,
        },
      });
      gsap.to('[data-intro="core"]', {
        yPercent: 22,
        scale: 0.84,
        ease: 'none',
        scrollTrigger: {
          trigger: '[data-section="hero"]',
          start: 'top top',
          end: 'bottom top',
          scrub: true,
        },
      });

      gsap.utils.toArray<HTMLElement>('[data-reveal]').forEach((element) => {
        gsap.from(element, {
          y: 70,
          opacity: 0,
          duration: 1,
          ease: 'power3.out',
          scrollTrigger: { trigger: element, start: 'top 86%' },
        });
      });

      gsap.from('[data-statement="line"]', {
        yPercent: 105,
        rotate: 1.5,
        duration: 1.2,
        stagger: 0.12,
        ease: 'power4.out',
        scrollTrigger: { trigger: '[data-section="statement"]', start: 'top 68%' },
      });

      const stepCards = gsap.utils.toArray<HTMLElement>('[data-step]');
      stepCards.forEach((card, index) => {
        gsap.fromTo(
          card,
          { opacity: 0.3, x: index % 2 === 0 ? 45 : -20 },
          {
            opacity: 1,
            x: 0,
            ease: 'none',
            scrollTrigger: {
              trigger: card,
              start: 'top 78%',
              end: 'center 48%',
              scrub: true,
              onEnter: () => root.style.setProperty('--active-step', String(index)),
              onEnterBack: () => root.style.setProperty('--active-step', String(index)),
            },
          },
        );
      });

      if (progressRef.current) {
        gsap.fromTo(
          progressRef.current,
          { '--progress': 0 },
          {
            '--progress': 1,
            ease: 'none',
            scrollTrigger: {
              trigger: '[data-section="system"]',
              start: 'top 60%',
              end: 'bottom 65%',
              scrub: true,
            },
          },
        );
      }

      gsap.from('[data-stat]', {
        y: 45,
        opacity: 0,
        stagger: 0.12,
        duration: 0.9,
        scrollTrigger: { trigger: '[data-section="stats"]', start: 'top 72%' },
      });
      gsap.from('[data-final="line"]', {
        yPercent: 115,
        duration: 1.1,
        stagger: 0.1,
        ease: 'power4.out',
        scrollTrigger: { trigger: '[data-section="final"]', start: 'top 72%' },
      });
    }, root);

    return () => context.revert();
  }, []);

  const handleMagnet = (event: React.PointerEvent<HTMLAnchorElement>) => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const target = event.currentTarget;
    const bounds = target.getBoundingClientRect();
    gsap.to(target, {
      x: (event.clientX - bounds.left - bounds.width / 2) * 0.16,
      y: (event.clientY - bounds.top - bounds.height / 2) * 0.16,
      duration: 0.35,
      ease: 'power2.out',
    });
  };

  const resetMagnet = (event: React.PointerEvent<HTMLAnchorElement>) => {
    gsap.to(event.currentTarget, { x: 0, y: 0, duration: 0.65, ease: 'elastic.out(1, 0.35)' });
  };

  return (
    <main ref={rootRef} className={styles.landing}>
      <section className={styles.hero} data-section="hero">
        <div className={styles.heroGrid}>
          <div className={styles.heroCopy} data-hero="content">
            <p className={styles.eyebrow} data-intro="eyebrow">
              <span className={styles.liveDot} /> DAILY FOCUS · PROOF · STREAK
            </p>
            <h1 className={styles.heroTitle} aria-label="매일 30분, 끝까지 살아남는 공부.">
              <span className={styles.titleClip}><span data-intro="word">매일 30분,</span></span>
              <span className={styles.titleClip}><span data-intro="word">끝까지 살아남는</span></span>
              <span className={`${styles.titleClip} ${styles.titleAccent}`}><span data-intro="word">공부.</span></span>
            </h1>
            <p className={styles.heroBody} data-intro="copy">
              목표를 정하고 30분간 몰입한 뒤 오늘의 학습을 인증하세요.
              함께 쌓은 생존 기록이 포인트와 배지, 다음 몰입으로 이어집니다.
            </p>
            <div className={styles.heroActions} data-intro="actions">
              <Link
                href="/challenges"
                className={styles.primaryCta}
                onPointerMove={handleMagnet}
                onPointerLeave={resetMagnet}
              >
                30일 챌린지 시작하기 <ArrowIcon />
              </Link>
              <a href="#system" className={styles.textCta}>진행 방식 보기 <span aria-hidden="true">↓</span></a>
            </div>
          </div>

          <div ref={coreWrapRef} className={styles.coreWrap} data-intro="core" aria-hidden="true">
            <canvas ref={canvasRef} className={styles.coreCanvas} />
            <div className={`${styles.orbitLabel} ${styles.orbitLabelTop}`}>DAY 12 / 30</div>
            <div className={styles.coreReadout}>
              <span>SAMPLE PROTOCOL</span>
              <strong>12<small>/30 DAYS</small></strong>
              <div className={styles.coreProgress}><i /></div>
              <p><b>ALIVE</b><span>12 DAY STREAK</span></p>
            </div>
            <div className={`${styles.orbitLabel} ${styles.orbitLabelBottom}`}>
              <span>TODAY&apos;S FOCUS</span><strong>00:00 / 30:00</strong>
            </div>
            <div className={styles.coreHalo} />
          </div>

          <div className={styles.heroMeta} data-intro="actions">
            <div><span><i className={styles.doneDot} />01 · GOAL</span><strong>SET</strong></div>
            <div><span><i className={styles.readyDot} />02 · FOCUS</span><strong>30 MIN</strong></div>
            <div><span><i className={styles.waitDot} />03 · PROOF</span><strong>WAITING</strong></div>
            <div><span><i className={styles.aliveDot} />04 · REWARD</span><strong>STREAK +1</strong></div>
          </div>
        </div>
        <a className={styles.scrollCue} href="#system" aria-label="진행 방식 섹션으로 이동">
          <span>SEE THE PROTOCOL</span><i />
        </a>
      </section>

      <section id="system" className={styles.system} data-section="system">
        <div className={styles.systemIntro} data-reveal>
          <div className={styles.sectionIndex}>01 / DAILY PROTOCOL</div>
          <h2>오늘의 공부를<br />완료하는 네 단계</h2>
          <p>목표부터 보상까지 한 화면에서 이어집니다. 매일 같은 흐름을 반복할수록 시작은 가벼워지고 기록은 단단해집니다.</p>
        </div>

        <div className={styles.systemLayout}>
          <div className={styles.protocolStage} aria-hidden="true">
            <div className={styles.stageTopline}><span>DAILY PROTOCOL</span><span>LIVE</span></div>
            <div ref={progressRef} className={styles.progressOrb}>
              <div className={styles.progressInner}>
                <span>FOCUS</span>
                <strong>30:00</strong>
                <small>READY TO BEGIN</small>
              </div>
            </div>
            <div className={styles.stageTimeline}>
              {steps.map((step) => <span key={step.number}>{step.number}</span>)}
            </div>
            <div className={styles.stageFooter}><span>TODAY / DAY 07</span><strong>ALIVE</strong></div>
          </div>

          <div className={styles.stepList}>
            {steps.map((step) => (
              <article className={styles.stepCard} data-step key={step.number}>
                <div className={styles.stepNumber}>{step.number}</div>
                <div className={styles.stepContent}>
                  <span className={styles.stepLabel}>{step.label}</span>
                  <h3>{step.title}</h3>
                  <p>{step.body}</p>
                </div>
                <div className={styles.stepMeta}>{step.meta}</div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className={styles.challengeFeature} data-section="challenge">
        <div className={styles.sectionIndex}>02 / OFFICIAL CHALLENGE</div>
        <div className={styles.featureCard} data-reveal>
          <div className={styles.featureCopy}>
            <p className={styles.featureKicker}><span /> NEXT DROP · AUG 01</p>
            <h2>30일 집중<br />생존 스터디</h2>
            <p>매일 30분. 작지만 단단한 약속을 30일 동안 지켜내는 공식 챌린지입니다.</p>
            <div className={styles.featureSpecs}>
              <div><span>DURATION</span><strong>30 DAYS</strong></div>
              <div><span>DAILY</span><strong>30 MIN</strong></div>
              <div><span>ENTRY</span><strong>₩39,000</strong></div>
            </div>
            <Link href="/official-challenge" className={styles.inverseCta}>
              챌린지 자세히 보기 <ArrowIcon />
            </Link>
          </div>
          <div className={styles.featureVisual} aria-hidden="true">
            <div className={styles.ticketBack} />
            <div className={styles.ticket}>
              <div className={styles.ticketHead}><span>S/S</span><span>OFFICIAL 001</span></div>
              <div className={styles.ticketCore}><span>30</span><small>DAYS<br />TO<br />SURVIVE</small></div>
              <div className={styles.ticketCode}>|||| ||| || |||| ||| |</div>
              <div className={styles.ticketFoot}><span>SEOUL / KR</span><span>2026.08.01</span></div>
            </div>
          </div>
        </div>
      </section>

      <section className={styles.stats} data-section="stats">
        <div className={styles.sectionIndex}>03 / RULES OF SURVIVAL</div>
        <div className={styles.statsGrid}>
          <div data-stat><strong>30</strong><span>days<br />in one season</span></div>
          <div data-stat><strong>01</strong><span>clear goal<br />per day</span></div>
          <div data-stat><strong>30<span>m</span></strong><span>minimum<br />deep focus</span></div>
          <div data-stat><strong>∞</strong><span>proof that<br />you can continue</span></div>
        </div>
        <p className={styles.statsNote} data-reveal>거창함은 필요 없습니다.<br /><em>오늘도 이어졌다는 사실</em>이면 충분합니다.</p>
      </section>

      <section id="statement" className={styles.statement} data-section="statement">
        <div className={styles.sectionIndex}>04 / MANIFESTO</div>
        <div className={styles.statementText}>
          <div className={styles.statementClip}><p data-statement="line">완벽한 계획보다</p></div>
          <div className={styles.statementClip}><p data-statement="line"><em>끊기지 않는 하루.</em></p></div>
          <div className={styles.statementClip}><p data-statement="line">혼자만의 의지보다</p></div>
          <div className={styles.statementClip}><p data-statement="line"><em>함께 지키는 약속.</em></p></div>
        </div>
        <div className={styles.statementFoot} data-reveal>
          <span className={styles.roundGlyph}>↳</span>
          <p>Survive Study는 공부를 ‘해야 하는 일’에서<br />매일 통과하고 싶은 게임으로 바꿉니다.</p>
        </div>
      </section>

      <div className={styles.ribbon} aria-hidden="true">
        <div>
          <span>SET THE GOAL</span><i />
          <span>START THE CLOCK</span><i />
          <span>LEAVE THE PROOF</span><i />
          <span>STAY ALIVE</span><i />
          <span>SET THE GOAL</span><i />
          <span>START THE CLOCK</span><i />
          <span>LEAVE THE PROOF</span><i />
          <span>STAY ALIVE</span><i />
        </div>
      </div>

      <section className={styles.finalCta} data-section="final">
        <div className={styles.finalNoise} aria-hidden="true" />
        <p className={styles.finalEyebrow}>YOUR NEXT STREAK STARTS HERE</p>
        <h2 aria-label="내일이 아니라, 오늘 살아남기.">
          <span className={styles.finalClip}><span data-final="line">내일이 아니라,</span></span>
          <span className={`${styles.finalClip} ${styles.finalAccent}`}><span data-final="line">오늘 살아남기.</span></span>
        </h2>
        <p>첫 목표를 정하는 데는 1분이면 충분합니다.</p>
        <Link
          href="/sign-up"
          className={styles.finalButton}
          onPointerMove={handleMagnet}
          onPointerLeave={resetMagnet}
        >
          <span>생존 루프 시작하기</span><ArrowIcon />
        </Link>
        <div className={styles.finalFooter}>
          <span>SURVIVE STUDY © 2026</span>
          <span>BUILT FOR CONSISTENCY</span>
        </div>
      </section>
    </main>
  );
}
