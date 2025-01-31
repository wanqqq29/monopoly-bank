export interface Transaction {
  from: string;
  to: string;
  amount: number;
  timestamp: number;
}

export interface CardData {
  balance: number;
  transactions: Transaction[];
}

export class NFCService {
  private reader: any;
  private isScanning: boolean = false;
  private operationInProgress: boolean = false;

  constructor() {
    if (!('NDEFReader' in window)) {
      throw new Error('此设备不支持NFC功能');
    }
    this.reader = new NDEFReader();
  }

  async startScanning(): Promise<void> {
    if (this.isScanning) return;
    
    try {
      await this.reader.scan();
      this.isScanning = true;
      console.log('NFC扫描已启动');
    } catch (error) {
      console.error('NFC扫描启动失败:', error);
      throw new Error('无法启动NFC扫描，请确保已授予权限');
    }
  }

  async readCardId(): Promise<string> {
    if (this.operationInProgress) {
      throw new Error('有其他操作正在进行中');
    }

    this.operationInProgress = true;
    
    try {
      return await new Promise<string>((resolve, reject) => {
        const timeoutId = setTimeout(() => {
          reject(new Error('读取超时，请确保卡片贴近设备'));
        }, 5000);

        const handleReading = ({ serialNumber }: any) => {
          clearTimeout(timeoutId);
          resolve(`card_${serialNumber}`);
        };

        this.reader.addEventListener('reading', handleReading, { once: true });
      });
    } finally {
      this.operationInProgress = false;
    }
  }
}
