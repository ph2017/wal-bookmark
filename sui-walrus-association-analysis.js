// 理解Sui对象与Walrus blob ID的关联
// 根据Walrus文档，blob ID是内容的哈希值

// 实际查询到的数据
const suiObjectId = "0xb775c709b3ac6fa52955b1ac1ff34696c0a5a07a909e1c18c87de94a8255fa77";
const suiBlobIdField = "18419006225968568458072690480936955669359608845131785421943259702167162921341";
const actualWalrusBlobId = "fSGhHKadhVlMg4uLOE4ZmxUOSbnwAbqaAo1B1L_JuCg";

console.log("=== Sui对象与Walrus blob ID关联分析 ===");
console.log("1. Sui对象ID:", suiObjectId);
console.log("2. Sui对象中的blob_id字段:", suiBlobIdField);
console.log("3. 实际Walrus scan中的blob ID:", actualWalrusBlobId);

// 根据Walrus文档的关键发现：
console.log("\n=== 关键发现 ===");
console.log("根据Walrus文档:");
console.log("- blob ID是内容的哈希值（32字节）");
console.log("- 每个blob在Sui上有一个对应的Blob对象");
console.log("- blob ID与内容本身相关，而不是Sui对象ID");

// 可能的关联方式
console.log("\n=== 可能的关联机制 ===");

// 方式1: 通过Sui事件系统
console.log("1. 通过Sui事件获取blob ID");
console.log("   - 当blob注册时，会发出BlobRegistered事件");
console.log("   - 事件包含blob_id和object_id的映射");

// 方式2: 通过链下服务
console.log("2. 通过链下索引服务");
console.log("   - Walrus可能有索引服务维护object_id到blob_id的映射");
console.log("   - 或者通过Walrus API直接查询");

// 方式3: 通过内容重新计算
console.log("3. 通过内容重新计算哈希");
console.log("   - 如果知道原始内容，可以重新计算blob ID");
console.log("   - blob ID = hash(内容 + 编码参数)");

// 实际的建议实现
console.log("\n=== 实际建议 ===");
console.log("要在应用中正确关联Sui对象和Walrus blob ID:");
console.log("");
console.log("1. 监听BlobRegistered事件");
console.log("   - 监听Walrus合约的BlobRegistered事件");
console.log("   - 事件包含{blob_id, object_id, size, ...}的映射");
console.log("");
console.log("2. 使用Walrus API/CLI");
console.log("   - 通过Walrus客户端API查询object_id对应的blob信息");
console.log("   - 或者使用Walrus CLI工具获取正确的blob ID");
console.log("");
console.log("3. 维护本地数据库");
console.log("   - 在上传时记录object_id到blob_id的映射");
console.log("   - 存储在本地数据库或缓存中");

// 代码实现建议
console.log("\n=== 代码实现建议 ===");
console.log("");
console.log("// 方法1: 查询Sui事件");
console.log("const events = await client.queryEvents({");
console.log("  query: {");
console.log("    MoveEventType: '0x...::walrus::BlobRegistered'");
console.log("  },");
console.log("  filter: {");
console.log("    ObjectId: suiObjectId");
console.log("  }");
console.log("});");
console.log("");
console.log("// 方法2: 使用Walrus客户端");
console.log("const walrusClient = new WalrusClient(network);");
console.log("const blobInfo = await walrusClient.getBlobInfoByObjectId(suiObjectId);");
console.log("const realBlobId = blobInfo.blobId;");