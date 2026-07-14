import jwt from "jsonwebtoken";

export function authMiddleware(req, res, next) {
    // 이제 요청에서 JWT를 꺼내자.
    const authHeader = req.headers.authorization;

    if (!authHeader) {
    return res.status(401).json({
        success: false,
        message: "로그인이 필요합니다.",
    });
    }

    // Bearer 토큰에서 토큰 부분만 꺼낼 거야.
    const token = authHeader.split(" ")[1];

    if (!token) {
    return res.status(401).json({
        success: false,
        message: "유효한 인증 토큰이 필요합니다.",
    });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);      // 이 토큰이 우리 서버에서 만든 토큰 맞아? 검사하는 것

        req.user = decoded;         // 이 한 줄 때매 나중에 어떤 API에서든
                                    // req.user.userId 만 쓰면
                                    // 현재 로그인한 사용자의 id 를 바로 알 수 있어.

        next();                     // 검사 끝났으니까 다음 코드 실행!
    } catch (error) {
        return res.status(401).json({
            success: false,
            message: "유효하지 않은 토큰입니다.",
        });
    }
}