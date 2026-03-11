// ==================== ランドマーク編集機能（デバッグ強化版） ====================

function openLandmarkEditor() {
    if (!beforePose || !afterPose) {
        alert('まず画像を分析してください');
        return;
    }
    
    // オリジナルのランドマークをバックアップ
    originalLandmarks = {
        before: JSON.parse(JSON.stringify(beforePose.poseLandmarks)),
        after: JSON.parse(JSON.stringify(afterPose.poseLandmarks))
    };
    
    // 編集用にコピー
    editingLandmarks = {
        before: JSON.parse(JSON.stringify(beforePose.poseLandmarks)),
        after: JSON.parse(JSON.stringify(afterPose.poseLandmarks))
    };
    
    const modal = document.getElementById('landmarkEditorModal');
    editingTab = 'before';
    
    // タブをリセット
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.target === 'before') {
            btn.classList.add('active');
        }
    });
    
    // 初期描画
    drawLandmarkEditor();
    
    // モーダルを表示
    modal.classList.add('show');
    
    console.log('🎨 ランドマークエディター起動');
}

function drawLandmarkEditor() {
    const canvas = document.getElementById('landmarkCanvas');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    const image = editingTab === 'before' ? beforeImage : afterImage;
    const landmarks = editingLandmarks[editingTab];
    
    if (!image || !landmarks) return;
    
    // キャンバスサイズを画像のアスペクト比に合わせて設定
    const maxSize = 700;  // 最大サイズを700pxに拡大
    let width = image.width;
    let height = image.height;
    
    // アスペクト比を維持してリサイズ
    if (width > maxSize || height > maxSize) {
        const ratio = Math.min(maxSize / width, maxSize / height);
        width = Math.floor(width * ratio);
        height = Math.floor(height * ratio);
    }
    
    canvas.width = width;
    canvas.height = height;
    
    console.log(`📐 キャンバスサイズ: ${width}x${height}px, オリジナル: ${image.width}x${image.height}px`);
    
    // 画像を描画
    ctx.drawImage(image, 0, 0, width, height);
    
    // 表示対象のランドマークインデックス
    const visibleLandmarks = getVisibleLandmarks();
    
    console.log(`👁️ 表示するランドマーク: ${visibleLandmarks.join(', ')}`);
    
    // ランドマークを描画
    visibleLandmarks.forEach(index => {
        const landmark = landmarks[index];
        if (!landmark) return;
        
        const x = landmark.x * width;
        const y = landmark.y * height;
        
        // ランドマークの円（大きく）
        ctx.beginPath();
        ctx.arc(x, y, 15, 0, 2 * Math.PI);  // 15pxに拡大
        ctx.fillStyle = 'rgba(255, 215, 0, 0.7)';  // ゴールド色
        ctx.fill();
        ctx.strokeStyle = '#FF0000';  // 赤い枠
        ctx.lineWidth = 4;  // 太い枠
        ctx.stroke();
        
        // ランドマーク番号（白背景付き）
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(x - 12, y - 18, 24, 20);
        
        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 14px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(index, x, y - 8);
    });
}

function getVisibleLandmarks() {
    // drawReferencePlane関数で使用されるランドマークのみ
    if (selectedPlane === 'frontal') {
        // 前面: 両肩、両腰、鼻、両目、両耳
        return [0, 2, 5, 7, 8, 11, 12, 23, 24];
    } else {
        // 側面: 左側 or 右側
        const leftShoulder = beforePose?.poseLandmarks?.[11];
        const rightShoulder = beforePose?.poseLandmarks?.[12];
        
        if (leftShoulder && rightShoulder && leftShoulder.z < rightShoulder.z) {
            // 左側が前
            return [0, 7, 11, 23, 25, 27, 29, 31];
        } else {
            // 右側が前
            return [0, 8, 12, 24, 26, 28, 30, 32];
        }
    }
}

function setupLandmarkDrag(canvas) {
    const getEventPos = (e) => {
        const rect = canvas.getBoundingClientRect();
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        
        // キャンバスの実サイズとCSS表示サイズの比率を計算
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        
        const canvasX = (clientX - rect.left) * scaleX;
        const canvasY = (clientY - rect.top) * scaleY;
        
        // デバッグ出力
        console.log(`🖱️ クリック位置: 
            スクリーン: (${Math.round(clientX)}, ${Math.round(clientY)})
            rect.left/top: (${Math.round(rect.left)}, ${Math.round(rect.top)})
            相対位置: (${Math.round(clientX - rect.left)}, ${Math.round(clientY - rect.top)})
            スケール: (${scaleX.toFixed(2)}, ${scaleY.toFixed(2)})
            キャンバス座標: (${Math.round(canvasX)}, ${Math.round(canvasY)})`);
        
        return {
            x: canvasX,
            y: canvasY
        };
    };
    
    const findNearestLandmark = (x, y) => {
        const landmarks = editingLandmarks[editingTab];
        const visibleLandmarks = getVisibleLandmarks();
        const threshold = 40; // 判定範囲を40pxに拡大
        
        let nearest = -1;
        let minDist = threshold;
        
        console.log(`🔍 最寄りランドマーク検索: (${Math.round(x)}, ${Math.round(y)})`);
        
        visibleLandmarks.forEach(index => {
            const landmark = landmarks[index];
            if (!landmark) return;
            
            const lx = landmark.x * canvas.width;
            const ly = landmark.y * canvas.height;
            const dist = Math.sqrt((x - lx) ** 2 + (y - ly) ** 2);
            
            console.log(`  ランドマーク ${index}: (${Math.round(lx)}, ${Math.round(ly)}) 距離: ${Math.round(dist)}px`);
            
            if (dist < minDist) {
                minDist = dist;
                nearest = index;
            }
        });
        
        if (nearest >= 0) {
            console.log(`✅ 選択: ランドマーク ${nearest} (距離: ${Math.round(minDist)}px)`);
        } else {
            console.log(`❌ 範囲内にランドマークなし (閾値: ${threshold}px)`);
        }
        
        return nearest;
    };
    
    const onStart = (e) => {
        const pos = getEventPos(e);
        draggedLandmarkIndex = findNearestLandmark(pos.x, pos.y);
        
        if (draggedLandmarkIndex >= 0) {
            isDraggingLandmark = true;
            canvas.style.cursor = 'grabbing';
            console.log(`🖐️ ドラッグ開始: ランドマーク ${draggedLandmarkIndex}`);
            e.preventDefault();
        }
    };
    
    const onMove = (e) => {
        if (!isDraggingLandmark) {
            const pos = getEventPos(e);
            const nearest = findNearestLandmark(pos.x, pos.y);
            canvas.style.cursor = nearest >= 0 ? 'pointer' : 'default';
            return;
        }
        
        const pos = getEventPos(e);
        const landmarks = editingLandmarks[editingTab];
        
        if (landmarks[draggedLandmarkIndex]) {
            // キャンバス座標を正規化座標に変換
            const normalizedX = pos.x / canvas.width;
            const normalizedY = pos.y / canvas.height;
            
            // 範囲チェック（0〜1の範囲内）
            landmarks[draggedLandmarkIndex].x = Math.max(0, Math.min(1, normalizedX));
            landmarks[draggedLandmarkIndex].y = Math.max(0, Math.min(1, normalizedY));
            
            drawLandmarkEditor();
            
            // 情報を更新
            const landmarkInfo = document.getElementById('landmarkInfo');
            if (landmarkInfo) {
                landmarkInfo.textContent = `ランドマーク ${draggedLandmarkIndex} を調整中... (${Math.round(pos.x)}, ${Math.round(pos.y)})`;
            }
        }
        
        e.preventDefault();
    };
    
    const onEnd = () => {
        if (isDraggingLandmark) {
            isDraggingLandmark = false;
            canvas.style.cursor = 'default';
            console.log(`🏁 ドラッグ終了: ランドマーク ${draggedLandmarkIndex}`);
            
            const landmarkInfo = document.getElementById('landmarkInfo');
            if (landmarkInfo) {
                landmarkInfo.textContent = 'マーカーをドラッグして位置を調整できます';
            }
        }
        draggedLandmarkIndex = -1;
    };
    
    canvas.addEventListener('mousedown', onStart);
    canvas.addEventListener('mousemove', onMove);
    canvas.addEventListener('mouseup', onEnd);
    canvas.addEventListener('mouseleave', onEnd);
    
    canvas.addEventListener('touchstart', onStart, {passive: false});
    canvas.addEventListener('touchmove', onMove, {passive: false});
    canvas.addEventListener('touchend', onEnd);
}

// イベントリスナー設定
document.addEventListener('DOMContentLoaded', function() {
    
    // ランドマーク編集ボタン
    const editLandmarksBtn = document.getElementById('editLandmarksBtn');
    if (editLandmarksBtn) {
        editLandmarksBtn.addEventListener('click', openLandmarkEditor);
    }
    
    // タブ切り替え
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            editingTab = btn.dataset.target;
            console.log(`🔄 タブ切り替え: ${editingTab}`);
            drawLandmarkEditor();
        });
    });
    
    // キャンバスのドラッグ設定
    const landmarkCanvas = document.getElementById('landmarkCanvas');
    if (landmarkCanvas) {
        setupLandmarkDrag(landmarkCanvas);
    }
    
    // リセットボタン
    const resetBtn = document.getElementById('landmarkEditorReset');
    if (resetBtn) {
        resetBtn.addEventListener('click', () => {
            if (originalLandmarks) {
                editingLandmarks = {
                    before: JSON.parse(JSON.stringify(originalLandmarks.before)),
                    after: JSON.parse(JSON.stringify(originalLandmarks.after))
                };
                drawLandmarkEditor();
                console.log('♻️ ランドマークを自動検出に戻しました');
            }
        });
    }
    
    // 適用ボタン
    const applyBtn = document.getElementById('landmarkEditorApply');
    if (applyBtn) {
        applyBtn.addEventListener('click', () => {
            applyLandmarkEdits();
            closeLandmarkEditor();
        });
    }
    
    // 閉じるボタン
    const closeBtn = document.getElementById('landmarkEditorClose');
    if (closeBtn) {
        closeBtn.addEventListener('click', closeLandmarkEditor);
    }
});

function applyLandmarkEdits() {
    if (!editingLandmarks) return;
    
    // 編集したランドマークを適用
    beforePose.poseLandmarks = editingLandmarks.before;
    afterPose.poseLandmarks = editingLandmarks.after;
    
    console.log('✅ ランドマークの調整を適用しました');
    
    // 結果を再表示
    displayResults();
}

function closeLandmarkEditor() {
    const modal = document.getElementById('landmarkEditorModal');
    modal.classList.remove('show');
    editingLandmarks = null;
    originalLandmarks = null;
    isDraggingLandmark = false;
    draggedLandmarkIndex = -1;
    console.log('🚪 ランドマークエディター閉じました');
}
