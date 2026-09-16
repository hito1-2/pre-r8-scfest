/**
 * 文化祭 会計システム フロントエンド処理
 */

// ==========================================
// 1. 設定項目 (メニュー・価格・GASのURL)
// ==========================================

// ★作成したGASの「ウェブアプリURL」を入力してください
const GAS_WEB_APP_URL = "https://script.google.com/macros/s/AKfycbxJk1q9uBGcmb7N00EGJTLUKHk5QRSjyrBgYYloPVnXFgxdMPGOarhCQVlf-xQI7e9BWQ/exec";

// メニュー設定 (品目名と単価を変更・追加できます)
// スプレッドシートの列順と一致させておくと管理がスムーズです。
const menuItems = [
    { id: "item_a", name: "フライドポテト", price: 200 },
    { id: "item_b", name: "クレープ１", price: 300 },
    { id: "item_c", name: "クレープ２", price: 100 },
    { id: "item_d", name: "アイストッピング", price: 100 }
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

// 合計金額の計算
function calculateTotal() {
    let total = 0;
    menuItems.forEach(item => {
        const qty = orderState[item.id] || 0;
        total += item.price * qty;
    });

    document.getElementById("total-amount").textContent = total.toLocaleString();
    return total;
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
        alert("商品を1つ以上選択してください。");
        return;
    }

    if (GAS_WEB_APP_URL === "YOUR_GAS_WEB_APP_URL_HERE" || !GAS_WEB_APP_URL) {
        alert("script.js に Google Apps Script の URL を設定してください。");
        return;
    }

    const submitBtn = document.getElementById("submit-btn");
    submitBtn.disabled = true;
    setStatus("送信中...", "info");

    // 送信データの整形
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
