// 通过Sui事件查找Sui对象ID与Walrus blob ID的关联
const { SuiClient } = require("@mysten/sui/client");

async function findBlobIdByObjectId() {
  const client = new SuiClient({ url: "https://fullnode.testnet.sui.io:443" });
  
  // 你提到的Sui对象ID
  const objectId = "0xb775c709b3ac6fa52955b1ac1ff34696c0a5a07a909e1c18c87de94a8255fa77";
  
  console.log("=== 通过Sui事件查找关联 ===");
  console.log("目标Sui对象ID:", objectId);
  
  try {
    // 方法1: 查询BlobRegistered事件
    console.log("\n1. 查询BlobRegistered事件...");
    
    // 获取Walrus合约地址
    const walrusPackageAddress = "0xd84704c17fc870b8764832c535aa6b11f21a95cd6f5bb38a9b07d2cf42220c66";
    const blobRegisteredEventType = `${walrusPackageAddress}::walrus::BlobRegistered`;
    
    console.log("事件类型:", blobRegisteredEventType);
    
    // 查询事件 - 这个方法可能需要分页查询所有事件
    const events = await client.queryEvents({
      query: {
        MoveEventType: blobRegisteredEventType
      },
      limit: 100 // 限制结果数量
    });
    
    console.log(`找到 ${events.data.length} 个BlobRegistered事件`);
    
    // 遍历事件查找匹配的object_id
    let foundMatch = false;
    for (const event of events.data) {
      const eventData = event.parsedJson;
      if (eventData && eventData.object_id === objectId) {
        console.log("\n✅ 找到匹配的事件!");
        console.log("事件数据:", JSON.stringify(eventData, null, 2));
        console.log("对应的blob_id:", eventData.blob_id);
        
        // 转换blob_id为Base64格式
        if (eventData.blob_id) {
          function convertToWalrusBlobId(blobId) {
            try {
              const hex = BigInt(blobId).toString(16);
              const paddedHex = hex.length % 2 === 0 ? hex : '0' + hex;
              const byteArray = new Uint8Array(paddedHex.match(/.{1,2}/g).map(byte => parseInt(byte, 16)));
              const base64 = btoa(String.fromCharCode.apply(null, Array.from(byteArray)));
              return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
            } catch (error) {
              return "转换失败: " + error.message;
            }
          }
          
          const convertedBlobId = convertToWalrusBlobId(eventData.blob_id);
          console.log("转换后的Base64 blob ID:", convertedBlobId);
          console.log("你提供的Base64 blob ID:", "fSGhHKadhVlMg4uLOE4ZmxUOSbnwAbqaAo1B1L_JuCg");
          console.log("是否匹配:", convertedBlobId === "fSGhHKadhVlMg4uLOE4ZmxUOSbnwAbqaAo1B1L_JuCg");
        }
        
        foundMatch = true;
        break;
      }
    }
    
    if (!foundMatch) {
      console.log("\n❌ 在当前事件中没有找到匹配的object_id");
      console.log("可能需要:");
      console.log("1. 查询更多历史事件（分页）");
      console.log("2. 检查其他事件类型");
      console.log("3. 使用不同的查询条件");
    }
    
    // 方法2: 查询对象的交易历史
    console.log("\n2. 查询对象的交易历史...");
    const transactions = await client.queryTransactionBlocks({
      filter: {
        ChangedObject: objectId
      },
      options: {
        showEvents: true,
        showInput: true
      },
      limit: 10
    });
    
    console.log(`找到 ${transactions.data.length} 个相关交易`);
    
    // 检查交易中的事件
    for (const tx of transactions.data) {
      if (tx.events && tx.events.length > 0) {
        console.log(`\n交易 ${tx.digest} 中的事件:`);
        for (const event of tx.events) {
          if (event.type && event.type.includes('walrus')) {
            console.log("Walrus事件类型:", event.type);
            console.log("事件数据:", JSON.stringify(event.parsedJson, null, 2));
          }
        }
      }
    }
    
  } catch (error) {
    console.error("查询失败:", error);
  }
}

findBlobIdByObjectId();