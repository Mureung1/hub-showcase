import { GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { firebaseAuth } from "./firebase";
import { useEffect, useState } from "react";

const googleProvider = new GoogleAuthProvider();


function App() {
  const [recipes, setRecipes] = useState([]);
  const [error, setError] = useState("");

  async function handleGoogleLogin() {
    try {
      setError("");

      const result = await signInWithPopup(firebaseAuth, googleProvider);
      const idToken = await result.user.getIdToken();

      const meResponse = await fetch("/api/auth/me", {
        headers: {
          Authorization: `Bearer ${idToken}`,
        },
      })

      if (!meResponse.ok) {
        throw new Error("사용자 정보 요청에 실패했습니다.");
      }

      console.log(await meResponse.json());

      const recipeResponse = await fetch("/api/recipes", {
        headers: {
          Authorization: `Bearer ${idToken}`,
        },
      });

      if (!recipeResponse.ok) {
        throw new Error("레시피 목록 요청에 실패했습니다.");
      }

      const recipesResult = await recipeResponse.json();
      setRecipes(recipesResult.data);

    } catch (loginErr) {
      setError("Google 로그인 실패");
      console.error(loginErr);
    }
  }

  return (
    <main>
      <h1>나만의 레시피북</h1>

      {error && <p>{error}</p>}
      <button type="button" onClick={handleGoogleLogin}>GOOGLE로 로그인</button>
      <ul>
        {recipes.map((recipe) => (
          <li key={recipe.id}>
            <strong>{recipe.title}</strong>
            <p>{recipe.description}</p>
          </li>
        ))}
      </ul>
    </main>
  );
}

export default App;