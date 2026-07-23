// 함수 그래프 렌더링. 외부 라이브러리 없이 SVG 로 직접 그린다.
//
// AI 나 선생님은 "x^2 - 2*x" 같은 함수식 문자열만 남기고, 실제 곡선은 여기서
// 값을 계산해 그린다. 안전을 위해 eval/Function 을 쓰지 않고, 허용된 이름만 아는
// 작은 파서로 식을 평가한다.

// ===== 수식 파서 =====

const GRAPH_FUNCTIONS = {
    sin: Math.sin, cos: Math.cos, tan: Math.tan,
    sqrt: Math.sqrt, abs: Math.abs, exp: Math.exp,
    ln: Math.log,
    log: (value) => Math.log(value) / Math.LN10 // 상용로그(밑 10)
};

const GRAPH_CONSTANTS = { pi: Math.PI, e: Math.E };

const TOKEN = {
    NUMBER: 'number',
    VARIABLE: 'variable',
    FUNCTION: 'function',
    OPERATOR: 'operator'
};

const OPERATOR_CHARS = '+-*/^(),';

/**
 * 수식 문자열을 토큰 배열로 나눈다.
 * 허용되지 않은 문자나 이름이 섞여 있으면 null 을 돌려준다.
 */
function tokenize(source) {
    // 곱셈 생략 보정: 2x → 2*x, 2sin(x) → 2*sin(x), 2(x+1) → 2*(x+1)
    const text = source.replace(/\s+/g, '').replace(/(\d)([a-zA-Z(])/g, '$1*$2');
    const tokens = [];
    let index = 0;

    while (index < text.length) {
        const char = text[index];

        if (/[0-9.]/.test(char)) {
            let digits = '';
            while (index < text.length && /[0-9.]/.test(text[index])) digits += text[index++];
            const value = parseFloat(digits);
            if (!isFinite(value)) return null;
            tokens.push({ type: TOKEN.NUMBER, value });
        } else if (/[a-zA-Z]/.test(char)) {
            let name = '';
            while (index < text.length && /[a-zA-Z0-9]/.test(text[index])) name += text[index++];
            if (name === 'x') tokens.push({ type: TOKEN.VARIABLE });
            else if (name in GRAPH_CONSTANTS) tokens.push({ type: TOKEN.NUMBER, value: GRAPH_CONSTANTS[name] });
            else if (name in GRAPH_FUNCTIONS) tokens.push({ type: TOKEN.FUNCTION, name });
            else return null; // 모르는 이름은 그리지 않는다
        } else if (OPERATOR_CHARS.includes(char)) {
            tokens.push({ type: TOKEN.OPERATOR, symbol: char });
            index++;
        } else {
            return null;
        }
    }
    return tokens;
}

/**
 * 수식 문자열을 (x) => number 형태의 함수로 컴파일한다. 실패하면 null.
 *
 * 재귀 하강 파서이며, 다루는 문법은 다음과 같다 (우선순위가 낮은 것부터):
 *   sum     := product (('+' | '-') product)*
 *   product := unary (('*' | '/') unary)*
 *   unary   := '-' unary | power           // 단항 마이너스는 거듭제곱보다 약하다 (-x^2 = -(x^2))
 *   power   := atom ('^' unary)?           // 지수는 오른쪽 결합, 2^-x 도 허용
 *   atom    := 숫자 | 'x' | 함수 '(' sum ')' | '(' sum ')'
 */
function compileExpression(source) {
    const tokens = tokenize(source);
    if (!tokens || !tokens.length) return null;

    let position = 0;
    const peek = () => tokens[position];
    const atOperator = (symbol) => {
        const token = peek();
        return Boolean(token) && token.type === TOKEN.OPERATOR && token.symbol === symbol;
    };

    function parseSum() {
        let left = parseProduct();
        if (!left) return null;
        while (atOperator('+') || atOperator('-')) {
            const symbol = tokens[position++].symbol;
            const right = parseProduct();
            if (!right) return null;
            const lhs = left;
            left = (x) => (symbol === '+' ? lhs(x) + right(x) : lhs(x) - right(x));
        }
        return left;
    }

    function parseProduct() {
        let left = parseUnary();
        if (!left) return null;
        while (atOperator('*') || atOperator('/')) {
            const symbol = tokens[position++].symbol;
            const right = parseUnary();
            if (!right) return null;
            const lhs = left;
            left = (x) => (symbol === '*' ? lhs(x) * right(x) : lhs(x) / right(x));
        }
        return left;
    }

    function parseUnary() {
        if (atOperator('-')) {
            position++;
            const operand = parseUnary();
            return operand ? (x) => -operand(x) : null;
        }
        return parsePower();
    }

    function parsePower() {
        const base = parseAtom();
        if (!base) return null;
        if (!atOperator('^')) return base;

        position++;
        const exponent = parseUnary();
        if (!exponent) return null;
        return (x) => Math.pow(base(x), exponent(x));
    }

    function parseAtom() {
        const token = peek();
        if (!token) return null;

        if (token.type === TOKEN.NUMBER) {
            position++;
            return () => token.value;
        }
        if (token.type === TOKEN.VARIABLE) {
            position++;
            return (x) => x;
        }
        if (token.type === TOKEN.FUNCTION) {
            position++;
            if (!atOperator('(')) return null;
            position++;
            const argument = parseSum();
            if (!argument || !atOperator(')')) return null;
            position++;
            const fn = GRAPH_FUNCTIONS[token.name];
            return (x) => fn(argument(x));
        }
        if (token.type === TOKEN.OPERATOR && token.symbol === '(') {
            position++;
            const inner = parseSum();
            if (!inner || !atOperator(')')) return null;
            position++;
            return inner;
        }
        return null;
    }

    const compiled = parseSum();
    if (!compiled || position !== tokens.length) return null; // 남은 토큰이 있으면 실패
    return compiled;
}

// ===== SVG 그리기 =====

const GRAPH_VIEW = {
    width: 280,
    height: 200,
    padding: 8,
    xMin: -6,
    xMax: 6,
    sampleCount: 240,   // x 축을 몇 등분해 값을 계산할지
    valueLimit: 1e4,    // 발산하는 값이 세로 축을 망가뜨리지 않도록 자르는 한계
    verticalMargin: 0.12 // 위아래로 남기는 여백 비율
};

const SVG_NS = 'http://www.w3.org/2000/svg';
const AXIS_COLOR = '#C7CEDB';
const CURVE_COLORS = ['#6C8CFF', '#E24D4D', '#34C77B'];

// 저장 형식(문자열 또는 배열) → 함수식 문자열 배열
function normalizeGraphData(graph) {
    if (!graph) return [];
    if (Array.isArray(graph)) return graph.filter((item) => typeof item === 'string' && item.trim());
    if (typeof graph !== 'string') return [];

    const text = graph.trim();
    if (!text) return [];
    if (!text.startsWith('[')) return [text];

    // DB 에는 함수식 여러 개가 JSON 배열 문자열로 저장된다.
    try {
        const parsed = JSON.parse(text);
        return Array.isArray(parsed) ? parsed.filter((item) => typeof item === 'string' && item.trim()) : [];
    } catch {
        return [text];
    }
}

// 함수 하나를 x 구간 전체에서 표본 추출한다. 정의되지 않은 지점은 null 로 남긴다.
function samplePoints(fn) {
    const { xMin, xMax, sampleCount, valueLimit } = GRAPH_VIEW;
    const points = [];

    for (let step = 0; step <= sampleCount; step++) {
        const x = xMin + (xMax - xMin) * step / sampleCount;
        const y = fn(x);
        if (!isFinite(y)) {
            points.push(null);
            continue;
        }
        points.push({ x, y: Math.max(-valueLimit, Math.min(valueLimit, y)) });
    }
    return points;
}

// 모든 곡선이 들어가는 y 범위를 구한다. 그릴 값이 하나도 없으면 null.
function findYRange(sampleSets) {
    let min = Infinity;
    let max = -Infinity;

    for (const points of sampleSets) {
        for (const point of points) {
            if (!point) continue;
            if (point.y < min) min = point.y;
            if (point.y > max) max = point.y;
        }
    }
    if (!isFinite(min) || !isFinite(max)) return null;

    // 상수 함수처럼 폭이 0이면 납작해지므로 최소한의 높이를 준다.
    if (min === max) {
        min -= 1;
        max += 1;
    }
    const margin = (max - min) * GRAPH_VIEW.verticalMargin;
    return { min: min - margin, max: max + margin };
}

function createSvgLine(x1, y1, x2, y2) {
    const line = document.createElementNS(SVG_NS, 'line');
    line.setAttribute('x1', x1);
    line.setAttribute('y1', y1);
    line.setAttribute('x2', x2);
    line.setAttribute('y2', y2);
    line.setAttribute('stroke', AXIS_COLOR);
    line.setAttribute('stroke-width', '1');
    return line;
}

// 표본점을 SVG path 의 d 속성으로 바꾼다. 화면 밖으로 튀는 구간에서는 선을 끊는다.
function buildPathData(points, toX, toY) {
    const { height } = GRAPH_VIEW;
    let data = '';
    let drawing = false;

    for (const point of points) {
        if (!point) {
            drawing = false;
            continue;
        }
        const x = toX(point.x);
        const y = toY(point.y);
        if (y < -height || y > 2 * height) {
            drawing = false;
            continue;
        }
        data += `${drawing ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)} `;
        drawing = true;
    }
    return data.trim();
}

function createCurve(pathData, color) {
    const path = document.createElementNS(SVG_NS, 'path');
    path.setAttribute('d', pathData);
    path.setAttribute('fill', 'none');
    path.setAttribute('stroke', color);
    path.setAttribute('stroke-width', '2');
    path.setAttribute('stroke-linejoin', 'round');
    path.setAttribute('stroke-linecap', 'round');
    return path;
}

/**
 * 함수식 배열을 SVG 그래프 엘리먼트로 만든다.
 * 파싱되는 식이 하나도 없거나 그릴 값이 없으면 null 을 돌려준다.
 */
function buildGraphSvg(expressions) {
    const compiled = expressions.map(compileExpression).filter(Boolean);
    if (!compiled.length) return null;

    const sampleSets = compiled.map(samplePoints);
    const yRange = findYRange(sampleSets);
    if (!yRange) return null;

    const { width, height, padding, xMin, xMax } = GRAPH_VIEW;
    const toX = (x) => padding + (x - xMin) / (xMax - xMin) * (width - 2 * padding);
    const toY = (y) => padding + (yRange.max - y) / (yRange.max - yRange.min) * (height - 2 * padding);

    const svg = document.createElementNS(SVG_NS, 'svg');
    svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
    svg.setAttribute('class', 'graph-svg');
    svg.setAttribute('role', 'img');

    // 축은 화면 안에 들어올 때만 그린다.
    if (yRange.min <= 0 && yRange.max >= 0) {
        svg.appendChild(createSvgLine(toX(xMin), toY(0), toX(xMax), toY(0)));
    }
    if (xMin <= 0 && xMax >= 0) {
        svg.appendChild(createSvgLine(toX(0), toY(yRange.min), toX(0), toY(yRange.max)));
    }

    sampleSets.forEach((points, index) => {
        const pathData = buildPathData(points, toX, toY);
        if (!pathData) return;
        svg.appendChild(createCurve(pathData, CURVE_COLORS[index % CURVE_COLORS.length]));
    });

    return svg;
}

// 그래프를 감싸는 박스를 만든다. 그릴 게 없으면 null.
function createGraphBox(graph) {
    const svg = buildGraphSvg(normalizeGraphData(graph));
    if (!svg) return null;

    const box = document.createElement('div');
    box.className = 'graph-box';
    box.appendChild(svg);
    return box;
}

// graph 데이터를 컨테이너 안에 그래프 박스로 렌더한다. 그릴 게 없으면 아무것도 안 한다.
function renderQuestionGraph(container, graph) {
    const box = createGraphBox(graph);
    if (box) container.appendChild(box);
}
