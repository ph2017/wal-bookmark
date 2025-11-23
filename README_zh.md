# walrus-bookmark

一个简单的书签管理工具。用作把sui的object与walrus的blob对象关联起来，并对bolob对象做相关操作。

## 开发

启动开发服务器，请运行：

```bash
# install packages
pnpm install
# start dev
pnpm dev
```

## 生产环境构建

构建生产版本的应用程序，请运行：

```bash
pnpm build
```

## 功能路线图

- [x] 搜索Sui对象并将其添加到书签
- [ ] 添加Walrus blob对象操作，例如延迟有效期、下载和删除
- [ ] 添加Walrus blob对象过期时间订阅，可通过邮件提前通知快过期的blob对象