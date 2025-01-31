<template>
    <div class="calculator">
        <div class="display">
            <div class="balance">￥{{ displayValue }}</div>
            <div class="status" :class="{ active: isNFCReady }">
                NFC状态: {{ isNFCReady ? '已就绪' : '未就绪' }}
            </div>
            <div class="card-count">
                当前卡片数量: {{ cardCount }}
            </div>
        </div>

        <div class="keypad">
            <button 
                v-for="n in 9" 
                :key="n" 
                @click="appendNumber(n)"
                :disabled="isOperating"
                class="number-btn"
            >{{ n }}</button>
            <button 
                @click="appendNumber(0)" 
                :disabled="isOperating"
                class="number-btn"
            >0</button>
            <button 
                @click="clear" 
                :disabled="isOperating"
                class="function-btn"
            >清除</button>
            <button 
                @click="deleteNumber" 
                :disabled="isOperating"
                class="function-btn"
            >←</button>
        </div>

        <div class="actions">
            <button 
                @click="initializeCard" 
                :disabled="!isNFCReady || isOperating || !hasValidAmount"
                class="action-btn"
            >初始化卡片</button>
            <button 
                @click="readBalance" 
                :disabled="!isNFCReady || isOperating"
                class="action-btn"
            >读取余额</button>
            <button 
                @click="startTransfer" 
                :disabled="!isNFCReady || isOperating || !hasValidAmount"
                class="action-btn"
            >玩家转账</button>
            <button 
                @click="bankDeposit" 
                :disabled="!isNFCReady || isOperating || !hasValidAmount"
                class="action-btn bank-btn"
            >银行存入</button>
            <button 
                @click="bankWithdraw" 
                :disabled="!isNFCReady || isOperating || !hasValidAmount"
                class="action-btn bank-btn"
            >银行取出</button>
            <button 
                @click="confirmResetGame" 
                :disabled="isOperating"
                class="action-btn reset-btn"
            >重置游戏</button>
        </div>

        <div v-if="currentOperation" class="operation-status">
            {{ currentOperation }}
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { NFCService } from '../services/NFCService';
import { StorageService } from '../services/StorageService';

const nfcService = new NFCService();
const storageService = new StorageService();

const displayValue = ref('0');
const isNFCReady = ref(false);
const currentOperation = ref('');
const cardCount = ref(0);
const isOperating = ref(false);
const isDisplayingBalance = ref(false);

// 计算属性：检查金额是否有效
const hasValidAmount = computed(() => {
    const amount = parseInt(displayValue.value);
    return amount > 0 && amount <= 999999999; // 设置合理的金额上限
});

// 开始操作
const startOperation = (message: string) => {
    isOperating.value = true;
    currentOperation.value = message;
};

// 结束操作
const endOperation = (message: string = '', clearAmount: boolean = true) => {
    currentOperation.value = message;
    if (clearAmount) {
        clear();
    }
    updateCardCount();
    
    // 延迟重置操作状态和消息
    setTimeout(() => {
        isOperating.value = false;
        currentOperation.value = '';
    }, 2000);
};

// 处理操作错误
const handleOperationError = (error: any) => {
    currentOperation.value = error.message;
    setTimeout(() => {
        isOperating.value = false;
        currentOperation.value = '';
    }, 2000);
};

// 更新卡片数量显示
const updateCardCount = () => {
    cardCount.value = storageService.getCardCount();
};

// 初始化NFC
onMounted(async () => {
    try {
        await nfcService.startScanning();
        isNFCReady.value = true;
        updateCardCount();
    } catch (error: any) {
        alert(error.message);
    }
});

// 数字输入处理
const appendNumber = (num: number) => {
    if (isDisplayingBalance.value) {
        displayValue.value = num.toString();
        isDisplayingBalance.value = false;
        return;
    }

    if (displayValue.value === '0') {
        displayValue.value = num.toString();
    } else if (displayValue.value.length < 9) {
        displayValue.value += num.toString();
    }
};

const deleteNumber = () => {
    if (isDisplayingBalance.value) {
        displayValue.value = '0';
        isDisplayingBalance.value = false;
        return;
    }

    if (displayValue.value.length > 1) {
        displayValue.value = displayValue.value.slice(0, -1);
    } else {
        displayValue.value = '0';
    }
};

const clear = () => {
    displayValue.value = '0';
    isDisplayingBalance.value = false;
};

// 确认重置游戏
const confirmResetGame = () => {
    if (confirm('确定要重置游戏吗？所有卡片数据将被清除！')) {
        try {
            startOperation('正在重置游戏...');
            storageService.resetGame();
            endOperation('游戏已重置！');
        } catch (error: any) {
            handleOperationError(error);
        }
    }
};

// NFC操作
const initializeCard = async () => {
    if (!hasValidAmount.value) {
        currentOperation.value = '请输入有效金额';
        return;
    }

    try {
        startOperation('请将卡片贴近设备...');
        const cardId = await nfcService.readCardId();
        const initialBalance = parseInt(displayValue.value);
        
        storageService.initializeCard(cardId, initialBalance);
        endOperation('卡片初始化成功！');
    } catch (error: any) {
        handleOperationError(error);
    }
};

const readBalance = async () => {
    try {
        startOperation('请将卡片贴近设备...');
        const cardId = await nfcService.readCardId();
        const cardData = storageService.getCard(cardId);
        
        if (!cardData) {
            throw new Error('卡片未初始化');
        }
        
        displayValue.value = cardData.balance.toString();
        isDisplayingBalance.value = true;
        endOperation('读取成功！', false);
    } catch (error: any) {
        handleOperationError(error);
    }
};

const startTransfer = async () => {
    if (!hasValidAmount.value) {
        currentOperation.value = '请输入有效金额';
        return;
    }

    try {
        const amount = parseInt(displayValue.value);
        startOperation('请刷付款卡...');
        const fromCardId = await nfcService.readCardId();
        
        startOperation('请刷收款卡...');
        const toCardId = await nfcService.readCardId();
        
        if (fromCardId === toCardId) {
            throw new Error('不能使用同一张卡片');
        }

        storageService.transfer(fromCardId, toCardId, amount);
        endOperation('转账成功！');
    } catch (error: any) {
        handleOperationError(error);
    }
};

// 添加银行存款功能
const bankDeposit = async () => {
    if (!hasValidAmount.value) {
        currentOperation.value = '请输入有效金额';
        return;
    }

    try {
        const amount = parseInt(displayValue.value);
        startOperation('请刷要存入的卡片...');
        const cardId = await nfcService.readCardId();
        
        storageService.deposit(cardId, amount);
        endOperation('存入成功！');
    } catch (error: any) {
        handleOperationError(error);
    }
};

// 添加银行取款功能
const bankWithdraw = async () => {
    if (!hasValidAmount.value) {
        currentOperation.value = '请输入有效金额';
        return;
    }

    try {
        const amount = parseInt(displayValue.value);
        startOperation('请刷要取出的卡片...');
        const cardId = await nfcService.readCardId();
        
        storageService.withdraw(cardId, amount);
        endOperation('取出成功！');
    } catch (error: any) {
        handleOperationError(error);
    }
};
</script>

<style scoped>
.calculator {
    max-width: 320px;
    margin: 0 auto;
    padding: 20px;
    border-radius: 12px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    background: #fff;
}

.display {
    background: #f8f9fa;
    padding: 20px;
    border-radius: 8px;
    margin-bottom: 20px;
}

.balance {
    font-size: 32px;
    font-weight: bold;
    text-align: right;
    margin-bottom: 10px;
}

.status {
    font-size: 14px;
    color: #dc3545;
    text-align: right;
}

.status.active {
    color: #28a745;
}

.card-count {
    font-size: 14px;
    color: #666;
    text-align: right;
    margin-top: 5px;
}

.keypad {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 10px;
    margin-bottom: 20px;
}

.actions {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px;
}

.actions button:first-child,
.actions button:last-child {
    grid-column: 1 / -1;
}

button {
    padding: 15px;
    border: none;
    border-radius: 8px;
    font-size: 18px;
    cursor: pointer;
    transition: all 0.2s;
}

.number-btn {
    background: #e9ecef;
    color: #212529;
}

.function-btn {
    background: #f8f9fa;
    color: #495057;
}

.action-btn {
    background: #007bff;
    color: white;
}

.action-btn:disabled {
    background: #ccc;
    cursor: not-allowed;
}

button:hover:not(:disabled) {
    opacity: 0.9;
}

.operation-status {
    margin-top: 20px;
    padding: 10px;
    text-align: center;
    background: #f8f9fa;
    border-radius: 8px;
    font-size: 14px;
    color: #495057;
    min-height: 20px;
}

.bank-btn {
    background: #28a745;
}

.bank-btn:disabled {
    background: #ccc;
}

.reset-btn {
    background: #dc3545;
    color: white;
}

.reset-btn:hover {
    background: #c82333;
}

/* 添加禁用状态样式 */
button:disabled {
    opacity: 0.6;
    cursor: not-allowed;
}
</style>