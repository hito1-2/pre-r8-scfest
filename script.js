/**

* 文化祭 会計システム
* フロントエンド処理
  */

/* ========================================
設定
======================================== */

const GAS_WEB_APP_URL = "ここにGASのURL";

const TICKET_UNIT_PRICE = 50;

/* ========================================
メニュー
======================================== */

const menuItems = [

```
{
    id: "item_a",
    name: "ポテト",
    price: 150
},

{
    id: "item_b",
    name: "バナナチョコクレープ",
    price: 250
},

{
    id: "item_d",
    name: "アイストッピング",
    price: 50
}
```

];

/* ========================================
注文状態
======================================== */

const orderState = {};

/* ========================================
効果音
======================================== */

const SOUND_FILES = {

```
success: [
    "success.mp3",
    "success.wav"
],

error: [
    "error.mp3",
    "error.wav"
],

iceOver: [
    "ice-over.mp3",
    "ice-over.wav"
],

empty: [
    "empty.mp3",
    "empty.wav"
]
```

};

const soundPlayers = {};

/* ========================================
エラーメッセージ
======================================== */

const SUBMIT_ERROR_MESSAGE =
"【エラー】送信できませんでした。もう一度お試しください。\n" +
"ただし、送信されていてもこのエラーが表示されることがあります。";

/* ========================================
初期化
======================================== */

document.addEventListener(
"DOMContentLoaded",
() => {

```
    /*
     * 認証失敗などによって
     * 会計画面が存在しない場合は何もしない。
     *
     * これにより、
     *
     * document.body.innerHTML = ...
     *
     * によって401ページへ変更された場合でも
     * JavaScriptエラーにならない。
     */

    const resetBtn =
        document.getElementById("reset-btn");

    const submitBtn =
        document.getElementById("submit-btn");


    if (!resetBtn || !submitBtn) {
        return;
    }


    /*
     * 注文数量を初期化
     */

    menuItems.forEach(item => {

        orderState[item.id] = 0;

    });


    /*
     * 効果音を準備
     */

    preloadSounds();


    /*
     * メニューを生成
     */

    renderMenu();


    /*
     * 合計を計算
     */

    calculateTotal();


    /*
     * ボタンイベント
     */

    resetBtn.addEventListener(
        "click",
        resetOrder
    );


    submitBtn.addEventListener(
        "click",
        submitOrder
    );

}
```

);

/* ========================================
効果音の事前読み込み
======================================== */

function preloadSounds() {

```
Object.keys(SOUND_FILES).forEach(
    key => {

        soundPlayers[key] =
            createAudioWithFallback(
                SOUND_FILES[key]
            );

    }
);
```

}

/* ========================================
MP3 / WAV フォールバック
======================================== */

function createAudioWithFallback(fileList) {

```
const audio = new Audio();

audio.preload = "auto";


if (
    !Array.isArray(fileList) ||
    fileList.length === 0
) {
    return audio;
}


audio.src = fileList[0];


let currentIndex = 0;


audio.addEventListener(
    "error",
    () => {

        currentIndex += 1;


        if (
            currentIndex <
            fileList.length
        ) {

            audio.src =
                fileList[currentIndex];

            audio.load();

        }

    }
);


return audio;
```

}

/* ========================================
効果音再生
======================================== */

function playSound(type) {

```
const baseAudio =
    soundPlayers[type];


if (!baseAudio) {
    return;
}


const audio =
    baseAudio.cloneNode(true);


audio.currentTime = 0;


audio.play().catch(
    error => {

        console.warn(
            `効果音の再生に失敗しました: ${type}`,
            error
        );

    }
);
```

}

/* ========================================
カスタムポップアップ
======================================== */

function showPopup(message) {

```
/*
 * 既存のポップアップを削除
 */

const existingPopup =
    document.querySelector(
        ".custom-popup-overlay"
    );


if (existingPopup) {
    existingPopup.remove();
}


/*
 * オーバーレイ
 */

const overlay =
    document.createElement("div");

overlay.className =
    "custom-popup-overlay";


/*
 * ポップアップ本体
 */

const popup =
    document.createElement("div");

popup.className =
    "custom-popup";


/*
 * メッセージ
 */

const messageElement =
    document.createElement("div");

messageElement.className =
    "custom-popup-message";

messageElement.textContent =
    message;


/*
 * OKボタン
 */

const button =
    document.createElement("button");

button.type = "button";

button.className =
    "custom-popup-button";

button.textContent = "OK";


/*
 * DOM構築
 */

popup.appendChild(
    messageElement
);

popup.appendChild(
    button
);

overlay.appendChild(
    popup
);

document.body.appendChild(
    overlay
);


/*
 * ポップアップを閉じる
 */

button.addEventListener(
    "click",
    () => {

        closePopup();

    }
);


/*
 * キーボード操作
 */

const keydownHandler =
    event => {

        if (
            event.key === "Enter" ||
            event.key === "Escape"
        ) {

            closePopup();

        }

    };


document.addEventListener(
    "keydown",
    keydownHandler
);


function closePopup() {

    overlay.remove();

    document.removeEventListener(
        "keydown",
        keydownHandler
    );

}


/*
 * ボタンにフォーカス
 */

requestAnimationFrame(
    () => {

        button.focus();

    }
);
```

}

/* ========================================
メニュー描画
======================================== */

function renderMenu() {

```
const container =
    document.getElementById(
        "menu-container"
    );


if (!container) {
    return;
}


container.innerHTML = "";


menuItems.forEach(item => {

    const itemDiv =
        document.createElement("div");


    itemDiv.className =
        "menu-item";


    itemDiv.innerHTML = `

        <div class="menu-item-main">

            <div class="item-info">

                <span class="item-name">
                    ${item.name}
                </span>

                <span class="item-price">
                    ¥${item.price.toLocaleString()}
                </span>

            </div>


            <div class="quantity-control">

                <button
                    type="button"
                    class="btn-qty"
                    onclick="changeQuantity('${item.id}', -1)"
                >
                    -
                </button>


                <input
                    type="number"
                    id="qty-${item.id}"
                    class="qty-input"
                    value="0"
                    min="0"
                    onchange="updateQuantityDirectly('${item.id}', this.value)"
                >


                <button
                    type="button"
                    class="btn-qty"
                    onclick="changeQuantity('${item.id}', 1)"
                >
                    +
                </button>

            </div>

        </div>


        <div
            id="warning-${item.id}"
            class="item-warning-msg"
        ></div>

    `;


    container.appendChild(
        itemDiv
    );

});
```

}

/* ========================================
数量変更
======================================== */

function changeQuantity(
itemId,
delta
) {

```
const currentQty =
    orderState[itemId] || 0;


const newQty =
    Math.max(
        0,
        currentQty + delta
    );


orderState[itemId] =
    newQty;


const inputElem =
    document.getElementById(
        `qty-${itemId}`
    );


if (inputElem) {

    inputElem.value =
        newQty;

}


calculateTotal();
```

}

/* ========================================
数量直接入力
======================================== */

function updateQuantityDirectly(
itemId,
value
) {

```
const parsedVal =
    parseInt(
        value,
        10
    );


const newQty =
    isNaN(parsedVal) ||
    parsedVal < 0
        ? 0
        : parsedVal;


orderState[itemId] =
    newQty;


const inputElem =
    document.getElementById(
        `qty-${itemId}`
    );


if (inputElem) {

    inputElem.value =
        newQty;

}


calculateTotal();
```

}

/* ========================================
合計計算
======================================== */

function calculateTotal() {

```
let total = 0;


menuItems.forEach(item => {

    const qty =
        orderState[item.id] || 0;


    total +=
        item.price * qty;

});


/*
 * 50円券の必要枚数
 */

const ticketCount =
    Math.ceil(
        total /
        TICKET_UNIT_PRICE
    );


/*
 * 合計金額表示
 */

const totalElem =
    document.getElementById(
        "total-amount"
    );


if (totalElem) {

    totalElem.textContent =
        total.toLocaleString();

}


/*
 * 金券枚数表示
 */

const ticketElem =
    document.getElementById(
        "ticket-count"
    );


if (ticketElem) {

    ticketElem.textContent =
        ticketCount.toLocaleString();

}


/*
 * アイス制限チェック
 */

checkIceQuantityConstraint();


return total;
```

}

/* ========================================
アイス数量制限
======================================== */

function checkIceQuantityConstraint() {

```
const crepeQty =
    orderState["item_b"] || 0;


const iceQty =
    orderState["item_d"] || 0;


const warningElem =
    document.getElementById(
        "warning-item_d"
    );


if (!warningElem) {
    return;
}


if (iceQty > crepeQty) {

    warningElem.textContent =
        `⚠️ アイストッピングはクレープの個数(${crepeQty}個)以下にしてください。`;

    warningElem.style.display =
        "block";

} else {

    warningElem.textContent =
        "";

    warningElem.style.display =
        "none";

}
```

}

/* ========================================
注文リセット
======================================== */

function resetOrder() {

```
menuItems.forEach(item => {

    orderState[item.id] =
        0;


    const inputElem =
        document.getElementById(
            `qty-${item.id}`
        );


    if (inputElem) {

        inputElem.value =
            0;

    }

});


calculateTotal();


setStatus(
    "",
    ""
);
```

}

/* ========================================
ステータス表示
======================================== */

function setStatus(
message,
type
) {

```
const statusElem =
    document.getElementById(
        "status-message"
    );


if (!statusElem) {
    return;
}


statusElem.innerHTML =
    message;


if (type === "success") {

    statusElem.style.color =
        "#27ae60";

} else if (type === "error") {

    statusElem.style.color =
        "#e74c3c";

} else {

    statusElem.style.color =
        "#333";

}
```

}

/* ========================================
送信エラー
======================================== */

function notifySubmitError() {

```
playSound("error");


setStatus(
    SUBMIT_ERROR_MESSAGE,
    "error"
);


showPopup(
    SUBMIT_ERROR_MESSAGE
);
```

}

/* ========================================
注文送信
======================================== */

async function submitOrder() {

```
/*
 * 合計金額
 */

const totalAmount =
    calculateTotal();


/*
 * 商品未選択
 */

if (totalAmount === 0) {

    playSound("empty");


    showPopup(
        "商品を1つ以上選択してください。"
    );


    return;

}


/*
 * クレープとアイスの数量チェック
 */

const crepeQty =
    orderState["item_b"] || 0;


const iceQty =
    orderState["item_d"] || 0;


if (iceQty > crepeQty) {

    playSound("iceOver");


    showPopup(
        `アイストッピング(${iceQty}個)がバナナチョコクレープ(${crepeQty}個)を超えています。\n` +
        "アイストッピングはクレープの数量以下にしてください。"
    );


    return;

}


/*
 * GAS URLチェック
 */

if (
    GAS_WEB_APP_URL ===
        "YOUR_GAS_WEB_APP_URL_HERE" ||
    !GAS_WEB_APP_URL
) {

    playSound("error");


    showPopup(
        "script.js に Google Apps Script の URLを設定してください。"
    );


    return;

}


/*
 * 送信ボタン
 */

const submitBtn =
    document.getElementById(
        "submit-btn"
    );


if (!submitBtn) {
    return;
}


submitBtn.disabled =
    true;


setStatus(
    "送信中...",
    ""
);


/*
 * GASへ送信するデータ
 */

const payload = {

    totalAmount:
        totalAmount,

    items:
        menuItems.map(
            item => ({

                id:
                    item.id,

                name:
                    item.name,

                quantity:
                    orderState[
                        item.id
                    ] || 0

            })
        )

};


try {

    const response =
        await fetch(
            GAS_WEB_APP_URL,
            {
                method: "POST",

                headers: {
                    "Content-Type":
                        "text/plain;charset=utf-8"
                },

                body:
                    JSON.stringify(
                        payload
                    )
            }
        );


    /*
     * HTTPエラー
     */

    if (!response.ok) {

        throw new Error(
            `HTTP ${response.status}`
        );

    }


    /*
     * GASからのJSON
     */

    const result =
        await response.json();


    /*
     * 成功
     */

    if (
        result.status ===
        "success"
    ) {

        playSound(
            "success"
        );


        setStatus(
            "送信が完了しました！",
            "success"
        );


        setTimeout(
            () => {

                resetOrder();

            },
            1000
        );


    } else {

        throw new Error(
            result.message ||
            "送信エラーが発生しました。"
        );

    }


} catch (error) {

    console.error(
        "Error:",
        error
    );


    notifySubmitError();


} finally {

    /*
     * 送信ボタンを再度有効化
     */

    submitBtn.disabled =
        false;

}
```

}
