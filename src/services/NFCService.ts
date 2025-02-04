declare class NDEFReader {
  scan(): Promise<void>;
  addEventListener(type: string, callback: Function, options?: object): void;
}


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
  private permissionPromise: Promise<void>;

  constructor() {
    if (!('NDEFReader' in window)) {
      throw new Error('此设备不支持NFC功能');
    }
    
    this.reader = new NDEFReader();
    this.permissionPromise = this.initializePermission();
  }

  private async initializePermission(): Promise<void> {
    try {
      await this.reader.scan();
      console.log('NFC 权限已获取');
    } catch (error) {
      console.error('无法获取 NFC 权限:', error);
      throw error;
    }
  }

  async waitForPermission(): Promise<void> {
    return this.permissionPromise;
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

export const nfcService = new NFCService();
