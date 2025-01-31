export interface Transaction {
  from: string;
  to: string;
  amount: number;
  timestamp: number;
  type: 'transfer' | 'deposit' | 'withdraw' | 'initialize';
}

export interface CardData {
  id: string;
  balance: number;
  transactions: Transaction[];
  lastUpdated: number;
}

export class StorageService {
  private readonly STORAGE_KEY = 'monopoly_bank_data';
  private readonly BANK_ID = 'BANK';
  private data: Map<string, CardData>;

  constructor() {
    this.data = this.loadData();
  }

  private loadData(): Map<string, CardData> {
    try {
      const savedData = localStorage.getItem(this.STORAGE_KEY);
      return new Map(savedData ? Object.entries(JSON.parse(savedData)) : []);
    } catch (error) {
      console.error('加载数据失败:', error);
      return new Map();
    }
  }

  private saveData(): void {
    try {
      const dataObject = Object.fromEntries(this.data);
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(dataObject));
    } catch (error) {
      console.error('保存数据失败:', error);
      throw new Error('数据保存失败');
    }
  }

  getCard(cardId: string): CardData | undefined {
    return this.data.get(cardId);
  }

  saveCard(card: CardData): void {
    this.data.set(card.id, {
      ...card,
      lastUpdated: Date.now()
    });
    this.saveData();
  }

  getAllCards(): CardData[] {
    return Array.from(this.data.values());
  }

  initializeCard(cardId: string, initialBalance: number): void {
    const transaction: Transaction = {
      from: this.BANK_ID,
      to: cardId,
      amount: initialBalance,
      timestamp: Date.now(),
      type: 'initialize'
    };

    const newCard: CardData = {
      id: cardId,
      balance: initialBalance,
      transactions: [transaction],
      lastUpdated: Date.now()
    };

    console.log(`初始化卡片 ${cardId}，金额: ${initialBalance}`);
    this.saveCard(newCard);
  }

  deposit(cardId: string, amount: number): void {
    const card = this.data.get(cardId);
    if (!card) {
      throw new Error('卡片未初始化');
    }

    const transaction: Transaction = {
      from: this.BANK_ID,
      to: cardId,
      amount,
      timestamp: Date.now(),
      type: 'deposit'
    };

    this.saveCard({
      ...card,
      balance: card.balance + amount,
      transactions: [...card.transactions, transaction]
    });
  }

  withdraw(cardId: string, amount: number): void {
    const card = this.data.get(cardId);
    if (!card) {
      throw new Error('卡片未初始化');
    }

    if (card.balance < amount) {
      throw new Error('余额不足');
    }

    const transaction: Transaction = {
      from: cardId,
      to: this.BANK_ID,
      amount,
      timestamp: Date.now(),
      type: 'withdraw'
    };

    this.saveCard({
      ...card,
      balance: card.balance - amount,
      transactions: [...card.transactions, transaction]
    });
  }

  transfer(fromCardId: string, toCardId: string, amount: number): void {
    const fromCard = this.data.get(fromCardId);
    const toCard = this.data.get(toCardId);

    if (!fromCard || !toCard) {
      throw new Error('卡片未初始化');
    }

    if (fromCard.balance < amount) {
      throw new Error('余额不足');
    }

    const transaction: Transaction = {
      from: fromCardId,
      to: toCardId,
      amount,
      timestamp: Date.now(),
      type: 'transfer'
    };

    // 更新付款卡
    this.saveCard({
      ...fromCard,
      balance: fromCard.balance - amount,
      transactions: [...fromCard.transactions, transaction]
    });

    // 更新收款卡
    this.saveCard({
      ...toCard,
      balance: toCard.balance + amount,
      transactions: [...toCard.transactions, transaction]
    });
  }

  // 重置所有数据
  resetGame(): void {
    this.data.clear();
    this.saveData();
    console.log('游戏已重置，所有数据已清除');
  }

  // 获取所有卡片数量
  getCardCount(): number {
    return this.data.size;
  }
} 