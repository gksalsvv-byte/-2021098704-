let cfdData = {};

// 1. CFD 데이터 로드
fetch('cfd_ref_data.json')
    .then(response => response.json())
    .then(data => {
        cfdData = data;
        onReChange(document.getElementById('reSlider').value);
    })
    .catch(err => console.error("JSON 데이터를 불러오는 중 오류 발생:", err));

// 가상의 AI 외삽 예측 계산 (Re 값 변경 시 호출)
function predictAI(re, rows=50, cols=50) {
    let result = [];
    let factor = re / 300.0; // Re 증가에 따른 물리적 감쇄 효과 모사
    for (let r = 0; r < rows; r++) {
        let row = [];
        for (let c = 0; c < cols; c++) {
            let u = Math.sin((r / rows) * Math.PI) * (c / cols) * (1.0 / factor);
            let v = Math.cos((c / cols) * Math.PI) * (r / rows) * 0.5;
            row.push(Math.sqrt(u * u + v * v));
        }
        result.push(row);
    }
    return result;
}

// 가장 가까운 CFD Re 수 찾기 (300, 500, 700, 1000)
function getNearestReKey(targetRe) {
    const availableRes = [300, 500, 700, 1000];
    let closest = availableRes.reduce((prev, curr) => 
        Math.abs(curr - targetRe) < Math.abs(prev - targetRe) ? curr : prev
    );
    return closest.toString();
}

function onReChange(reVal) {
    document.getElementById('reValDisplay').innerText = reVal;
    
    if (!cfdData || Object.keys(cfdData).length === 0) return;

    const closestKey = getNearestReKey(parseFloat(reVal));
    const cfdMatrix = cfdData[closestKey].vel_mag;
    const aiMatrix = predictAI(parseFloat(reVal), cfdMatrix.length, cfdMatrix[0].length);

    // AI와 CFD 두 결과의 Global Min/Max를 구해 동등한 Color Scale 적용
    let allVals = cfdMatrix.flat().concat(aiMatrix.flat());
    let minVal = Math.min(...allVals);
    let maxVal = Math.max(...allVals);

    drawHeatmap('aiCanvas', aiMatrix, minVal, maxVal);
    drawHeatmap('cfdCanvas', cfdMatrix, minVal, maxVal);
}

function drawHeatmap(canvasId, matrix, minVal, maxVal) {
    const canvas = document.getElementById(canvasId);
    const ctx = canvas.getContext('2d');
    const rows = matrix.length;
    const cols = matrix[0].length;
    const cellW = canvas.width / cols;
    const cellH = canvas.height / rows;

    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            let norm = (matrix[r][c] - minVal) / (maxVal - minVal + 1e-6);
            ctx.fillStyle = getJetColor(norm);
            ctx.fillRect(c * cellW, (rows - 1 - r) * cellH, cellW, cellH); // Y축 반전 보정
        }
    }
}

// Jet Color Map
function getJetColor(val) {
    let r = Math.min(Math.max(1.5 - Math.abs(val * 4 - 3), 0), 1);
    let g = Math.min(Math.max(1.5 - Math.abs(val * 4 - 2), 0), 1);
    let b = Math.min(Math.max(1.5 - Math.abs(val * 4 - 1), 0), 1);
    return `rgb(${Math.floor(r * 255)}, ${Math.floor(g * 255)}, ${Math.floor(b * 255)})`;
}