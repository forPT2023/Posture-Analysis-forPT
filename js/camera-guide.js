/**
 * カメラガイド機能 v13.9.5 - シンプル版
 * 中央に縦線のみ表示（耳の位置合わせ用）
 */

class CameraGuide {
    constructor(targetType) {
        this.targetType = targetType; // 'before' or 'after'
        this.stream = null;
        this.drawingStarted = false; // 描画開始フラグ
        
        // DOM要素の参照
        this.modal = null;
        this.video = null;
        this.canvas = null;
        this.ctx = null;
    }
    
    /**
     * カメラモーダルを表示
     */
    async show() {
        try {
            // モーダルを作成
            this.createModal();
            
            // モーダルを先に表示（カメラ起動中の状態を表示）
            this.modal.classList.add('active');
            
            // カメラを起動（loadedmetadataを待つ）
            await this.startCamera();
            
            console.log('📸 カメラ起動完了、縦線ガイド開始');
            
            // 中央縦線ガイドを開始
            this.startCenterLineGuide();
            
        } catch (error) {
            console.error('❌ カメラ起動エラー:', error);
            this.handleCameraError(error);
        }
    }
    
    /**
     * モーダルUIを作成
     */
    createModal() {
        // 既存のモーダルがあれば削除
        const existingModal = document.getElementById('cameraGuideModal');
        if (existingModal) {
            existingModal.remove();
        }
        
        // モーダルHTML
        const modalHTML = `
            <div id="cameraGuideModal" class="camera-modal">
                <!-- カメラコンテナ -->
                <div class="camera-container">
                    <video id="cameraVideo" class="camera-video" autoplay playsinline></video>
                    <canvas id="centerLineCanvas" class="center-line-canvas"></canvas>
                </div>
                
                <!-- ガイドテキスト -->
                <div class="guide-text">
                    中央の縦線に耳の位置を合わせてください
                </div>
                
                <!-- カメラコントロール -->
                <div class="camera-controls">
                    <button id="closeCameraBtn" class="close-camera-button">
                        <i class="fas fa-times"></i> キャンセル
                    </button>
                    <button id="captureBtn" class="capture-button" title="撮影"></button>
                </div>
            </div>
        `;
        
        // DOMに追加
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        
        // 要素の参照を取得
        this.modal = document.getElementById('cameraGuideModal');
        this.video = document.getElementById('cameraVideo');
        this.canvas = document.getElementById('centerLineCanvas');
        this.ctx = this.canvas.getContext('2d');
        
        // イベントリスナー
        document.getElementById('closeCameraBtn').addEventListener('click', () => this.close());
        document.getElementById('captureBtn').addEventListener('click', () => this.capture());
    }
    
    /**
     * カメラを起動
     */
    async startCamera() {
        try {
            // カメラストリームを取得
            this.stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    facingMode: 'environment', // 背面カメラを優先
                    width: { ideal: 1920 },
                    height: { ideal: 1080 }
                },
                audio: false
            });
            
            this.video.srcObject = this.stream;
            
            // ビデオが読み込まれるのを待つ
            return new Promise((resolve, reject) => {
                this.video.addEventListener('loadedmetadata', () => {
                    console.log('📹 ビデオメタデータ読み込み完了');
                    
                    // キャンバスサイズをビューポートサイズに設定
                    const updateCanvasSize = () => {
                        this.canvas.width = window.innerWidth;
                        this.canvas.height = window.innerHeight;
                        console.log(`📹 キャンバスサイズ設定: ${this.canvas.width}x${this.canvas.height}`);
                    };
                    
                    updateCanvasSize();
                    
                    // 画面回転時にも対応
                    window.addEventListener('resize', updateCanvasSize);
                    window.addEventListener('orientationchange', updateCanvasSize);
                    
                    resolve();
                });
                
                this.video.addEventListener('error', (e) => {
                    console.error('❌ ビデオエラー:', e);
                    reject(e);
                });
                
                // タイムアウト処理（5秒）
                setTimeout(() => {
                    if (this.canvas.width === 0) {
                        console.warn('⚠️ loadedmetadataタイムアウト、強制的にキャンバスサイズを設定');
                        this.canvas.width = window.innerWidth;
                        this.canvas.height = window.innerHeight;
                        resolve();
                    }
                }, 5000);
            });
            
        } catch (error) {
            throw error;
        }
    }
    
    /**
     * 中央縦線ガイドを開始
     */
    startCenterLineGuide() {
        console.log('🎨 startCenterLineGuide 呼び出し');
        
        const drawCenterLine = () => {
            if (!this.modal || !this.modal.classList.contains('active')) {
                console.log('⚠️ モーダル非アクティブ、描画中止');
                return;
            }
            
            // キャンバスサイズが未設定の場合は次のフレームで再試行
            if (this.canvas.width === 0 || this.canvas.height === 0) {
                console.log(`⏳ キャンバスサイズ待機中: ${this.canvas.width}x${this.canvas.height}`);
                requestAnimationFrame(drawCenterLine);
                return;
            }
            
            // 初回のみログ出力
            if (!this.drawingStarted) {
                console.log(`✅ 縦線描画開始: ${this.canvas.width}x${this.canvas.height}`);
                this.drawingStarted = true;
            }
            
            // キャンバスクリア
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
            
            // 中央のX座標
            const centerX = this.canvas.width / 2;
            
            // 中央に縦線を描画
            this.ctx.beginPath();
            this.ctx.moveTo(centerX, 0);
            this.ctx.lineTo(centerX, this.canvas.height);
            this.ctx.strokeStyle = 'rgba(255, 255, 0, 0.8)'; // 黄色
            this.ctx.lineWidth = 3;
            this.ctx.setLineDash([10, 10]); // 破線
            this.ctx.stroke();
            
            // 線の両端に三角マーカーを追加（視認性向上）
            const markerSize = 20;
            
            // 上部マーカー
            this.ctx.beginPath();
            this.ctx.moveTo(centerX, markerSize);
            this.ctx.lineTo(centerX - markerSize / 2, 0);
            this.ctx.lineTo(centerX + markerSize / 2, 0);
            this.ctx.closePath();
            this.ctx.fillStyle = 'rgba(255, 255, 0, 0.8)';
            this.ctx.fill();
            
            // 下部マーカー
            this.ctx.beginPath();
            this.ctx.moveTo(centerX, this.canvas.height - markerSize);
            this.ctx.lineTo(centerX - markerSize / 2, this.canvas.height);
            this.ctx.lineTo(centerX + markerSize / 2, this.canvas.height);
            this.ctx.closePath();
            this.ctx.fill();
            
            // 次のフレーム
            requestAnimationFrame(drawCenterLine);
        };
        
        drawCenterLine();
    }
    
    /**
     * 撮影実行
     */
    async capture() {
        try {
            // キャンバスに現在のフレームを描画
            const captureCanvas = document.createElement('canvas');
            captureCanvas.width = this.video.videoWidth;
            captureCanvas.height = this.video.videoHeight;
            const captureCtx = captureCanvas.getContext('2d');
            captureCtx.drawImage(this.video, 0, 0);
            
            // 画像データを取得
            captureCanvas.toBlob((blob) => {
                if (!blob) {
                    console.error('❌ Blob生成エラー');
                    alert('画像の生成に失敗しました。もう一度お試しください。');
                    return;
                }
                
                // Blobから画像を読み込む
                const reader = new FileReader();
                reader.onload = (e) => {
                    // 対応する入力フィールドに画像を設定
                    if (this.targetType === 'before') {
                        this.setImageToInput(e.target.result, 'Before');
                    } else {
                        this.setImageToInput(e.target.result, 'After');
                    }
                    
                    // モーダルを閉じる
                    this.close();
                    
                    // 完了メッセージ
                    if (typeof showToast === 'function') {
                        showToast('📸 撮影完了！', 'success');
                    }
                };
                reader.readAsDataURL(blob);
            }, 'image/jpeg', 0.95);
            
        } catch (error) {
            console.error('❌ 撮影エラー:', error);
            alert('撮影に失敗しました。もう一度お試しください。');
        }
    }
    
    /**
     * 撮影した画像を入力フィールドに設定
     */
    setImageToInput(dataURL, type) {
        // DataURLからBlobを作成してFileオブジェクトに変換
        fetch(dataURL)
            .then(res => res.blob())
            .then(blob => {
                const file = new File([blob], `camera-capture-${type.toLowerCase()}.jpg`, { 
                    type: 'image/jpeg' 
                });
                
                // main.jsのhandleImageUpload関数を呼び出す
                if (typeof handleImageUpload === 'function') {
                    handleImageUpload(file, type.toLowerCase());
                    console.log(`✅ カメラ画像を${type}に設定しました`);
                } else {
                    console.error('❌ handleImageUpload関数が見つかりません');
                    // フォールバック: 直接画像を設定
                    this.setImageDirectly(dataURL, type);
                }
            })
            .catch(error => {
                console.error('❌ 画像変換エラー:', error);
                // フォールバック: 直接画像を設定
                this.setImageDirectly(dataURL, type);
            });
    }
    
    /**
     * 画像を直接設定（フォールバック用）
     */
    setImageDirectly(dataURL, type) {
        const img = new Image();
        img.onload = () => {
            if (type === 'Before') {
                beforeImage = img;
                document.getElementById('previewBefore').innerHTML = 
                    `<img src="${dataURL}" alt="Before">`;
                document.getElementById('editBeforeBtn').style.display = 'inline-block';
            } else {
                afterImage = img;
                document.getElementById('previewAfter').innerHTML = 
                    `<img src="${dataURL}" alt="After">`;
                document.getElementById('editAfterBtn').style.display = 'inline-block';
            }
            
            // 分析ボタンの状態を更新
            if (typeof updateAnalyzeButton === 'function') {
                updateAnalyzeButton();
            }
        };
        img.src = dataURL;
    }
    
    /**
     * カメラを停止してモーダルを閉じる
     */
    close() {
        // カメラストリームを停止
        if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop());
            this.stream = null;
        }
        
        // モーダルを非表示
        if (this.modal) {
            this.modal.classList.remove('active');
            setTimeout(() => {
                this.modal.remove();
            }, 300);
        }
        
        console.log('📸 カメラガイド終了');
    }
    
    /**
     * カメラエラーハンドリング
     */
    handleCameraError(error) {
        let message = 'カメラの起動に失敗しました。';
        
        if (error.name === 'NotAllowedError') {
            message = 'カメラの使用が許可されていません。\nブラウザの設定を確認してください。';
        } else if (error.name === 'NotFoundError') {
            message = 'カメラが見つかりません。\nデバイスにカメラが接続されているか確認してください。';
        } else if (error.name === 'NotReadableError') {
            message = 'カメラが他のアプリケーションで使用中です。';
        }
        
        alert(message);
        this.close();
    }
}

// グローバルに公開
window.CameraGuide = CameraGuide;

console.log('✅ カメラガイド機能 v13.9.5 (シンプル版) ロード完了');
