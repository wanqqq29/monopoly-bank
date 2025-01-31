export class NFCService {
  private hasPermission: boolean = false;

  async requestPermission(): Promise<boolean> {
    try {
      if (!('NDEFReader' in window)) {
        throw new Error('此设备不支持 NFC 功能');
      }

      // 创建 NDEFReader 实例并请求权限
      const reader = new NDEFReader();
      await reader.scan();
      
      this.hasPermission = true;
      console.log('NFC 权限已获取');
      return true;
    } catch (error) {
      if (error instanceof Error) {
        if (error.name === 'NotAllowedError') {
          console.error('用户拒绝了 NFC 权限');
        } else if (error.name === 'NotSupportedError') {
          console.error('设备不支持 NFC');
        } else {
          console.error('请求 NFC 权限时出错:', error);
        }
      }
      this.hasPermission = false;
      throw error;
    }
  }

  private async ensurePermission(): Promise<void> {
    if (!this.hasPermission) {
      await this.requestPermission();
    }
  }

  async readCard(): Promise<NFCCard | null> {
    await this.ensurePermission();
    try {
      const reader = new NDEFReader();
      
      console.log('等待读取 NFC 卡片...');
      await reader.scan();

      return new Promise((resolve, reject) => {
        reader.onreading = async (event) => {
          try {
            const { serialNumber } = event;
            const records = await reader.read();
            
            // 尝试读取现有数据
            let cardData: NFCCard | null = null;
            for (const record of records.records) {
              if (record.recordType === "text") {
                const decoder = new TextDecoder();
                const text = decoder.decode(record.data);
                try {
                  cardData = JSON.parse(text);
                  break;
                } catch (e) {
                  console.error('解析卡数据失败:', e);
                }
              }
            }

            if (!cardData) {
              // 如果卡片为空，返回 null
              resolve(null);
              return;
            }

            // 验证数据结构
            if (!this.validateCardData(cardData)) {
              throw new Error('无效的卡片数据格式');
            }

            resolve(cardData);
          } catch (error) {
            reject(error);
          }
        };

        reader.onerror = (error) => {
          reject(error);
        };

        // 30秒超时
        setTimeout(() => {
          reject(new Error('读取超时'));
        }, 30000);
      });
    } catch (error) {
      console.error('读取 NFC 卡片失败:', error);
      throw error;
    }
  }

  async writeCard(card: NFCCard): Promise<boolean> {
    await this.ensurePermission();
    try {
      const writer = new NDEFWriter();
      
      console.log('准备写入数据到 NFC 卡片...');
      
      // 将卡片数据转换为 NDEF 消息
      const encoder = new TextEncoder();
      const cardData = JSON.stringify(card);
      const data = encoder.encode(cardData);

      await writer.write({
        records: [{
          recordType: "text",
          data: data,
          languageCode: "zh-CN",
        }]
      });

      console.log('数据写入成功');
      return true;
    } catch (error) {
      console.error('写入 NFC 卡片失败:', error);
      throw error;
    }
  }

  private validateCardData(data: any): data is NFCCard {
    return (
      data &&
      typeof data.id === 'string' &&
      typeof data.balance === 'number' &&
      Array.isArray(data.transactions) &&
      data.transactions.every((tx: any) =>
        typeof tx.from === 'string' &&
        typeof tx.to === 'string' &&
        typeof tx.amount === 'number' &&
        typeof tx.timestamp === 'number'
      )
    );
  }

  async formatCard(initialBalance: number = 0): Promise<NFCCard> {
    const newCard: NFCCard = {
      id: crypto.randomUUID(),
      balance: initialBalance,
      transactions: [],
    };

    await this.writeCard(newCard);
    return newCard;
  }
} 