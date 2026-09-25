/**
 * 文化祭 会計システム フロントエンド処理
 */

// ==========================================
// 1. 設定項目 (メニュー・価格・GASのURL)
// ==========================================

// ★作成したGASの「ウェブアプリURL」を入力してください
const GAS_WEB_APP_URL = "https://script.google.com/macros/s/AKfycbxJk1q9uBGcmb7N00EGJTLUKHk5QRSjyrBgYYloPVnXFgxdMPGOarhCQVlf-xQI7e9BWQ/exec";

// ★追加: 金券の1枚あたりの額面 (50円)
const TICKET_UNIT_PRICE = 50;

// メニュー設定 (品目名と単価を変更・追加できます)
// スプレッドシートの列順と一致させておくと管理がスムーズです。
const menuItems = [
    { id: "item_a", name: "ポテト", price: 150 },
    { id: "item_b", name: "バナナチョコクレープ", price: 200 },
    { id: "item_d", name: "アイストッピング", price: 50 }
];

// 注文データ管理用オブジェクト
const orderState = {};

// ==========================================
// 2. 初期化処理
// ==========================================

document.addEventListener("DOMContentLoaded", () => {
    // 状態の初期化
    menuItems.forEach(item => {
        orderState[item.id] = 0;
    });

    // UIの描画
    renderMenu();
    
    // イベントリスナーの登録
    document.getElementById("reset-btn").addEventListener("click", resetOrder);
    document.getElementById("submit-btn").addEventListener("click", submitOrder);
});

// ==========================================
// 3. UI描画・計算処理
// ==========================================

// メニュー要素の生成
function renderMenu() {
    const container = document.getElementById("menu-container");
    container.innerHTML = "";

    menuItems.forEach(item => {
        const itemDiv = document.createElement("div");
        itemDiv.className = "menu-item";

        itemDiv.innerHTML = `
            <div class="item-info">
                <span class="item-name">${item.name}</span>
                <span class="item-price">¥${item.price.toLocaleString()}</span>
            </div>
            <div class="quantity-control">
                <button type="button" class="btn-qty" onclick="changeQuantity('${item.id}', -1)">-</button>
                <input type="number" id="qty-${item.id}" class="qty-input" value="0" min="0" onchange="updateQuantityDirectly('${item.id}', this.value)">
                <button type="button" class="btn-qty" onclick="changeQuantity('${item.id}', 1)">+</button>
            </div>
        `;
        container.appendChild(itemDiv);
    });
}

// 数量変更 (+ / - ボタン操作)
function changeQuantity(itemId, delta) {
    const currentQty = orderState[itemId] || 0;
    const newQty = Math.max(0, currentQty + delta);
    
    orderState[itemId] = newQty;
    document.getElementById(`qty-${itemId}`).value = newQty;
    
    calculateTotal();
}

// 数量直接入力時の更新
function updateQuantityDirectly(itemId, value) {
    const parsedVal = parseInt(value, 10);
    const newQty = isNaN(parsedVal) || parsedVal < 0 ? 0 : parsedVal;
    
    orderState[itemId] = newQty;
    document.getElementById(`qty-${itemId}`).value = newQty;
    
    calculateTotal();
}

// 合計金額および金券枚数の計算
function calculateTotal() {
    let total = 0;
    menuItems.forEach(item => {
        const qty = orderState[item.id] || 0;
        total += item.price * qty;
    });

    // 50円金券の必要枚数を計算 (万が一端数が出た場合を考慮して切り上げ)
    const ticketCount = Math.ceil(total / TICKET_UNIT_PRICE);

    // 画面の更新
    document.getElementById("total-amount").textContent = total.toLocaleString();
    
    // ★追加: 必要金券枚数の表示更新
    const ticketElem = document.getElementById("ticket-count");
    if (ticketElem) {
        ticketElem.textContent = ticketCount.toLocaleString();
    }

    // ★追加: アイストッピングの制約判定処理
    checkIceQuantityConstraint();

    return total;
}

// アイストッピングの数量チェック・画面警告表示
function checkIceQuantityConstraint() {
    const crepeQty = orderState["item_b"] || 0; // バナナチョコクレープ
    const iceQty = orderState["item_d"] || 0;   // アイストッピング
    const warningElem = document.getElementById("ice-warning");
    const submitBtn = document.getElementById("submit-btn");

    if (iceQty > crepeQty) {
        if (warningElem) {
            warningElem.textContent = `⚠️ アイストッピング(${iceQty}個)はバナナチョコクレープ(${crepeQty}個)の数量以下にしてください。`;
            warningElem.style.display = "block";
        }
        submitBtn.disabled = true; // 警告がある間は送信ボタンを無効化
    } else {
        if (warningElem) {
            warningElem.textContent = "";
            warningElem.style.display = "none";
        }
        submitBtn.disabled = false; // 条件を満たせば送信可能
    }
}

// 入力データのリセット
function resetOrder() {
    menuItems.forEach(item => {
        orderState[item.id] = 0;
        const inputElem = document.getElementById(`qty-${item.id}`);
        if (inputElem) inputElem.value = 0;
    });
    
    calculateTotal();
    setStatus("", "");
}

// ステータスメッセージの表示制御
function setStatus(message, type) {
    const statusElem = document.getElementById("status-message");
    statusElem.textContent = message;
    
    if (type === "success") {
        statusElem.style.color = "#27ae60";
    } else if (type === "error") {
        statusElem.style.color = "#e74c3c";
    } else {
        statusElem.style.color = "#333";
    }
}

// ==========================================
// 4. データ送信処理 (GAS連携)
// ==========================================

async function submitOrder() {
    const totalAmount = calculateTotal();

    // 合計が0円の場合は送信させない
    if (totalAmount === 0) {
        setStatus("商品を1つ以上選択してください。", "error");
        return;
    }

    // ★追加: 送信前のアラート確認表示
    const crepeQty = orderState["item_b"] || 0;
    const iceQty = orderState["item_d"] || 0;
    const potatoQty = orderState["item_a"] || 0;

    const confirmMessage = `以下の内容で注文を送信しますか？\n\n` +
        `・ポテト: ${potatoQty} 個\n` +
        `・バナナチョコクレープ: ${crepeQty} 個\n` +
        `・アイストッピング: ${iceQty} 個\n\n` +
        `合計金額: ${totalAmount.toLocaleString()} 円`;

    if (!confirm(confirmMessage)) {
        return; // キャンセルが押された場合は中断
    }

    if (GAS_WEB_APP_URL === "YOUR_GAS_WEB_APP_URL_HERE" || !GAS_WEB_APP_URL) {
        setStatus("script.js に Google Apps Script の URL を設定してください。", "error");
        return;
    }

    const submitBtn = document.getElementById("submit-btn");
    submitBtn.disabled = true;
    setStatus("送信中...", "info");

    // 送信データの整形 (スプレッドシート連携用)
    const payload = {
        totalAmount: totalAmount,
        items: menuItems.map(item => ({
            id: item.id,
            name: item.name,
            quantity: orderState[item.id] || 0
        }))
    };

    try {
        // GASへのPOSTリクエスト送信
        const response = await fetch(GAS_WEB_APP_URL, {
            method: "POST",
            headers: {
                "Content-Type": "text/plain;charset=utf-8" // CORS回避のためtext/plainで送信
            },
            body: JSON.stringify(payload)
        });

        const result = await response.json();

        if (result.status === "success") {
            setStatus("送信が完了しました！", "success");
            // 1秒後に自動リセット
            setTimeout(() => {
                resetOrder();
            }, 1000);
        } else {
            throw new Error(result.message || "送信エラーが発生しました。");
        }

    } catch (error) {
        console.error("Error:", error);
        setStatus("エラーが発生しました。もう一度お試しください。", "error");
    } finally {
        submitBtn.disabled = false;
    }
}