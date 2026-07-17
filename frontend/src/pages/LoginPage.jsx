import { useState } from "react";
import { signInWithPopup, GoogleAuthProvider } from "firebase/auth";
import { firebaseAuth } from "../firebase";
import { getCurrentUser } from "../api/authApi";
import { getRecipes } from "../api/recipeApi";

const desktopCover = "/design-assets/cookbook/web-login-surface.webp";
const mobileCover = "/design-assets/cookbook/mobile-login-surface.webp";
const googleProvider = new GoogleAuthProvider();

const LoginPage = () => {
  const [error, setError] = useState("");
  async function handleGoogleLogin() {
    try {
      setError("");

      const result = await signInWithPopup(firebaseAuth, googleProvider);
      const idToken = await result.user.getIdToken();

      console.log(await getCurrentUser(idToken));

      const recipes = await getRecipes(idToken);
      setRecipes(recipes);

    } catch (loginErr) {
      setError("Google 로그인 실패");
      console.error(loginErr);
    }
  }
  return (
    <main id="login-page" className="relative isolate min-h-dvh overflow-hidden bg-[#17241f]">
      <div
        className="
          pointer-events-none absolute left-1/2 top-1/2 z-0
          h-[max(100dvh,calc(100vw/0.562799))]
          w-[max(100vw,calc(100dvh*0.562799))]
          -translate-x-1/2 -translate-y-1/2
          after:pointer-events-none after:absolute after:inset-0 after:z-1
          after:bg-[linear-gradient(180deg,rgba(4,10,8,0.2),transparent_34%)]
          after:content-['']
          md:h-[max(100dvh,calc(100vw/1.776833))]
          md:w-[max(100vw,calc(100dvh*1.776833))]
          md:after:bg-[linear-gradient(90deg,rgba(20,31,27,0.28),transparent_52%)]
        "
      >
        <picture className="absolute inset-0 h-full w-full" aria-hidden="true">
          <source media="(max-width: 767px)" srcSet={mobileCover} />
          <img className="absolute inset-0 h-full w-full object-cover object-center" src={desktopCover} alt="" />
        </picture>
        <button
          className="
            pointer-events-auto absolute left-1/2 top-[72%] z-2
            min-h-14 w-[clamp(13rem,48%,17.5rem)] origin-center cursor-pointer
            rounded-lg border border-[#caa85b]
            bg-[linear-gradient(145deg,rgba(255,255,255,0.045),transparent_38%),#173a30_url('/design-assets/cookbook/leather-texture-tile.png')_center/240px]
            text-base font-[750] tracking-[0.02em] text-[#f0d58f]
            shadow-[-5px_7px_8px_rgba(2,11,8,0.42),inset_0_1px_0_rgba(255,239,188,0.24),inset_0_-3px_5px_rgba(0,8,5,0.42),0_0_0_3px_rgba(9,27,22,0.42)]
            [text-shadow:0_1px_1px_#06150f]
            transform-[translate(-50%,-50%)_perspective(600px)_rotateX(1deg)]
            [transition:transform_0.18s_ease,filter_0.18s_ease,box-shadow_0.18s_ease]
            before:pointer-events-none before:absolute before:inset-1.25
            before:rounded before:border before:border-[rgba(227,197,128,0.46)] before:content-['']
            hover:brightness-[1.12]
            hover:shadow-[-6px_9px_10px_rgba(2,11,8,0.48),inset_0_1px_0_rgba(255,239,188,0.3),inset_0_-3px_5px_rgba(0,8,5,0.42),0_0_0_3px_rgba(9,27,22,0.42)]
            active:transform-[translate(-50%,-47%)_perspective(600px)_rotateX(1deg)_scale(0.985)]
            md:left-[70.9%] md:top-[69%]
            md:min-h-[clamp(3.25rem,6.2%,4rem)] md:w-[clamp(10.5rem,12.8%,14rem)]
            md:transform-[translate(-50%,-50%)_perspective(700px)_rotateY(-5deg)_rotateZ(0.25deg)]
            md:active:transform-[translate(-50%,-47%)_perspective(700px)_rotateY(-5deg)_rotateZ(0.25deg)_scale(0.985)]
          "
          onClick={() => handleGoogleLogin()}
        >
          <span className="relative z-1">구글 계정으로 로그인</span>
        </button>
      </div>

      <section
        className="
          absolute left-6 top-[max(2rem,env(safe-area-inset-top))] z-2
          w-[calc(100%-3rem)]
          text-balance
          md:left-[clamp(1.5rem,8vw,8.5rem)]
          md:top-[clamp(4.5rem,14vh,9rem)]
          md:w-[min(31rem,38vw)]
        "
        aria-labelledby="welcome-title">
        <p className="hidden text-[0.9rem] font-bold tracking-[0.08em] text-[#efd28f] md:mb-[1.4rem] md:block">
          나만의 레시피북
        </p>
        <h1
          className="hidden text-[clamp(2.5rem,4.2vw,5rem)] font-[650] leading-[1.08] tracking-[-0.06em] text-[#fbf7ec] md:block"
          id="welcome-title"
        >
          맛과 기억을<br />한 권에 담아요.
        </h1>
        <p className="hidden max-w-108 text-[clamp(0.98rem,1.25vw,1.12rem)] leading-[1.75] text-[#e4e2d8] md:mt-6 md:block">
          흩어진 레시피를 모으고, 누구에게 배웠는지와 함께 오래 남겨보세요.
        </p>
      </section>
    </main >
  )
}

export default LoginPage;


